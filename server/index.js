const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const {
  createGameSession,
  processGuess,
  getShuffledLetters,
} = require("./gameLogic");

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: false },
  transports: ["websocket", "polling"],
});

// ─── Wordlist ────────────────────────────────────────────────────────────────
let wordList = [];
let validWords = new Set();

function loadWordList() {
  const jsonPath = path.join(__dirname, "wordlist.json");
  const txtPath = path.join(__dirname, "wordlist.txt");

  if (fs.existsSync(jsonPath)) {
    const content = fs.readFileSync(jsonPath, "utf-8");
    const parsed = JSON.parse(content);
    wordList = parsed.filter(
      (w) =>
        w.word &&
        w.word.length >= 3 &&
        w.word.length <= 6 &&
        /^[a-z]+$/.test(w.word)
    );
    validWords = new Set(wordList.map((w) => w.word.toLowerCase()));
    console.log(`✅ Loaded ${wordList.length} words from wordlist.json`);
    console.log(`✅ Valid words set: ${validWords.size} words`);
  } else if (fs.existsSync(txtPath)) {
    const content = fs.readFileSync(txtPath, "utf-8");
    wordList = content
      .split("\n")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length >= 3 && w.length <= 6 && /^[a-z]+$/.test(w))
      .map((w) => ({ word: w, hint: null }));
    validWords = new Set(wordList.map((w) => w.word));
    console.log(`✅ Loaded ${wordList.length} words from wordlist.txt`);
  } else {
    console.warn("⚠️ No wordlist found!");
    wordList = [];
    validWords = new Set();
  }
}

loadWordList();

// ─── Round Config ─────────────────────────────────────────────────────────────
const ROUND_CONFIG = {
  1: { length: 3, time: 127, maxPoints: 3 },
  2: { length: 4, time: 186, maxPoints: 4 },
  3: { length: 5, time: 304, maxPoints: 5 },
  4: { length: 5, time: 304, maxPoints: 5 },
  5: { length: 6, time: 369, maxPoints: 6 },
  6: { length: 6, time: 369, maxPoints: 6 },
};

// ─── Points Calculator ────────────────────────────────────────────────────────
function calculatePoints(room, playerId, guessNumber) {
  const round = room.currentRound;
  const config = ROUND_CONFIG[round] || { maxPoints: 3, time: 127 };
  const maxPoints = config.maxPoints;
  const timeLimit = room.session.timeLimit;
  const elapsed = (Date.now() - room.session.roundStartTime) / 1000;
  const timeLeft = timeLimit - elapsed;
  const pct = timeLeft / timeLimit;

  let basePoints = 0;
  if (pct >= 0.5)      basePoints = maxPoints;
  else if (pct >= 0.1) basePoints = Math.max(1, Math.floor(maxPoints * 0.6));
  else                 basePoints = Math.max(1, Math.floor(maxPoints * 0.3));

  let bonus = 0;
  const bonuses = [];

  if (guessNumber === 1) {
    bonus += 2;
    bonuses.push("⚡ First try! +2");
  }

  const hintUsed = room.session.hintUsed[playerId] || false;
  if (!hintUsed) {
    bonus += 1;
    bonuses.push("💡 No hint! +1");
  }

  if (!room.streaks) room.streaks = {};
  const streak = room.streaks[playerId] || 0;
  if (streak >= 2) {
    bonus += 1;
    bonuses.push(`🔥 ${streak} round streak! +1`);
  }

  const total = basePoints + bonus;
  console.log(
    `🏆 Round ${round} | Player: ${playerId.slice(0, 4)} | Base: ${basePoints} | Bonus: ${bonus} | Total: ${total}`
  );
  return { basePoints, bonus, total, bonuses };
}

// ─── Word Picker ──────────────────────────────────────────────────────────────
function getRandomWord(length) {
  const filtered = wordList.filter((w) => w.word.length === length);
  if (filtered.length === 0) {
    console.warn(`⚠️ No words found for length ${length}`);
    return wordList[Math.floor(Math.random() * wordList.length)];
  }
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// ─── Rooms ────────────────────────────────────────────────────────────────────
const rooms = {};
const waitingRoom = { players: [] };

// ─── Private Room Lobbies ─────────────────────────────────────────────────────
const privateLobbies = {};

function generateRoomCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O to avoid confusion
  const digits = "0123456789";
  const part1 = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  const part2 = Array.from({ length: 3 }, () => digits[Math.floor(Math.random() * digits.length)]).join("");
  return `${part1}-${part2}`;
}

function createPrivateLobby(hostSocket) {
  let code;
  // Make sure code is unique
  do { code = generateRoomCode(); } while (privateLobbies[code]);

  privateLobbies[code] = {
    code,
    host: hostSocket.id,
    players: [{ id: hostSocket.id, username: hostSocket.username }],
    maxPlayers: 6,
  };

  console.log(`🏠 Private lobby created: ${code} by ${hostSocket.username}`);
  return privateLobbies[code];
}

function createRoom(players, isPrivate = false) {
  const roomId = `room_${Date.now()}`;
  const session = createGameSession(players[0].id, players[1]?.id);
  const scores = {};
  const streaks = {};
  players.forEach((p) => { scores[p.id] = 0; streaks[p.id] = 0; });
  rooms[roomId] = {
    id: roomId,
    players,
    session,
    currentRound: 1,
    totalRounds: 6,
    scores,
    streaks,
    roundActive: false,
    isSuddenDeath: false,
    rematchVotes: {},
    isPrivate,
  };
  return rooms[roomId];
}

function startRound(room) {
  const config = ROUND_CONFIG[room.currentRound] || { length: 4, time: 186 };
  const entry = getRandomWord(config.length);

  if (!entry || !entry.word) {
    console.error("❌ Could not find a word!");
    return;
  }

  const word = entry.word;
  const hint = entry.hint || null;
  const shuffled = getShuffledLetters(word);

  room.session.currentWord = word;
  room.session.currentHint = hint;
  room.session.shuffledLetters = shuffled;
  room.session.roundStartTime = Date.now();
  room.session.timeLimit = config.time;
  room.session.playerGuesses = {};
  room.session.roundFinished = {};
  room.session.hintUsed = {};
  room.players.forEach((p) => {
    room.session.playerGuesses[p.id] = [];
    room.session.roundFinished[p.id] = false;
    room.session.hintUsed[p.id] = false;
  });
  room.roundActive = true;
  room.tauntUsed = {}; // reset taunts each round

  console.log(`📖 Round ${room.currentRound}: "${word}" | Time: ${config.time}s`);
  return { word, hint, shuffled, timeLimit: config.time };
}

function startSuddenDeath(room, roomId, tiedPlayers) {
  // 4 letter word, hidden timer of 120s
  const entry = getRandomWord(4);
  if (!entry || !entry.word) return;

  const word = entry.word;
  const hint = entry.hint || null;
  const shuffled = getShuffledLetters(word);

  // Store which players are in sudden death
  room.suddenDeathPlayers = tiedPlayers || room.players;

  room.isSuddenDeath = true;
  room.roundActive = true;
  room.session.currentWord = word;
  room.session.currentHint = hint;
  room.session.shuffledLetters = shuffled;
  room.session.roundStartTime = Date.now();
  room.session.timeLimit = 120;
  room.session.playerGuesses = {};
  room.session.roundFinished = {};
  room.session.hintUsed = {};

  // Only tied players can guess — others are marked as finished
  room.players.forEach((p) => {
    const isTied = room.suddenDeathPlayers.find((tp) => tp.id === p.id);
    room.session.playerGuesses[p.id] = [];
    room.session.roundFinished[p.id] = !isTied; // non-tied = already done
    room.session.hintUsed[p.id] = false;
  });

  console.log(`💀 Sudden Death: "${word}" | Tied players: ${room.suddenDeathPlayers.map(p => p.username).join(", ")}`);

  io.to(roomId).emit("sudden_death_start", {
    shuffledLetters: shuffled,
    wordLength: word.length,
    hint: hint,
    tiedPlayers: room.suddenDeathPlayers,
  });

  // Secret timer — if nobody guesses in 120s → true draw
  room.suddenDeathTimer = setTimeout(() => {
    if (room.roundActive) {
      room.roundActive = false;
      io.to(roomId).emit("sudden_death_end", {
        word,
        winner: null,
        scores: room.scores,
        players: room.players,
      });
      delete rooms[roomId];
    }
  }, 120000);
}

// ─── Socket Events ────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  socket.on("find_match", ({ username }) => {
    socket.username = username || `Player_${socket.id.slice(0, 4)}`;

    if (waitingRoom.players.length > 0) {
      const opponent = waitingRoom.players.shift();
      const room = createRoom([
        { id: opponent.id, username: opponent.username },
        { id: socket.id, username: socket.username },
      ]);

      socket.join(room.id);
      opponent.join(room.id);

      io.to(room.id).emit("match_found", {
        roomId: room.id,
        players: room.players,
        totalRounds: room.totalRounds,
      });

      setTimeout(() => {
        const { word, hint, shuffled, timeLimit } = startRound(room);
        io.to(room.id).emit("round_start", {
          round: room.currentRound,
          shuffledLetters: shuffled,
          wordLength: word.length,
          timeLimit: timeLimit,
          hint: hint,
        });
      }, 3000);
    } else {
      waitingRoom.players.push(socket);
      socket.emit("waiting_for_opponent");
    }
  });

  // ── Private Room: Create ─────────────────────────────────────────────────
  socket.on("create_private_room", ({ username }) => {
    socket.username = username || `Player_${socket.id.slice(0, 4)}`;
    const lobby = createPrivateLobby(socket);
    socket.join(lobby.code);
    socket.emit("private_room_created", {
      code: lobby.code,
      players: lobby.players,
    });
    console.log(`✅ ${socket.username} created private room ${lobby.code}`);
  });

  // ── Private Room: Join ───────────────────────────────────────────────────
  socket.on("join_private_room", ({ username, code }) => {
    const normalizedCode = code.toUpperCase().trim();
    const lobby = privateLobbies[normalizedCode];

    if (!lobby) {
      socket.emit("join_room_error", { message: "Room not found. Check the code and try again." });
      return;
    }

    if (lobby.players.length >= lobby.maxPlayers) {
      socket.emit("join_room_error", { message: "Room is full (max 6 players)." });
      return;
    }

    // Prevent duplicate join
    if (lobby.players.find((p) => p.id === socket.id)) {
      socket.emit("join_room_error", { message: "You are already in this room." });
      return;
    }

    socket.username = username || `Player_${socket.id.slice(0, 4)}`;
    lobby.players.push({ id: socket.id, username: socket.username });
    socket.join(normalizedCode);

    // Tell everyone in lobby the updated player list
    io.to(normalizedCode).emit("lobby_update", {
      code: normalizedCode,
      players: lobby.players,
      host: lobby.host,
    });

    console.log(`✅ ${socket.username} joined private room ${normalizedCode} (${lobby.players.length}/6)`);
  });

  // ── Private Room: Start Game ────────────────────────────────────────────
  socket.on("start_private_game", ({ code }) => {
    const normalizedCode = code.toUpperCase().trim();
    const lobby = privateLobbies[normalizedCode];

    if (!lobby) {
      socket.emit("join_room_error", { message: "Lobby not found." });
      return;
    }
    if (lobby.host !== socket.id) {
      socket.emit("join_room_error", { message: "Only the host can start the game." });
      return;
    }
    if (lobby.players.length < 2) {
      socket.emit("join_room_error", { message: "Need at least 2 players to start." });
      return;
    }

    const room = createRoom(lobby.players, true);

    // Move all players from lobby socket room into the game room
    lobby.players.forEach((p) => {
      const s = io.sockets.sockets.get(p.id);
      if (s) {
        s.leave(normalizedCode);
        s.join(room.id);
      }
    });

    delete privateLobbies[normalizedCode];

    io.to(room.id).emit("match_found", {
      roomId: room.id,
      players: room.players,
      totalRounds: room.totalRounds,
    });

    setTimeout(() => {
      const { word, hint, shuffled, timeLimit } = startRound(room);
      io.to(room.id).emit("round_start", {
        round: room.currentRound,
        shuffledLetters: shuffled,
        wordLength: word.length,
        timeLimit,
        hint,
      });
    }, 3000);

    console.log(`🚀 Private game started: ${normalizedCode} → ${room.id} with ${room.players.length} players`);
  });

  // ── Private Room: Leave Lobby ────────────────────────────────────────────
  socket.on("leave_private_room", ({ code }) => {
    const normalizedCode = code.toUpperCase().trim();
    const lobby = privateLobbies[normalizedCode];
    if (!lobby) return;

    lobby.players = lobby.players.filter((p) => p.id !== socket.id);
    socket.leave(normalizedCode);

    if (lobby.players.length === 0) {
      // Nobody left, clean up
      delete privateLobbies[normalizedCode];
      console.log(`🗑️ Private lobby ${normalizedCode} disbanded`);
    } else if (lobby.host === socket.id) {
      // Host left — pass host to next player
      lobby.host = lobby.players[0].id;
      io.to(normalizedCode).emit("lobby_update", {
        code: normalizedCode,
        players: lobby.players,
        host: lobby.host,
      });
      console.log(`👑 Host left ${normalizedCode} — new host: ${lobby.players[0].username}`);
    } else {
      io.to(normalizedCode).emit("lobby_update", {
        code: normalizedCode,
        players: lobby.players,
        host: lobby.host,
      });
    }
  });

  socket.on("submit_guess", ({ roomId, guess }) => {
    const room = rooms[roomId];
    if (!room || !room.roundActive) return;

    const playerId = socket.id;
    const currentWord = room.session.currentWord;
    const guesses = room.session.playerGuesses[playerId];

    // Sudden death has unlimited guesses
    if (!room.isSuddenDeath && (!guesses || guesses.length >= 4)) return;
    if (room.session.roundFinished[playerId]) return;

    if (!validWords.has(guess.toLowerCase())) {
      socket.emit("invalid_word", { guess });
      return;
    }

    const result = processGuess(guess.toLowerCase(), currentWord);
    guesses.push({ guess: guess.toLowerCase(), result });

    const isCorrect = result.every((r) => r.status === "correct");
    const isLastGuess = !room.isSuddenDeath && guesses.length >= 4;

    // ── Sudden Death win ──
    if (room.isSuddenDeath && isCorrect) {
      room.roundActive = false;
      if (room.suddenDeathTimer) clearTimeout(room.suddenDeathTimer);

      socket.emit("guess_result", {
        guess: guess.toLowerCase(),
        result,
        guessNumber: guesses.length,
        isCorrect: true,
        pointsEarned: 0,
        bonuses: [],
        totalScore: room.scores[playerId],
      });

      const winner = room.players.find((p) => p.id === playerId);
      io.to(roomId).emit("sudden_death_end", {
        word: currentWord,
        winner,
        scores: room.scores,
        players: room.players,
      });
      delete rooms[roomId];
      return;
    }

    // ── Normal round ──
    let pointsEarned = 0;
    let bonuses = [];

    if (isCorrect) {
      const { total, bonuses: earnedBonuses } = calculatePoints(room, playerId, guesses.length);
      pointsEarned = total;
      bonuses = earnedBonuses;
      room.scores[playerId] = (room.scores[playerId] || 0) + pointsEarned;
      if (!room.streaks) room.streaks = {};
      room.streaks[playerId] = (room.streaks[playerId] || 0) + 1;
    } else if (isLastGuess) {
      if (!room.streaks) room.streaks = {};
      room.streaks[playerId] = 0;
    }

    socket.emit("guess_result", {
      guess: guess.toLowerCase(),
      result,
      guessNumber: guesses.length,
      isCorrect,
      pointsEarned,
      bonuses,
      totalScore: room.scores[playerId],
    });

    socket.to(roomId).emit("opponent_guessed", {
      guessNumber: guesses.length,
      isCorrect,
      scores: room.scores,
    });

    if (isCorrect || isLastGuess) {
      room.session.roundFinished[playerId] = true;
      const bothDone = Object.values(room.session.roundFinished).every(Boolean);
      if (bothDone) endRound(room, roomId);
    }
  });

  socket.on("time_up", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.isSuddenDeath) return;
    if (!room.streaks) room.streaks = {};
    room.streaks[socket.id] = 0;
    room.session.roundFinished[socket.id] = true;
    const bothDone = Object.values(room.session.roundFinished).every(Boolean);
    if (bothDone) endRound(room, roomId);
  });

  socket.on("request_hint", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    const playerId = socket.id;

    if (room.session.hintUsed[playerId]) {
      socket.emit("hint_already_used");
      return;
    }
    room.session.hintUsed[playerId] = true;

    const elapsed = (Date.now() - room.session.roundStartTime) / 1000;
    const timeLeft = room.session.timeLimit - elapsed;
    const penalty = !room.isSuddenDeath && timeLeft > 60 ? 1 : 0;

    if (penalty > 0) {
      room.scores[playerId] = Math.max(0, (room.scores[playerId] || 0) - penalty);
    }

    socket.emit("hint_revealed", {
      hint: room.session.currentHint,
      penalty,
      totalScore: room.scores[playerId],
    });
  });

  // ── Rematch ──────────────────────────────────────────────────────────────
  socket.on("request_rematch", ({ roomId }) => {
    // Create a pending rematch room entry if needed
    if (!rooms[roomId]) {
      // Store rematch request temporarily
      if (!global.rematchRequests) global.rematchRequests = {};
      global.rematchRequests[roomId] = global.rematchRequests[roomId] || {
        players: [],
        sockets: [],
        timer: null,
      };

      const req = global.rematchRequests[roomId];

      // Avoid duplicate votes
      if (req.players.includes(socket.id)) return;
      req.players.push(socket.id);
      req.sockets.push(socket);

      // Notify the other player
      socket.to(roomId).emit("opponent_wants_rematch");

      if (req.players.length === 2) {
        // Both agreed — create new room
        clearTimeout(req.timer);
        const [s1, s2] = req.sockets;
        const newRoom = createRoom([
          { id: s1.id, username: s1.username },
          { id: s2.id, username: s2.username },
        ]);
        s1.join(newRoom.id);
        s2.join(newRoom.id);

        io.to(newRoom.id).emit("match_found", {
          roomId: newRoom.id,
          players: newRoom.players,
          totalRounds: newRoom.totalRounds,
        });

        setTimeout(() => {
          const { word, hint, shuffled, timeLimit } = startRound(newRoom);
          io.to(newRoom.id).emit("round_start", {
            round: newRoom.currentRound,
            shuffledLetters: shuffled,
            wordLength: word.length,
            timeLimit,
            hint,
          });
        }, 3000);

        delete global.rematchRequests[roomId];
      } else {
        // Start 30s timeout for rematch
        req.timer = setTimeout(() => {
          socket.emit("rematch_expired");
          delete global.rematchRequests[roomId];
        }, 30000);
      }
    }
  });

  // ── Taunt ────────────────────────────────────────────────────────────────
  socket.on("send_taunt", ({ roomId, tauntId, toId }) => {
    const room = rooms[roomId];
    if (!room || !room.roundActive || room.isSuddenDeath) return;

    // One taunt per player per round
    if (!room.tauntUsed) room.tauntUsed = {};
    if (room.tauntUsed[socket.id]) return;
    room.tauntUsed[socket.id] = true;

    const sender = room.players.find((p) => p.id === socket.id);
    if (!sender) return;

    // In 1v1 send to opponent only, in multiplayer send to specific target or everyone
    if (toId) {
      const targetSocket = io.sockets.sockets.get(toId);
      if (targetSocket) {
        targetSocket.emit("taunt_received", {
          tauntId,
          fromUsername: sender.username,
          toId,
        });
      }
      // Also notify everyone else so they see "X taunted Y"
      socket.to(roomId).emit("taunt_broadcast", {
        tauntId,
        fromUsername: sender.username,
        toId,
      });
    } else {
      // 1v1 — send to everyone in room except sender
      socket.to(roomId).emit("taunt_received", {
        tauntId,
        fromUsername: sender.username,
        toId: null,
      });
    }

    console.log(`😤 Taunt: ${sender.username} → ${tauntId}`);
  });

  socket.on("decline_rematch", ({ roomId }) => {
    socket.to(roomId).emit("rematch_declined");
    if (global.rematchRequests?.[roomId]) {
      clearTimeout(global.rematchRequests[roomId].timer);
      delete global.rematchRequests[roomId];
    }
  });

  // ── Rejoin ────────────────────────────────────────────────────────────────
  socket.on("rejoin_room", ({ roomId, username }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit("rejoin_failed", { message: "Room no longer exists!" });
      return;
    }

    const playerIndex = room.players.findIndex((p) => p.username === username);
    if (playerIndex === -1) {
      socket.emit("rejoin_failed", { message: "Player not found in room!" });
      return;
    }

    const oldId = room.players[playerIndex].id;
    room.players[playerIndex].id = socket.id;

    if (room.scores[oldId] !== undefined) {
      room.scores[socket.id] = room.scores[oldId];
      delete room.scores[oldId];
    }
    if (room.streaks?.[oldId] !== undefined) {
      room.streaks[socket.id] = room.streaks[oldId];
      delete room.streaks[oldId];
    }
    if (room.session.playerGuesses?.[oldId]) {
      room.session.playerGuesses[socket.id] = room.session.playerGuesses[oldId];
      delete room.session.playerGuesses[oldId];
    }
    if (room.session.roundFinished?.[oldId] !== undefined) {
      room.session.roundFinished[socket.id] = room.session.roundFinished[oldId];
      delete room.session.roundFinished[oldId];
    }
    if (room.session.hintUsed?.[oldId] !== undefined) {
      room.session.hintUsed[socket.id] = room.session.hintUsed[oldId];
      delete room.session.hintUsed[oldId];
    }

    if (room.disconnected) delete room.disconnected[oldId];
    if (room.gracePeriodTimer) {
      clearTimeout(room.gracePeriodTimer);
      room.gracePeriodTimer = null;
    }

    socket.join(roomId);
    socket.username = username;
    console.log(`✅ Player ${username} rejoined room ${roomId}`);

    socket.emit("rejoin_success", {
      roomId,
      round: room.currentRound,
      totalRounds: room.totalRounds,
      players: room.players,
      scores: room.scores,
      shuffledLetters: room.session.shuffledLetters,
      wordLength: room.session.currentWord?.length,
      timeLimit: room.session.timeLimit,
      hint: room.session.currentHint,
      guesses: room.session.playerGuesses[socket.id] || [],
      roundStartTime: room.session.roundStartTime,
      isSuddenDeath: room.isSuddenDeath,
    });

    socket.to(roomId).emit("opponent_reconnected", {
      message: "✅ Opponent reconnected — game continues!",
    });
  });

  socket.on("disconnect", () => {
    console.log(`❌ Disconnected: ${socket.id}`);
    waitingRoom.players = waitingRoom.players.filter((p) => p.id !== socket.id);

    // Clean up private lobbies if player was waiting in one
    for (const [code, lobby] of Object.entries(privateLobbies)) {
      const inLobby = lobby.players.find((p) => p.id === socket.id);
      if (inLobby) {
        lobby.players = lobby.players.filter((p) => p.id !== socket.id);
        if (lobby.players.length === 0) {
          delete privateLobbies[code];
          console.log(`🗑️ Private lobby ${code} disbanded on disconnect`);
        } else {
          if (lobby.host === socket.id) lobby.host = lobby.players[0].id;
          io.to(code).emit("lobby_update", {
            code,
            players: lobby.players,
            host: lobby.host,
          });
        }
        break;
      }
    }

    for (const [roomId, room] of Object.entries(rooms)) {
      const playerIndex = room.players.findIndex((p) => p.id === socket.id);
      if (playerIndex !== -1) {
        console.log(`⏳ Player ${socket.id.slice(0, 4)} disconnected — 30s grace period`);

        room.disconnected = room.disconnected || {};
        room.disconnected[socket.id] = true;

        io.to(roomId).emit("opponent_disconnected_temp", {
          message: "⚠️ Opponent disconnected — waiting 30 seconds...",
          grace: 30,
        });

        let countdown = 30;
        const countdownInterval = setInterval(() => {
          countdown--;
          io.to(roomId).emit("reconnect_countdown", { seconds: countdown });
          if (countdown <= 0) clearInterval(countdownInterval);
        }, 1000);

        room.gracePeriodTimer = setTimeout(() => {
          clearInterval(countdownInterval);
          if (room.disconnected?.[socket.id]) {
            console.log(`💀 Grace period expired — ending game`);
            const winner = room.players.find((p) => p.id !== socket.id);
            io.to(roomId).emit("opponent_forfeited", {
              winner,
              message: "🏆 Opponent failed to reconnect — You Win!",
            });
            delete rooms[roomId];
          }
        }, 30000);

        break;
      }
    }
  });
});

// ─── End Round ────────────────────────────────────────────────────────────────
function endRound(room, roomId) {
  room.roundActive = false;
  const word = room.session.currentWord;

  io.to(roomId).emit("round_end", {
    round: room.currentRound,
    word,
    scores: room.scores,
    players: room.players,
  });

  if (room.currentRound >= room.totalRounds) {
    // Find winner by highest score across all players
    let topScore = -1;
    let winner = null;
    let tied = false;
    for (const p of room.players) {
      const s = room.scores[p.id] || 0;
      if (s > topScore) { topScore = s; winner = p; tied = false; }
      else if (s === topScore) { tied = true; winner = null; }
    }
    const isDraw = tied;

    // Find all tied players at the top score
    const tiedPlayers = room.players.filter((p) => (room.scores[p.id] || 0) === topScore);

    setTimeout(() => {
      if (isDraw && tiedPlayers.length >= 2) {
        // Sudden death for ALL tied players (works for 2 or more)
        io.to(roomId).emit("sudden_death_countdown", {
          seconds: 10,
          tiedPlayers,
        });
        let cd = 10;
        const cdInterval = setInterval(() => {
          cd--;
          io.to(roomId).emit("sudden_death_countdown", { seconds: cd, tiedPlayers });
          if (cd <= 0) {
            clearInterval(cdInterval);
            startSuddenDeath(room, roomId, tiedPlayers);
          }
        }, 1000);
      } else {
        io.to(roomId).emit("session_end", {
          scores: room.scores,
          players: room.players,
          winner,
        });
        delete rooms[roomId];
      }
    }, 5000);
  } else {
    room.currentRound++;
    setTimeout(() => {
      const { word, hint, shuffled, timeLimit } = startRound(room);
      io.to(roomId).emit("round_start", {
        round: room.currentRound,
        shuffledLetters: shuffled,
        wordLength: word.length,
        timeLimit,
        hint,
      });
    }, 5000);
  }
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) =>
  res.json({ status: "ok", words: wordList.length })
);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));