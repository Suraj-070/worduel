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
  const isMultiplayer = players.length > 2;

  const iWon = sessionWinner?.id === myId;
  const isDraw = !sessionWinner;

  // Sort players by score descending
  const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

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

  const handleFindNewMatch = () => dispatch({ type: "RESET" });
  const handleGoHome = () => dispatch({ type: "RESET" });

  return (
    <div className="session-end">

      {/* Result title */}
      <div className={`session-end__result ${iWon ? "session-end__result--win" : isDraw ? "session-end__result--draw" : "session-end__result--lose"}`}>
        {isDraw ? "🤝 DRAW!" : iWon ? "🏆 YOU WIN!" : isMultiplayer ? `🏆 ${sessionWinner?.username} WINS!` : "💀 YOU LOSE"}
      </div>

      {/* Sudden death word */}
      {suddenDeathWord && (
        <div className="session-end__sd-word">
          💀 Sudden Death Word: <strong>{suddenDeathWord.toUpperCase()}</strong>
        </div>
      )}

      {/* Scores */}
      {isMultiplayer ? (
        // Full leaderboard for multiplayer
        <div className="session-end__leaderboard">
          {sorted.map((p, i) => {
            const isMe = p.id === myId;
            const isWinner = sessionWinner?.id === p.id;
            return (
              <div
                key={p.id}
                className={`session-end__lb-row 
                  ${isMe ? "session-end__lb-row--me" : ""} 
                  ${isWinner ? "session-end__lb-row--winner" : ""}`}
              >
                <span className="session-end__lb-rank">
                  {i === 0 ? "👑" : `#${i + 1}`}
                </span>
                <span className="session-end__lb-name">
                  {p.username}
                  {isMe && <span className="session-end__lb-you">YOU</span>}
                </span>
                <span className="session-end__lb-score">{scores[p.id] || 0} pts</span>
              </div>
            );
          })}
        </div>
      ) : (
        // Original 1v1 scores
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
      )}

      {/* Rematch section — only for 1v1 */}
      {!isMultiplayer && (
        <>
          {waitingForRematch && !opponentWantsRematch && (
            <div className="session-end__status">
              ⏳ Waiting for opponent to accept rematch...
            </div>
          )}

          {opponentWantsRematch && !waitingForRematch && (
            <div className="session-end__rematch-request">
              <p>⚔️ <strong>{opponent?.username}</strong> wants a rematch!</p>
              <div className="session-end__rematch-actions">
                <button className="session-end__btn session-end__btn--accept" onClick={handleRematch}>
                  ✅ Accept
                </button>
                <button className="session-end__btn session-end__btn--decline" onClick={handleDeclineRematch}>
                  ❌ Decline
                </button>
              </div>
            </div>
          )}

          {(rematchDeclined || rematchExpired) && (
            <>
              <div className="session-end__status session-end__status--bad">
                {rematchDeclined ? "❌ Opponent declined the rematch!" : "⏰ Rematch request expired!"}
              </div>
              <div className="session-end__actions">
                <button className="session-end__btn session-end__btn--new" onClick={handleFindNewMatch}>
                  🔍 NEW MATCH
                </button>
                <button className="session-end__btn session-end__btn--home" onClick={handleGoHome}>
                  🏠 HOME
                </button>
              </div>
            </>
          )}

          {!waitingForRematch && !opponentWantsRematch && !rematchDeclined && !rematchExpired && (
            <div className="session-end__actions">
              <button className="session-end__btn session-end__btn--rematch" onClick={handleRematch}>
                ⚔️ REMATCH
              </button>
              <button className="session-end__btn session-end__btn--new" onClick={handleFindNewMatch}>
                🔍 NEW MATCH
              </button>
              <button className="session-end__btn session-end__btn--home" onClick={handleGoHome}>
                🏠 HOME
              </button>
            </div>
          )}
        </>
      )}

      {/* Multiplayer actions — just go home or find new match */}
      {isMultiplayer && (
        <div className="session-end__actions">
          <button className="session-end__btn session-end__btn--new" onClick={handleFindNewMatch}>
            🔍 NEW MATCH
          </button>
          <button className="session-end__btn session-end__btn--home" onClick={handleGoHome}>
            🏠 HOME
          </button>
        </div>
      )}

      <SessionWinner winner={sessionWinner} me={me} />
    </div>
  );
}