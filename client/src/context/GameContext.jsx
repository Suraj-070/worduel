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
  timeLimit: 369,
  guesses: [],
  opponentGuessCount: 0,
  roundWord: null,
  sessionWinner: null,
  lastPointsEarned: 0,
  invalidWord: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_USERNAME":   return { ...state, username: action.payload };
    case "SET_MY_ID":      return { ...state, myId: action.payload };
    case "SET_SCREEN":     return { ...state, screen: action.payload };
    case "WAITING":        return { ...state, screen: "waiting" };
    case "MATCH_FOUND":
      return {
        ...state,
        screen: "countdown",
        roomId: action.payload.roomId,
        players: action.payload.players,
        totalRounds: action.payload.totalRounds,
        scores: action.payload.players.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {}),
      };
    case "ROUND_START":
      return {
        ...state,
        screen: "game",
        currentRound: action.payload.round,
        shuffledLetters: action.payload.shuffledLetters,
        wordLength: action.payload.wordLength,
        timeLimit: action.payload.timeLimit,
        guesses: [],
        opponentGuessCount: 0,
        roundWord: null,
        lastPointsEarned: 0,
      };
    case "GUESS_RESULT":
      return {
        ...state,
        guesses: [...state.guesses, { guess: action.payload.guess, result: action.payload.result }],
        scores: { ...state.scores, [state.myId]: action.payload.totalScore },
        lastPointsEarned: action.payload.pointsEarned,
      };
      case "INVALID_WORD":
  return { ...state, invalidWord: true };
case "CLEAR_INVALID":
  return { ...state, invalidWord: false };
    case "OPPONENT_GUESSED":
      return { ...state, opponentGuessCount: action.payload.guessNumber };
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