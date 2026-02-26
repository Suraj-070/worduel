import React from "react";
import "../styles/ScoreBar.css";

export default function ScoreBar({ me, players, scores, currentRound, totalRounds, opponentGuessCount }) {
  const isMultiplayer = players && players.length > 2;

  // Sort players by score descending for leaderboard
  const sorted = players
    ? [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
    : [];

  if (isMultiplayer) {
    const topScore = scores[sorted[0]?.id] || 0;

    return (
      <div className="scorebar scorebar--multi">
        <div className="scorebar__multi-header">
          <div className="scorebar__multi-left">
            <span className="scorebar__round-label">R{currentRound}/{totalRounds}</span>
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
          </div>
        </div>
        <div className="scorebar__leaderboard">
          {sorted.map((p, i) => {
            const isMe = p.id === me?.id;
            const playerScore = scores[p.id] || 0;
            const isTiedTop = playerScore === topScore;
            // Rank: crown for all tied at top, number for rest
            const rankDisplay = isTiedTop ? "👑" : `#${i + 1}`;
            return (
              <div
                key={p.id}
                className={`scorebar__lb-row ${isMe ? "scorebar__lb-row--me" : ""}`}
              >
                <span className="scorebar__lb-rank">{rankDisplay}</span>
                <span className="scorebar__lb-name">
                  {p.username}
                  {isMe && <span className="scorebar__lb-you">YOU</span>}
                </span>
                <span className="scorebar__lb-score">{playerScore} pts</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Original 1v1 layout
  const opponent = players?.find((p) => p.id !== me?.id);
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