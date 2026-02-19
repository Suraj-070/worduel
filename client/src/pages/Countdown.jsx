import React, { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";
import "../styles/Countdown.css";

export default function Countdown() {
  const { state } = useGame();
  const [count, setCount] = useState(3);
  const opponent = state.players.find((p) => p.id !== state.myId);

  useEffect(() => {
    if (count <= 0) return;
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <div className="countdown">
      <p className="countdown__vs-label">YOU VS</p>
      <h2 className="countdown__opponent">{opponent?.username || "Opponent"}</h2>
      <div className="countdown__number" key={count}>
        {count > 0 ? count : "GO!"}
      </div>
      <p className="countdown__info">Round 1 of {state.totalRounds} is starting...</p>
    </div>
  );
}