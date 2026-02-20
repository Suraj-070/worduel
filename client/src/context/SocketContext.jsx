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
      },
    );
    setSocket(s);
    s.connect();
    return () => s.disconnect();
  }, []);

  useEffect(() => {
  if (!socket) return; // guard against null socket
  
  socket.on("connect", () => {
    if (socket.id) {
      sessionStorage.setItem("socketId", socket.id);
    }
  });

  return () => {
    socket.off("connect");
  };
}, [socket]);


  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
