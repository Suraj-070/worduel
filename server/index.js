const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { createGameSession, processGuess, getShuffledLetters } = require("./gameLogic");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});

// ─── Wordlist ────────────────────────────────────────────────────────────────
let wordList = [];      // words used for the game (balanced)
let validWords = [];    // words used for guess validation (larger)

function loadWordList() {
  const filePath = path.join(__dirname, "wordlist.txt");
  const validPath = path.join(__dirname, "validwords.txt");

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    wordList = content
      .split("\n")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length >= 3 && w.length <= 6 && /^[a-z]+$/.test(w));
    console.log(`✅ Loaded ${wordList.length} game words`);
  } else {
    console.warn("⚠️ wordlist.txt not found!");
  }

  if (fs.existsSync(validPath)) {
    const content = fs.readFileSync(validPath, "utf-8");
    validWords = content
      .split("\n")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length >= 3 && w.length <= 6 && /^[a-z]+$/.test(w));
    console.log(`✅ Loaded ${validWords.length} valid words for validation`);
  } else {
    // Fallback — just use the game wordlist for validation
    validWords = wordList;
    console.warn("⚠️ validwords.txt not found, using game wordlist for validation");
  }
}

loadWordList();

const ROUND_WORD_LENGTH = {
  1: 3,
  2: 4,
  3: 4,
  4: 5,
  5: 6,
  6: 6,
};

function getRandomWord(round) {
  const targetLength = ROUND_WORD_LENGTH[round] || 4;
  const filtered = wordList.filter((w) => w.length === targetLength);

  // Fallback in case no words found for that length
  if (filtered.length === 0) {
    console.warn(`⚠️ No words found for length ${targetLength}, using any word`);
    return wordList[Math.floor(Math.random() * wordList.length)];
  }

  return filtered[Math.floor(Math.random() * filtered.length)];
}

// ─── Rooms ───────────────────────────────────────────────────────────────────
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
    roundActive: false,
  };
  return rooms[roomId];
}

function startRound(room) {
  const word = getRandomWord(room.currentRound);
  if (!word) {
    console.error("❌ Could not find a word! Check your wordlist.txt");
    return;
  }
  const shuffled = getShuffledLetters(word);
  room.session.currentWord = word;
  room.session.shuffledLetters = shuffled;
  room.session.roundStartTime = Date.now();
  room.session.playerGuesses = {
    [room.players[0].id]: [],
    [room.players[1].id]: [],
  };
  room.session.roundFinished = {
    [room.players[0].id]: false,
    [room.players[1].id]: false,
  };
  room.roundActive = true;
  return { word, shuffled };
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
        const { word, shuffled } = startRound(room);
        io.to(room.id).emit("round_start", {
          round: room.currentRound,
          shuffledLetters: shuffled,
          wordLength: word.length,
          timeLimit: 369,
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

    // Validate guess is a real word
if (!wordList.includes(guess.toLowerCase())) {
  socket.emit("invalid_word", { guess });
  return;
}

const result = processGuess(guess.toLowerCase(), currentWord);
guesses.push({ guess: guess.toLowerCase(), result });

    const isCorrect = result.every((r) => r.status === "correct");
    const isLastGuess = guesses.length >= 4;

    let pointsEarned = 0;
    if (isCorrect) {
      const elapsed = (Date.now() - room.session.roundStartTime) / 1000;
      if (elapsed <= 180)      pointsEarned = 3;
      else if (elapsed <= 240) pointsEarned = 2;
      else if (elapsed <= 300) pointsEarned = 2;
      else if (elapsed <= 369) pointsEarned = 1;
      room.scores[playerId] += pointsEarned;
    }

    socket.emit("guess_result", {
      guess: guess.toLowerCase(),
      result,
      guessNumber: guesses.length,
      isCorrect,
      pointsEarned,
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
    room.session.roundFinished[socket.id] = true;
    const bothDone = Object.values(room.session.roundFinished).every(Boolean);
    if (bothDone) endRound(room, roomId);
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
      room.scores[p1.id] > room.scores[p2.id] ? p1
      : room.scores[p2.id] > room.scores[p1.id] ? p2
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
      const { word, shuffled } = startRound(room);
      io.to(roomId).emit("round_start", {
        round: room.currentRound,
        shuffledLetters: shuffled,
        wordLength: word.length,
        timeLimit: 369,
      });
    }, 5000);
  }
}

app.get("/health", (req, res) => res.json({ status: "ok", words: wordList.length }));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));