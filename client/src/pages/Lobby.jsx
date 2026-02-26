import React, { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { useGame } from "../context/GameContext";
import "../styles/Lobby.css";

export default function Lobby() {
  const socket = useSocket();
  const { state, dispatch } = useGame();
  const { lobbyCode, lobbyPlayers, lobbyHost, myId, username } = state;

  const isHost = myId === lobbyHost;
  const canStart = lobbyPlayers.length >= 2;

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(lobbyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    socket.emit("start_private_game", { code: lobbyCode });
  };

  const handleLeave = () => {
    socket.emit("leave_private_room", { code: lobbyCode });
    dispatch({ type: "RESET" });
  };

  // Split code into individual characters for tile display
  const codeChars = lobbyCode ? lobbyCode.split("") : [];

  return (
    <div className="lobby">
      <div className="lobby__noise" />

      <div className="lobby__content">
        <div className="lobby__badge">PRIVATE ROOM</div>
        <h1 className="lobby__title">SHARE THE CODE</h1>
        <p className="lobby__sub">Send this code to your friends to join</p>

        {/* Lucky draw style code display */}
        <div className="lobby__code-row">
          {codeChars.map((char, i) =>
            char === "-" ? (
              <span key={i} className="lobby__code-dash">—</span>
            ) : (
              <div key={i} className="lobby__code-tile">
                <span className="lobby__code-shine" />
                {char}
              </div>
            )
          )}
        </div>

        <button className="lobby__copy-btn" onClick={handleCopy}>
          {copied ? "✓ COPIED!" : "COPY CODE"}
        </button>

        {/* Player list */}
        <div className="lobby__players">
          <div className="lobby__players-header">
            PLAYERS — {lobbyPlayers.length} / 6
          </div>
          <ul className="lobby__players-list">
            {lobbyPlayers.map((p, i) => (
              <li key={p.id} className="lobby__player-row">
                <span className="lobby__player-index">{i + 1}</span>
                <span className="lobby__player-name">
                  {p.username}
                  {p.id === lobbyHost && (
                    <span className="lobby__host-badge">HOST</span>
                  )}
                  {p.id === myId && (
                    <span className="lobby__you-badge">YOU</span>
                  )}
                </span>
                <span className="lobby__player-dot" />
              </li>
            ))}
            {/* Empty slots */}
            {Array.from({ length: 6 - lobbyPlayers.length }).map((_, i) => (
              <li key={`empty-${i}`} className="lobby__player-row lobby__player-row--empty">
                <span className="lobby__player-index">{lobbyPlayers.length + i + 1}</span>
                <span className="lobby__player-name lobby__player-empty">waiting...</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="lobby__actions">
          {isHost ? (
            <button
              className={`lobby__start-btn ${!canStart ? "lobby__start-btn--disabled" : ""}`}
              onClick={handleStart}
              disabled={!canStart}
            >
              {canStart ? "START GAME" : "WAITING FOR PLAYERS..."}
            </button>
          ) : (
            <div className="lobby__waiting-msg">
              ⏳ Waiting for host to start the game...
            </div>
          )}
          <button className="lobby__leave-btn" onClick={handleLeave}>
            LEAVE ROOM
          </button>
        </div>
      </div>
    </div>
  );
}