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
  1: { length: 3, time: 127, maxPoints: 3 }, // 2 min 7 sec
  2: { length: 4, time: 186, maxPoints: 4 }, // 3 min 6 sec
  3: { length: 5, time: 304, maxPoints: 5 }, // 5 min 4 sec
  4: { length: 5, time: 304, maxPoints: 5 }, // 5 min 4 sec
  5: { length: 6, time: 369, maxPoints: 6 }, // 6 min 9 sec
  6: { length: 6, time: 369, maxPoints: 6 }, // 6 min 9 sec
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

  // Base points by time remaining percentage
  let basePoints = 0;
  if (pct >= 0.5)      basePoints = maxPoints;           // fast
  else if (pct >= 0.1) basePoints = Math.max(1, Math.floor(maxPoints * 0.6)); // medium
  else                 basePoints = Math.max(1, Math.floor(maxPoints * 0.3)); // slow

  // Bonus points
  let bonus = 0;
  const bonuses = [];

  // First try bonus
  if (guessNumber === 1) {
    bonus += 2;
    bonuses.push("⚡ First try! +2");
  }

  // No hint bonus
  const hintUsed = room.session.hintUsed[playerId] || false;
  if (!hintUsed) {
    bonus += 1;
    bonuses.push("💡 No hint! +1");
  }

  // Win streak bonus
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
function getRandomWord(round) {
  const config = ROUND_CONFIG[round] || { length: 4, time: 186 };
  const filtered = wordList.filter((w) => w.word.length === config.length);
  if (filtered.length === 0) {
    console.warn(`⚠️ No words found for length ${config.length}`);
    return wordList[Math.floor(Math.random() * wordList.length)];
  }
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// ─── Rooms ────────────────────────────────────────────────────────────────────
const rooms = {};
const waitingRoom = { players: [] };

function createRoom(player1, player2) {
  const roomId = `room_${Date.now()}`;
  const session = createGameSession(player1.id, player2.id);
  rooms[roomId] = {
    id: roomId,
    players: [player1, player2],
    session,
    currentRound: 1,
    totalRounds: 6,
    scores: { [player1.id]: 0, [player2.id]: 0 },
    streaks: { [player1.id]: 0, [player2.id]: 0 },
    roundActive: false,
  };
  return rooms[roomId];
}

function startRound(room) {
  const config = ROUND_CONFIG[room.currentRound] || { length: 4, time: 186 };
  const entry = getRandomWord(room.currentRound);

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
  room.session.playerGuesses = {
    [room.players[0].id]: [],
    [room.players[1].id]: [],
  };
  room.session.roundFinished = {
    [room.players[0].id]: false,
    [room.players[1].id]: false,
  };
  room.session.hintUsed = {
    [room.players[0].id]: false,
    [room.players[1].id]: false,
  };
  room.roundActive = true;

  console.log(
    `📖 Round ${room.currentRound}: "${word}" | Time: ${config.time}s | Hint: "${hint}"`
  );
  return { word, hint, shuffled, timeLimit: config.time };
}

// ─── Socket Events ────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  socket.on("find_match", ({ username }) => {
    socket.username = username || `Player_${socket.id.slice(0, 4)}`;

    if (waitingRoom.players.length > 0) {
      const opponent = waitingRoom.players.shift();
      const room = createRoom(
        { id: opponent.id, username: opponent.username },
        { id: socket.id, username: socket.username }
      );

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

  socket.on("submit_guess", ({ roomId, guess }) => {
    const room = rooms[roomId];
    if (!room || !room.roundActive) return;

    const playerId = socket.id;
    const currentWord = room.session.currentWord;
    const guesses = room.session.playerGuesses[playerId];

    if (!guesses || guesses.length >= 4) return;
    if (room.session.roundFinished[playerId]) return;

    // Validate guess
    if (!validWords.has(guess.toLowerCase())) {
      socket.emit("invalid_word", { guess });
      return;
    }

    const result = processGuess(guess.toLowerCase(), currentWord);
    guesses.push({ guess: guess.toLowerCase(), result });

    const isCorrect = result.every((r) => r.status === "correct");
    const isLastGuess = guesses.length >= 4;

    let pointsEarned = 0;
    let bonuses = [];

    if (isCorrect) {
      const { total, bonuses: earnedBonuses } = calculatePoints(
        room,
        playerId,
        guesses.length
      );
      pointsEarned = total;
      bonuses = earnedBonuses;
      room.scores[playerId] = (room.scores[playerId] || 0) + pointsEarned;

      // Update win streak
      if (!room.streaks) room.streaks = {};
      room.streaks[playerId] = (room.streaks[playerId] || 0) + 1;
    } else if (isLastGuess) {
      // Reset streak on failed round
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
    });

    if (isCorrect || isLastGuess) {
      room.session.roundFinished[playerId] = true;
      const bothDone = Object.values(room.session.roundFinished).every(Boolean);
      if (bothDone) endRound(room, roomId);
    }
  });

  socket.on("time_up", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Reset streak on time up
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
    const penalty = timeLeft > 60 ? 1 : 0;

    if (penalty > 0) {
      room.scores[playerId] = Math.max(
        0,
        (room.scores[playerId] || 0) - penalty
      );
    }

    socket.emit("hint_revealed", {
      hint: room.session.currentHint,
      penalty,
      totalScore: room.scores[playerId],
    });
  });

  socket.on("disconnect", () => {
    console.log(`❌ Disconnected: ${socket.id}`);
    waitingRoom.players = waitingRoom.players.filter((p) => p.id !== socket.id);
    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.players.find((p) => p.id === socket.id)) {
        io.to(roomId).emit("opponent_disconnected");
        delete rooms[roomId];
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
    const [p1, p2] = room.players;
    const winner =
      room.scores[p1.id] > room.scores[p2.id]
        ? p1
        : room.scores[p2.id] > room.scores[p1.id]
          ? p2
          : null;

    setTimeout(() => {
      io.to(roomId).emit("session_end", {
        scores: room.scores,
        players: room.players,
        winner,
      });
      delete rooms[roomId];
    }, 5000);
  } else {
    room.currentRound++;
    setTimeout(() => {
      const { word, hint, shuffled, timeLimit } = startRound(room);
      io.to(roomId).emit("round_start", {
        round: room.currentRound,
        shuffledLetters: shuffled,
        wordLength: word.length,
        timeLimit: timeLimit,
        hint: hint,
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