import React from "react";
import { useGame } from "../context/GameContext";
import "../styles/RoundEnd.css";

export default function RoundEnd() {
  const { state } = useGame();
  const { roundWord, scores, players, myId, currentRound, totalRounds, lastPointsEarned } = state;

  const me = players.find((p) => p.id === myId);
  const isMultiplayer = players.length > 2;

  // Sort players by score for leaderboard
  const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

  // 1v1 opponent
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

        {isMultiplayer ? (
          // Multiplayer leaderboard
          <div className="round-end__leaderboard">
            {sorted.map((p, i) => {
              const isMe = p.id === myId;
              return (
                <div key={p.id} className={`round-end__lb-row ${isMe ? "round-end__lb-row--me" : ""}`}>
                  <span className="round-end__lb-rank">
                    {i === 0 ? "👑" : `#${i + 1}`}
                  </span>
                  <span className="round-end__lb-name">
                    {p.username}
                    {isMe && <span className="round-end__lb-you">YOU</span>}
                  </span>
                  <span className="round-end__lb-score">{scores[p.id] || 0} pts</span>
                </div>
              );
            })}
          </div>
        ) : (
          // Original 1v1 layout
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
        )}

        {currentRound < totalRounds ? (
          <p className="round-end__next">Next round starting soon...</p>
        ) : (
          <p className="round-end__next">Calculating final results...</p>
        )}
      </div>
    </div>
  );
}