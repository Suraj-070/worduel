import React, { useState } from "react";
import { useSocket } from "../context/SocketContext";
import { useGame } from "../context/GameContext";
import "../styles/Home.css";

export default function Home() {
  const socket = useSocket();
  const { state, dispatch } = useGame();
  const [name, setName] = useState("");

  const handlePlay = () => {
    const username = name.trim() || `Player_${Math.floor(Math.random() * 9999)}`;
    dispatch({ type: "SET_USERNAME", payload: username });
    socket.emit("find_match", { username });
  };

  return (
    <div className="home">
      <div className="home__noise" />
      <div className="home__content">
        <div className="home__badge">MULTIPLAYER WORD BATTLE</div>
        <h1 className="home__title">
          <span className="home__title-word">WORDS</span>
          <span className="home__title-duel">TRIKE</span>
        </h1>
        <p className="home__sub">
          6 rounds. 4 tries. 6 minutes 9 seconds.<br />
          Unscramble the word before your opponent does.
        </p>
        <div className="home__form">
          <input
            className="home__input"
            type="text"
            placeholder="Enter your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePlay()}
            maxLength={20}
          />
          <button className="home__btn" onClick={handlePlay}>
            FIND MATCH
          </button>
        </div>
        <div className="home__rules">
          <div className="home__rule">
            <span className="tile green">A</span>
            <span>Correct letter, correct spot</span>
          </div>
          <div className="home__rule">
            <span className="tile yellow">B</span>
            <span>Correct letter, wrong spot</span>
          </div>
          <div className="home__rule">
            <span className="tile dark">C</span>
            <span>Letter not in word</span>
          </div>
        </div>
      </div>
      <footer className="home__footer">
       <span className="home__footer-copy">©</span> 2026 WORDSTRIKE — THINK FAST. GUESS FASTER.
      </footer>
    </div>
  );
}