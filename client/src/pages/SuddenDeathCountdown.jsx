import React from "react";
import { useGame } from "../context/GameContext";
import "../styles/SuddenDeathCountdown.css";

export default function SuddenDeathCountdown() {
  const { state } = useGame();
  const { suddenDeathCountdown, suddenDeathTiedPlayers, myId } = state;

  const isCompeting = suddenDeathTiedPlayers.some((p) => p.id === myId);

  return (
    <div className="sd-countdown">
      <div className="sd-countdown__skull">💀</div>
      <div className="sd-countdown__title">SUDDEN DEATH</div>

      {/* Show who is competing */}
      {suddenDeathTiedPlayers.length > 0 && (
        <div className="sd-countdown__players">
          {suddenDeathTiedPlayers.map((p) => (
            <span key={p.id} className={`sd-countdown__player ${p.id === myId ? "sd-countdown__player--me" : ""}`}>
              {p.id === myId ? "⚡ YOU" : p.username}
            </span>
          ))}
        </div>
      )}

      {isCompeting ? (
        <div className="sd-countdown__sub">First to guess the word wins!</div>
      ) : (
        <div className="sd-countdown__sub sd-countdown__sub--watching">
          👀 You're watching — you tied but weren't in the top group
        </div>
      )}

      <div className="sd-countdown__number">{suddenDeathCountdown}</div>
      <div className="sd-countdown__warning">
        {isCompeting ? "⚠️ No time limit — no mercy!" : "⏳ Watch the tiebreaker..."}
      </div>
    </div>
  );
}