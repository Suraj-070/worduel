function processGuess(guess, targetWord) {
  const result = [];
  const target = targetWord.split("");
  const guessLetters = guess.split("");
  const used = new Array(target.length).fill(false);

  // First pass: correct positions (green)
  for (let i = 0; i < guessLetters.length; i++) {
    if (guessLetters[i] === target[i]) {
      result[i] = { letter: guessLetters[i], status: "correct" };
      used[i] = true;
    } else {
      result[i] = { letter: guessLetters[i], status: "absent" };
    }
  }

  // Second pass: present but wrong position (yellow)
  for (let i = 0; i < guessLetters.length; i++) {
    if (result[i].status === "correct") continue;
    for (let j = 0; j < target.length; j++) {
      if (!used[j] && guessLetters[i] === target[j]) {
        result[i] = { letter: guessLetters[i], status: "present" };
        used[j] = true;
        break;
      }
    }
  }

  return result;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getShuffledLetters(word) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const wordLetters = word.split("");
  const wordLetterSet = new Set(wordLetters);

  const extraCount = 2 + Math.floor(Math.random() * 2);
  const extraLetters = [];
  const available = alphabet.split("").filter((l) => !wordLetterSet.has(l));

  for (let i = 0; i < extraCount; i++) {
    const idx = Math.floor(Math.random() * available.length);
    extraLetters.push(available[idx]);
    available.splice(idx, 1);
  }

  return shuffleArray([...wordLetters, ...extraLetters]);
}

function createGameSession(player1Id, player2Id) {
  return {
    currentWord: null,
    shuffledLetters: [],
    roundStartTime: null,
    playerGuesses: {
      [player1Id]: [],
      [player2Id]: [],
    },
    roundFinished: {
      [player1Id]: false,
      [player2Id]: false,
    },
  };
}

module.exports = { processGuess, getShuffledLetters, createGameSession, shuffleArray };