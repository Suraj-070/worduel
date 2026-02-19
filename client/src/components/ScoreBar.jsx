import React from "react";
import "../styles/ScoreBar.css";

export default function ScoreBar({ me, opponent, scores, currentRound, totalRounds, opponentGuessCount }) {
  return (
    <div className="scorebar">
      <div className="scorebar__player scorebar__player--me">
        <span className="scorebar__name">{me?.username || "You"}</span>
        <span className="scorebar__score">{scores[me?.id] || 0} pts</span>
      </div>
      <div className="scorebar__center">
        <div className="scorebar__rounds">
          {Array(totalRounds).fill(null).map((_, i) => (
            <div
              key={i}
              className={`scorebar__round-dot ${
                i < currentRound - 1 ? "done" : i === currentRound - 1 ? "active" : ""
              }`}
            />
          ))}
        </div>
        <span className="scorebar__round-label">R{currentRound}/{totalRounds}</span>
      </div>
      <div className="scorebar__player scorebar__player--opponent">
        <span className="scorebar__score">{scores[opponent?.id] || 0} pts</span>
        <span className="scorebar__name">{opponent?.username || "Opponent"}</span>
        <div className="scorebar__opponent-progress">
          <span className="scorebar__guesses">{opponentGuessCount}/4 tries</span>
        </div>
      </div>
    </div>
  );
}