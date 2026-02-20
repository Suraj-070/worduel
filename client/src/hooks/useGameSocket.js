import { useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { useGame } from "../context/GameContext";

export function useGameSocket() {
  const socket = useSocket();
  const { dispatch } = useGame();

  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      dispatch({ type: "SET_MY_ID", payload: socket.id });
    });

    socket.on("waiting_for_opponent", () => {
      dispatch({ type: "WAITING" });
    });

    socket.on("match_found", (data) => {
      dispatch({ type: "MATCH_FOUND", payload: data });
    });

    socket.on("round_start", (data) => {
      dispatch({ type: "ROUND_START", payload: data });
    });

    socket.on("hint_revealed", (data) => {
      dispatch({ type: "HINT_REVEALED", payload: data });
    });

    socket.on("hint_already_used", () => {
      dispatch({ type: "HINT_ALREADY_USED" });
    });

    socket.on("guess_result", (data) => {
      dispatch({ type: "GUESS_RESULT", payload: data });

      if (data.isCorrect) {
        // Fire custom event so Game.jsx can trigger animations
        window.dispatchEvent(
          new CustomEvent("round_correct", {
            detail: {
              guessNumber: data.guessNumber,
              bonuses: data.bonuses || [],
              pointsEarned: data.pointsEarned,
            },
          }),
        );
      }
    });

    socket.on("opponent_guessed", (data) => {
      dispatch({ type: "OPPONENT_GUESSED", payload: data });
      if (data.isCorrect && data.scores) {
        dispatch({ type: "UPDATE_SCORES", payload: { scores: data.scores } });
      }
    });

    socket.on("round_end", (data) => {
      dispatch({ type: "ROUND_END", payload: data });
    });

    socket.on("session_end", (data) => {
      dispatch({ type: "SESSION_END", payload: data });
    });

    socket.on("opponent_disconnected", () => {
      alert("Your opponent disconnected.");
      dispatch({ type: "RESET" });
    });

    // Opponent temporarily disconnected
    socket.on("opponent_disconnected_temp", (data) => {
      dispatch({ type: "OPPONENT_DISCONNECTED_TEMP", payload: data });
    });

    // Reconnect countdown
    socket.on("reconnect_countdown", (data) => {
      dispatch({ type: "RECONNECT_COUNTDOWN", payload: data });
    });

    // Opponent reconnected
    socket.on("opponent_reconnected", (data) => {
      dispatch({ type: "OPPONENT_RECONNECTED", payload: data });
    });

    // Opponent forfeited
    socket.on("opponent_forfeited", (data) => {
      dispatch({ type: "OPPONENT_FORFEITED", payload: data });
    });

    // Rejoin success
    socket.on("rejoin_success", (data) => {
      dispatch({ type: "REJOIN_SUCCESS", payload: data });
    });

    // Rejoin failed
    socket.on("rejoin_failed", (data) => {
      dispatch({ type: "REJOIN_FAILED", payload: data });
    });

    socket.on("invalid_word", (data) => {
      dispatch({ type: "INVALID_WORD" });
    });

    return () => {
      socket.off("connect");
      socket.off("waiting_for_opponent");
      socket.off("match_found");
      socket.off("round_start");
      socket.off("guess_result");
      socket.off("opponent_guessed");
      socket.off("round_end");
      socket.off("session_end");
      socket.off("opponent_disconnected");
      socket.off("invalid_word");
      socket.off("hint_revealed");
      socket.off("hint_already_used");
      socket.off("opponent_disconnected_temp");
      socket.off("reconnect_countdown");
      socket.off("opponent_reconnected");
      socket.off("opponent_forfeited");
      socket.off("rejoin_success");
      socket.off("rejoin_failed");
    };
  }, [socket, dispatch]);
}
