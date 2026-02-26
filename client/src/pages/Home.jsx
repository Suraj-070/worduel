import React, { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { useGame } from "../context/GameContext";
import "../styles/Home.css";

export default function Home() {
  const socket = useSocket();
  const { state, dispatch } = useGame();
  const [name, setName] = useState("");

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    const savedRoomId = sessionStorage.getItem("roomId");
    const savedUsername = sessionStorage.getItem("username");
    if (savedRoomId && savedUsername) {
      console.log("🔄 Attempting to rejoin room...");
      socket.connect();
      socket.emit("rejoin_room", { roomId: savedRoomId, username: savedUsername });
      sessionStorage.removeItem("roomId");
    }
  }, []);

  useEffect(() => {
    socket.on("join_room_error", ({ message }) => {
      setJoinError(message);
    });
    return () => socket.off("join_room_error");
  }, [socket]);

  const getUsername = () =>
    name.trim() || `Player_${Math.floor(Math.random() * 9999)}`;

  const handlePlay = () => {
    const username = getUsername();
    dispatch({ type: "SET_USERNAME", payload: username });
    socket.emit("find_match", { username });
  };

  const handleCreateRoom = () => {
    const username = getUsername();
    dispatch({ type: "SET_USERNAME", payload: username });
    socket.emit("create_private_room", { username });
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim()) {
      setJoinError("Please enter a room code.");
      return;
    }
    const username = getUsername();
    dispatch({ type: "SET_USERNAME", payload: username });
    socket.emit("join_private_room", { username, code: joinCode.trim() });
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
          6 rounds with 4 tries
          <br />
          Unscramble the word before your opponent strikes
          <br/>
          <h3>LETS STRIKE NOW</h3>
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

          <div className="home__private-row">
            <button className="home__btn-private" onClick={handleCreateRoom}>
              CREATE ROOM
            </button>
            <button
              className="home__btn-private home__btn-private--join"
              onClick={() => { setShowJoinModal(true); setJoinError(""); }}
            >
              JOIN ROOM
            </button>
          </div>
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
        <span className="home__footer-copy">©</span> 2026 WORDSTRIKE — THINK
        FAST. STRIKE FASTER.
      </footer>

      {showJoinModal && (
        <div className="home__modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="home__modal" onClick={(e) => e.stopPropagation()}>
            <div className="home__modal-title">ENTER ROOM CODE</div>
            <p className="home__modal-sub">Ask your friend for their 6-character code</p>
            <input
              className="home__input home__modal-input"
              type="text"
              placeholder="e.g. WRD-482"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
              maxLength={7}
              autoFocus
            />
            {joinError && <p className="home__modal-error">{joinError}</p>}
            <div className="home__modal-actions">
              <button className="home__btn" onClick={handleJoinRoom}>JOIN</button>
              <button
                className="home__btn-private"
                onClick={() => { setShowJoinModal(false); setJoinCode(""); setJoinError(""); }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}