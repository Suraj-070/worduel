import React from "react";
import { useGame } from "../context/GameContext";
import "../styles/SessionEnd.css";

export default function SessionEnd() {
  const { state, dispatch } = useGame();
  const { scores, players, myId, sessionWinner } = state;

  const me = players.find((p) => p.id === myId);
  const opponent = players.find((p) => p.id !== myId);

  const iWon = sessionWinner?.id === myId;
  const isDraw = !sessionWinner;

  return (
    <div className="session-end">
      <div className="session-end__result">
        {isDraw ? "🤝 DRAW!" : iWon ? "🏆 YOU WIN!" : "💀 YOU LOSE"}
      </div>
      <div className="session-end__scores">
        <div className={`session-end__block ${iWon ? "session-end__block--winner" : ""}`}>
          <span className="session-end__name">{me?.username}</span>
          <span className="session-end__pts">{scores[myId] || 0}</span>
          <span className="session-end__pts-label">points</span>
        </div>
        <div className="session-end__divider">VS</div>
        <div className={`session-end__block ${!iWon && !isDraw ? "session-end__block--winner" : ""}`}>
          <span className="session-end__name">{opponent?.username}</span>
          <span className="session-end__pts">{scores[opponent?.id] || 0}</span>
          <span className="session-end__pts-label">points</span>
        </div>
      </div>
      <button className="session-end__btn" onClick={() => dispatch({ type: "RESET" })}>
        PLAY AGAIN
      </button>
    </div>
  );
}