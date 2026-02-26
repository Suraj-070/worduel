import React, { createContext, useContext, useReducer } from "react";

const GameContext = createContext(null);

const initialState = {
  screen: "home",
  username: "",
  roomId: null,
  players: [],
  myId: null,
  currentRound: 1,
  totalRounds: 6,
  scores: {},
  shuffledLetters: [],
  wordLength: 0,
  timeLimit: 127,
  guesses: [],
  opponentGuessCount: 0,
  roundWord: null,
  sessionWinner: null,
  lastPointsEarned: 0,
  bonuses: [],
  invalidWord: false,
  hint: null,
  hintRevealed: false,
  hintPenalty: 0,
  opponentDisconnected: false,
  reconnectCountdown: null,
  // Sudden death
  isSuddenDeath: false,
  suddenDeathCountdown: null,
  suddenDeathWinner: null,
  suddenDeathWord: null,
  // Rematch
  opponentWantsRematch: false,
  rematchDeclined: false,
  rematchExpired: false,
  waitingForRematch: false,
};

function reducer(state, action) {
  switch (action.type) {

    case "SET_USERNAME":
      return { ...state, username: action.payload };

    case "SET_MY_ID":
      return { ...state, myId: action.payload };

    case "SET_SCREEN":
      return { ...state, screen: action.payload };

    case "WAITING":
      return { ...state, screen: "waiting" };

    case "MATCH_FOUND":
      return {
        ...state,
        screen: "countdown",
        roomId: action.payload.roomId,
        players: action.payload.players,
        totalRounds: action.payload.totalRounds,
        isSuddenDeath: false,
        suddenDeathCountdown: null,
        suddenDeathWinner: null,
        opponentWantsRematch: false,
        rematchDeclined: false,
        rematchExpired: false,
        waitingForRematch: false,
        scores: action.payload.players.reduce(
          (acc, p) => ({ ...acc, [p.id]: 0 }),
          {}
        ),
      };

    case "ROUND_START":
      return {
        ...state,
        screen: "game",
        currentRound: action.payload.round,
        shuffledLetters: action.payload.shuffledLetters,
        wordLength: action.payload.wordLength,
        timeLimit: action.payload.timeLimit,
        hint: action.payload.hint,
        hintRevealed: false,
        hintPenalty: 0,
        guesses: [],
        opponentGuessCount: 0,
        roundWord: null,
        lastPointsEarned: 0,
        bonuses: [],
        invalidWord: false,
        isSuddenDeath: false,
      };

    case "HINT_REVEALED":
      return {
        ...state,
        hintRevealed: true,
        hintPenalty: action.payload.penalty,
        scores: { ...state.scores, [state.myId]: action.payload.totalScore },
      };

    case "HINT_ALREADY_USED":
      return { ...state };

    case "GUESS_RESULT":
      return {
        ...state,
        guesses: [
          ...state.guesses,
          { guess: action.payload.guess, result: action.payload.result },
        ],
        scores: { ...state.scores, [state.myId]: action.payload.totalScore },
        lastPointsEarned: action.payload.pointsEarned,
        bonuses: action.payload.bonuses || [],
      };

    case "INVALID_WORD":
      return { ...state, invalidWord: true };

    case "CLEAR_INVALID":
      return { ...state, invalidWord: false };

    case "OPPONENT_GUESSED":
      return { ...state, opponentGuessCount: action.payload.guessNumber };

    case "UPDATE_SCORES":
      return { ...state, scores: action.payload.scores };

    case "ROUND_END":
      return {
        ...state,
        screen: "roundEnd",
        roundWord: action.payload.word,
        scores: action.payload.scores,
      };

    case "SESSION_END":
      return {
        ...state,
        screen: "sessionEnd",
        scores: action.payload.scores,
        sessionWinner: action.payload.winner,
      };

    // ── Sudden Death ──────────────────────────────────────────────────────
    case "SUDDEN_DEATH_COUNTDOWN":
      return {
        ...state,
        screen: "suddenDeathCountdown",
        suddenDeathCountdown: action.payload.seconds,
      };

    case "SUDDEN_DEATH_START":
      return {
        ...state,
        screen: "game",
        isSuddenDeath: true,
        shuffledLetters: action.payload.shuffledLetters,
        wordLength: action.payload.wordLength,
        hint: action.payload.hint,
        hintRevealed: false,
        guesses: [],
        opponentGuessCount: 0,
        suddenDeathCountdown: null,
        invalidWord: false,
      };

    case "SUDDEN_DEATH_END":
      return {
        ...state,
        screen: "sessionEnd",
        sessionWinner: action.payload.winner,
        suddenDeathWord: action.payload.word,
        scores: action.payload.scores,
      };

    // ── Rematch ───────────────────────────────────────────────────────────
    case "OPPONENT_WANTS_REMATCH":
      return { ...state, opponentWantsRematch: true };

    case "REMATCH_DECLINED":
      return { ...state, rematchDeclined: true, waitingForRematch: false };

    case "REMATCH_EXPIRED":
      return { ...state, rematchExpired: true, waitingForRematch: false };

    case "WAITING_FOR_REMATCH":
      return { ...state, waitingForRematch: true };

    // ── Disconnect / Rejoin ───────────────────────────────────────────────
    case "OPPONENT_DISCONNECTED_TEMP":
      return { ...state, opponentDisconnected: true, reconnectCountdown: 30 };

    case "RECONNECT_COUNTDOWN":
      return { ...state, reconnectCountdown: action.payload.seconds };

    case "OPPONENT_RECONNECTED":
      return { ...state, opponentDisconnected: false, reconnectCountdown: null };

    case "OPPONENT_FORFEITED":
      return {
        ...state,
        screen: "sessionEnd",
        sessionWinner: action.payload.winner,
        opponentDisconnected: false,
      };

    case "REJOIN_SUCCESS":
      return {
        ...state,
        screen: "game",
        roomId: action.payload.roomId,
        currentRound: action.payload.round,
        totalRounds: action.payload.totalRounds,
        players: action.payload.players,
        scores: action.payload.scores,
        shuffledLetters: action.payload.shuffledLetters,
        wordLength: action.payload.wordLength,
        timeLimit: action.payload.timeLimit,
        hint: action.payload.hint,
        guesses: action.payload.guesses,
        isSuddenDeath: action.payload.isSuddenDeath || false,
        opponentDisconnected: false,
        reconnectCountdown: null,
      };

    case "REJOIN_FAILED":
      return { ...state, screen: "home", opponentDisconnected: false };

    case "RESET":
      return { ...initialState };

    default:
      return state;
  }
}

export const GameProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => useContext(GameContext);