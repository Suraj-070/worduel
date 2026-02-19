import React from "react";
import { useGame } from "../context/GameContext";
import "../styles/RoundEnd.css";

export default function RoundEnd() {
  const { state } = useGame();
  const { roundWord, scores, players, myId, currentRound, totalRounds, lastPointsEarned } = state;

  const me = players.find((p) => p.id === myId);
  const opponent = players.find((p) => p.id !== myId);

  return (
    <div className="round-end">
      <div className="round-end__card">
        <p className="round-end__label">ROUND {currentRound} COMPLETE</p>
        <h2 className="round-end__word">{roundWord?.toUpperCase()}</h2>
        {lastPointsEarned > 0 ? (
          <div className="round-end__points">+{lastPointsEarned} pts earned!</div>
        ) : (
          <div className="round-end__points round-end__points--zero">No points this round</div>
        )}
        <div className="round-end__scores">
          <div className="round-end__score-block">
            <span className="round-end__player-name">{me?.username}</span>
            <span className="round-end__player-score">{scores[myId] || 0}</span>
          </div>
          <span className="round-end__vs">VS</span>
          <div className="round-end__score-block">
            <span className="round-end__player-score">{scores[opponent?.id] || 0}</span>
            <span className="round-end__player-name">{opponent?.username}</span>
          </div>
        </div>
        {currentRound < totalRounds ? (
          <p className="round-end__next">Next round starting soon...</p>
        ) : (
          <p className="round-end__next">Calculating final results...</p>
        )}
      </div>
    </div>
  );
}