import React, { useState, useEffect, useCallback } from "react";
import { useSocket } from "../context/SocketContext";
import { useGame } from "../context/GameContext";
import GuessGrid from "../components/GuessGrid";
import LetterPool from "../components/LetterPool";
import Timer from "../components/Timer";
import ScoreBar from "../components/ScoreBar";
import "../styles/Game.css";

const MAX_GUESSES = 4;

export default function Game() {
  const socket = useSocket();
  const { state, dispatch } = useGame();
  const [currentInput, setCurrentInput] = useState([]);
  const [shake, setShake] = useState(false);
  const [roundDone, setRoundDone] = useState(false);
  const { invalidWord } = state;
  const [timeUp, setTimeUp] = useState(false);

  const { shuffledLetters, wordLength, guesses, roomId, timeLimit, currentRound, totalRounds } = state;

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

  

  const addLetter = useCallback((letter) => {
    if (currentInput.length < wordLength && !roundDone) {
      setCurrentInput((prev) => [...prev, letter]);
    }
  }, [currentInput.length, wordLength, roundDone]);

  const removeLetter = useCallback(() => {
    setCurrentInput((prev) => prev.slice(0, -1));
  }, []);

  useEffect(() => {
  if (invalidWord) {
    setShake(true);
    setTimeout(() => {
      setShake(false);
      dispatch({ type: "CLEAR_INVALID" });
    }, 2000);
  }
}, [invalidWord]);

  useEffect(() => {
    const handleKey = (e) => {
      if (roundDone) return;
      if (e.key === "Backspace") return removeLetter();
      if (e.key === "Enter") return submitGuess();
      if (/^[a-zA-Z]$/.test(e.key)) {
        const letter = e.key.toLowerCase();
        if (shuffledLetters.includes(letter) && currentInput.length < wordLength) {
          addLetter(letter);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [removeLetter, submitGuess, addLetter, shuffledLetters, currentInput, wordLength, roundDone]);

  useEffect(() => {
    const lastGuess = guesses[guesses.length - 1];
    if (!lastGuess) return;
    const isCorrect = lastGuess.result.every((r) => r.status === "correct");
    if (isCorrect || guesses.length >= MAX_GUESSES) {
      setRoundDone(true);
    }
  }, [guesses]);

  useEffect(() => {
    setRoundDone(false);
    setCurrentInput([]);
    setTimeUp(false);
  }, [currentRound]);

  const handleTimeUp = () => {
  if (!roundDone) {
    setTimeUp(true);
    setRoundDone(true);
    socket.emit("time_up", { roomId });
  }
};

  const opponent = state.players.find((p) => p.id !== state.myId);
  const me = state.players.find((p) => p.id === state.myId);

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
        <div className="game__round-badge">ROUND {currentRound}/{totalRounds}</div>
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
      {roundDone && (
  <div className="game__waiting-msg">
    {timeUp ? "⌛ TIME'S UP!" : "⏳ Waiting for opponent to finish..."}
  </div>
)}
      {state.invalidWord && (
  <div className="game__invalid-msg">❌ Not a valid word!</div>
)}
      {!roundDone && (
        <div className="game__controls">
          <LetterPool
            letters={shuffledLetters}
            onLetterClick={addLetter}
            usedLetters={currentInput}
          />
          <div className="game__actions">
            <button className="game__btn game__btn--delete" onClick={removeLetter}>
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
    </div>
  );
}