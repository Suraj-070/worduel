import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const s = io(
  process.env.NODE_ENV === "production"
    ? "https://worduel-server-l2j1.onrender.com"
    : "http://localhost:4000",
  {
    autoConnect: false,
    transports: ["websocket", "polling"],
  }
);
    setSocket(s);
    s.connect();
    return () => s.disconnect();
  }, []);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);