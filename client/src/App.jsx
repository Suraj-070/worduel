import React, {useState} from "react";
import { SocketProvider } from "./context/SocketContext";
import { GameProvider, useGame } from "./context/GameContext";
import { useGameSocket } from "./hooks/useGameSocket";
import LoadingScreen from "./pages/LoadingScreen";
import Home from "./pages/Home";
import Waiting from "./pages/Waiting";
import Countdown from "./pages/Countdown";
import Game from "./pages/Game";
import RoundEnd from "./pages/RoundEnd";
import SessionEnd from "./pages/SessionEnd";
import Lobby from "./pages/Lobby";
import "./styles/global.css";

function AppScreens() {
  useGameSocket();
  const { state } = useGame();
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <LoadingScreen onFinish={() => setLoading(false)} />;
  }

  switch (state.screen) {
    case "home":       return <Home />;
    case "waiting":    return <Waiting />;
    case "countdown":  return <Countdown />;
    case "game":       return <Game />;
    case "roundEnd":   return <RoundEnd />;
    case "lobby":      return <Lobby />;
    case "sessionEnd": return <SessionEnd />;
    default:           return <Home />;
  }
}

export default function App() {
  return (
    <SocketProvider>
      <GameProvider>
        <AppScreens />
      </GameProvider>
    </SocketProvider>
  );
}