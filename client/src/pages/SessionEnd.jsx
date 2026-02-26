import React, { useEffect } from "react";
import { useGame } from "../context/GameContext";
import { useSocket } from "../context/SocketContext";
import "../styles/SessionEnd.css";
import { SessionWinner } from "../components/Animations";

export default function SessionEnd() {
  const { state, dispatch } = useGame();
  const socket = useSocket();
  const {
    scores,
    players,
    myId,
    sessionWinner,
    suddenDeathWord,
    opponentWantsRematch,
    rematchDeclined,
    rematchExpired,
    waitingForRematch,
    roomId,
  } = state;

  const me = players.find((p) => p.id === myId);
  const opponent = players.find((p) => p.id !== myId);

  const iWon = sessionWinner?.id === myId;
  const isDraw = !sessionWinner;

  // Clear session storage when game ends
  useEffect(() => {
    sessionStorage.removeItem("roomId");
    sessionStorage.removeItem("username");
  }, []);

  const handleRematch = () => {
    dispatch({ type: "WAITING_FOR_REMATCH" });
    socket.emit("request_rematch", { roomId });
  };

  const handleDeclineRematch = () => {
    socket.emit("decline_rematch", { roomId });
    dispatch({ type: "RESET" });
  };

  const handleFindNewMatch = () => {
    dispatch({ type: "RESET" });
  };

  const handleGoHome = () => {
    dispatch({ type: "RESET" });
  };

  return (
    <div className="session-end">

      {/* Result title */}
      <div className={`session-end__result ${iWon ? "session-end__result--win" : isDraw ? "session-end__result--draw" : "session-end__result--lose"}`}>
        {isDraw ? "🤝 DRAW!" : iWon ? "🏆 YOU WIN!" : "💀 YOU LOSE"}
      </div>

      {/* Sudden death word reveal */}
      {suddenDeathWord && (
        <div className="session-end__sd-word">
          💀 Sudden Death Word: <strong>{suddenDeathWord.toUpperCase()}</strong>
        </div>
      )}

      {/* Scores */}
      <div className="session-end__scores">
        <div className={`session-end__block ${iWon ? "session-end__block--winner" : ""}`}>
          <span className="session-end__name">{me?.username}</span>
          <span className="session-end__pts">{scores[myId] || 0}</span>
          <span className="session-end__pts-label">points</span>
        </div>
        <div className="session-end__divider">VS</div>
        <div className={`session-end__block ${!iWon && !isDraw ? "session-end__block--winner" : ""}`}>
          <span className="session-end__name">{opponent?.username}</span>
          <span className="session-end__pts">{scores[opponent?.id] || 0}</span>
          <span className="session-end__pts-label">points</span>
        </div>
      </div>

      {/* ── Waiting for opponent to respond ── */}
      {waitingForRematch && !opponentWantsRematch && (
        <div className="session-end__status">
          ⏳ Waiting for opponent to accept rematch...
        </div>
      )}

      {/* ── Opponent wants rematch ── */}
      {opponentWantsRematch && !waitingForRematch && (
        <div className="session-end__rematch-request">
          <p>⚔️ <strong>{opponent?.username}</strong> wants a rematch!</p>
          <div className="session-end__rematch-actions">
            <button
              className="session-end__btn session-end__btn--accept"
              onClick={handleRematch}
            >
              ✅ Accept
            </button>
            <button
              className="session-end__btn session-end__btn--decline"
              onClick={handleDeclineRematch}
            >
              ❌ Decline
            </button>
          </div>
        </div>
      )}

      {/* ── Rematch declined or expired — show message + 2 buttons only ── */}
      {(rematchDeclined || rematchExpired) && (
        <>
          <div className="session-end__status session-end__status--bad">
            {rematchDeclined ? "❌ Opponent declined the rematch!" : "⏰ Rematch request expired!"}
          </div>
          <div className="session-end__actions">
            <button
              className="session-end__btn session-end__btn--new"
              onClick={handleFindNewMatch}
            >
              🔍 NEW MATCH
            </button>
            <button
              className="session-end__btn session-end__btn--home"
              onClick={handleGoHome}
            >
              🏠 HOME
            </button>
          </div>
        </>
      )}

      {/* ── Default buttons — only when nothing else is active ── */}
      {!waitingForRematch && !opponentWantsRematch && !rematchDeclined && !rematchExpired && (
        <div className="session-end__actions">
          <button
            className="session-end__btn session-end__btn--rematch"
            onClick={handleRematch}
          >
            ⚔️ REMATCH
          </button>
          <button
            className="session-end__btn session-end__btn--new"
            onClick={handleFindNewMatch}
          >
            🔍 NEW MATCH
          </button>
          <button
            className="session-end__btn session-end__btn--home"
            onClick={handleGoHome}
          >
            🏠 HOME
          </button>
        </div>
      )}

      <SessionWinner winner={sessionWinner} me={me} />
    </div>
  );
}