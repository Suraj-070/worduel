import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

// Create socket ONCE outside component so it never gets recreated
const socket = io(
  process.env.NODE_ENV === "production"
    ? "https://worduel-server-l2j1.onrender.com"
    : "http://localhost:4000",
  {
    autoConnect: false,
    transports: ["websocket", "polling"],
  }
);

export const SocketProvider = ({ children }) => {
  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      if (socket.id) {
        sessionStorage.setItem("socketId", socket.id);
      }
    });

    return () => {
      socket.off("connect");
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);