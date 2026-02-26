import React, { useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import "../styles/SuddenDeathCountdown.css";

export default function SuddenDeathCountdown() {
  const { state } = useGame();
  const { suddenDeathCountdown } = state;

  return (
    <div className="sd-countdown">
      <div className="sd-countdown__skull">💀</div>
      <div className="sd-countdown__title">SUDDEN DEATH</div>
      <div className="sd-countdown__sub">First to guess the word wins!</div>
      <div className="sd-countdown__number">{suddenDeathCountdown}</div>
      <div className="sd-countdown__warning">⚠️ No time limit — no mercy!</div>
    </div>
  );
}