import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { useGame } from "../context/GameContext";
import GuessGrid from "../components/GuessGrid";
import LetterPool from "../components/LetterPool";
import Timer from "../components/Timer";
import ScoreBar from "../components/ScoreBar";
import "../styles/Game.css";
import {
  FireStreak,
  SpeedDemon,
  FirstTryCrown,
  ComebackKing,
  LastGuessTension,
} from "../components/Animations";

const MAX_GUESSES = 4;

export default function Game() {
  const socket = useSocket();
  const { state, dispatch } = useGame();
  const [currentInput, setCurrentInput] = useState([]);
  const [shake, setShake] = useState(false);
  const [roundDone, setRoundDone] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [showHintWarning, setShowHintWarning] = useState(false);
  const [showFireStreak, setShowFireStreak] = useState(false);
  const [showSpeedDemon, setShowSpeedDemon] = useState(false);
  const [showFirstTry, setShowFirstTry] = useState(false);
  const [showComeback, setShowComeback] = useState(false);
  const [showTension, setShowTension] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);

  // Track round start time using ref — no extra interval needed
  const roundStartRef = useRef(Date.now());

  const {
    shuffledLetters,
    wordLength,
    guesses,
    roomId,
    timeLimit,
    currentRound,
    totalRounds,
    hint,
    hintRevealed,
    hintPenalty,
    invalidWord,
  } = state;

  
  const opponent = state.players.find((p) => p.id !== state.myId);
  const me = state.players.find((p) => p.id === state.myId);

  useEffect(() => {
    const handleCorrect = (e) => {
      const { guessNumber, bonuses } = e.detail;
      const elapsed = (Date.now() - roundStartRef.current) / 1000;
      const myScore = state.scores[state.myId] || 0;
      const opponentScore = state.scores[opponent?.id] || 0;

      // First try crown
      if (guessNumber === 1) {
        setShowFirstTry(true);
        setTimeout(() => setShowFirstTry(false), 2500);
        return;
      }

      // Speed demon — under 30 seconds
      if (elapsed < 30) {
        setShowSpeedDemon(true);
        setTimeout(() => setShowSpeedDemon(false), 2000);
        return;
      }

      // Comeback king — winning while behind by 5+
      if (opponentScore - myScore >= 5) {
        setShowComeback(true);
        setTimeout(() => setShowComeback(false), 2500);
        return;
      }

      // Win streak
      if (bonuses?.some((b) => b.includes("streak"))) {
        const streakBonus = bonuses.find((b) => b.includes("streak"));
        const streakNum = parseInt(streakBonus?.match(/\d+/)?.[0] || "0");
        setCurrentStreak(streakNum);
        setShowFireStreak(true);
        setTimeout(() => setShowFireStreak(false), 3000);
      }
    };

    window.addEventListener("round_correct", handleCorrect);
    return () => window.removeEventListener("round_correct", handleCorrect);
  }, [state.scores, state.myId, opponent]);

  // Last guess tension — 3rd guess and not done
  useEffect(() => {
    if (guesses.length === 3 && !roundDone) {
      setShowTension(true);
    } else {
      setShowTension(false);
    }
  }, [guesses.length, roundDone]);

  // Reset round start time when new round begins
  useEffect(() => {
    roundStartRef.current = Date.now();
    setRoundDone(false);
    setCurrentInput([]);
    setTimeUp(false);
  }, [currentRound]);

  // Handle invalid word shake
  useEffect(() => {
    if (invalidWord) {
      setShake(true);
      setTimeout(() => {
        setShake(false);
        dispatch({ type: "CLEAR_INVALID" });
      }, 2000);
    }
  }, [invalidWord, dispatch]);

  // Check if round is done after each guess
  useEffect(() => {
    const lastGuess = guesses[guesses.length - 1];
    if (!lastGuess) return;
    const isCorrect = lastGuess.result.every((r) => r.status === "correct");
    if (isCorrect || guesses.length >= MAX_GUESSES) {
      setRoundDone(true);
    }
  }, [guesses]);

  const submitGuess = useCallback(() => {
    if (currentInput.length !== wordLength) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    const guess = currentInput.join("");
    socket.emit("submit_guess", { roomId, guess });
    setCurrentInput([]);
  }, [currentInput, wordLength, socket, roomId]);

  const addLetter = useCallback(
    (letter) => {
      if (currentInput.length < wordLength && !roundDone) {
        setCurrentInput((prev) => [...prev, letter]);
      }
    },
    [currentInput.length, wordLength, roundDone],
  );

  const removeLetter = useCallback(() => {
    setCurrentInput((prev) => prev.slice(0, -1));
  }, []);

  // Keyboard support
  useEffect(() => {
    const handleKey = (e) => {
      if (roundDone) return;
      if (e.key === "Backspace") return removeLetter();
      if (e.key === "Enter") return submitGuess();
      if (/^[a-zA-Z]$/.test(e.key)) {
        const letter = e.key.toLowerCase();
        if (
          shuffledLetters.includes(letter) &&
          currentInput.length < wordLength
        ) {
          addLetter(letter);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    removeLetter,
    submitGuess,
    addLetter,
    shuffledLetters,
    currentInput,
    wordLength,
    roundDone,
  ]);

  // Hint handlers
  const handleHintClick = () => {
    const elapsed = (Date.now() - roundStartRef.current) / 1000;
    const timeRemaining = timeLimit - elapsed;
    if (timeRemaining > 60) {
      setShowHintWarning(true);
    } else {
      socket.emit("request_hint", { roomId });
    }
  };

  const confirmHint = () => {
    setShowHintWarning(false);
    socket.emit("request_hint", { roomId });
  };

  // Time up handler
  const handleTimeUp = useCallback(() => {
    if (!roundDone) {
      setTimeUp(true);
      setRoundDone(true);
      socket.emit("time_up", { roomId });
    }
  }, [roundDone, socket, roomId]);


  return (
    <div className="game">
      <ScoreBar
        me={me}
        opponent={opponent}
        scores={state.scores}
        currentRound={currentRound}
        totalRounds={totalRounds}
        opponentGuessCount={state.opponentGuessCount}
      />

      <div className="game__header">
        <div className="game__round-badge">
          ROUND {currentRound}/{totalRounds}
        </div>
        <Timer seconds={timeLimit} onTimeUp={handleTimeUp} paused={roundDone} />
      </div>

      <div className="game__board">
        <GuessGrid
          guesses={guesses}
          currentInput={currentInput}
          wordLength={wordLength}
          maxGuesses={MAX_GUESSES}
          shake={shake}
        />
      </div>

      {/* Hint Warning Popup */}
      {showHintWarning && (
        <div className="hint-overlay">
          <div className="hint-popup">
            <div className="hint-popup__icon">⚠️</div>
            <h3 className="hint-popup__title">Use Hint?</h3>
            <p className="hint-popup__msg">
              Using a hint will cost you <strong>1 point!</strong>
            </p>
            <div className="hint-popup__actions">
              <button
                className="hint-popup__btn hint-popup__btn--cancel"
                onClick={() => setShowHintWarning(false)}
              >
                Cancel
              </button>
              <button
                className="hint-popup__btn hint-popup__btn--confirm"
                onClick={confirmHint}
              >
                Yes, show hint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hint revealed */}
      {hintRevealed && hint && (
        <div className="game__hint">
          💡 {hint}
          {hintPenalty > 0 && (
            <span className="game__hint-penalty">-{hintPenalty} pt</span>
          )}
        </div>
      )}

      {/* Hint button */}
      {!roundDone && !hintRevealed && (
        <button className="game__hint-btn" onClick={handleHintClick}>
          💡 USE HINT
        </button>
      )}

      {/* Round done messages */}
      {roundDone && (
        <div className="game__waiting-msg">
          {timeUp ? "⌛ TIME'S UP!" : "⏳ Waiting for opponent to finish..."}
        </div>
      )}

      {/* Invalid word message */}
      {invalidWord && (
        <div className="game__invalid-msg">❌ Not a valid word!</div>
      )}

      {/* Controls */}
      {!roundDone && (
        <div className="game__controls">
          <LetterPool
            letters={shuffledLetters}
            onLetterClick={addLetter}
            usedLetters={currentInput}
          />
          <div className="game__actions">
            <button
              className="game__btn game__btn--delete"
              onClick={removeLetter}
            >
              ⌫ DELETE
            </button>
            <button
              className="game__btn game__btn--enter"
              onClick={submitGuess}
              disabled={currentInput.length !== wordLength}
            >
              ENTER ↵
            </button>
          </div>
        </div>
      )}
      {/* Animations */}
      <FireStreak streak={currentStreak} show={showFireStreak} />
      <SpeedDemon show={showSpeedDemon} />
      <FirstTryCrown show={showFirstTry} />
      <ComebackKing show={showComeback} />
      <LastGuessTension show={showTension} />
    </div>
  );
}
