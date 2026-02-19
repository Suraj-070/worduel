import React, { useEffect, useState } from "react";
import "../styles/Waiting.css";

export default function Waiting() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const i = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="waiting">
      <div className="waiting__spinner">
        <div className="waiting__ring" />
        <div className="waiting__ring waiting__ring--2" />
      </div>
      <h2 className="waiting__title">Finding Opponent{dots}</h2>
      <p className="waiting__sub">Searching for a worthy challenger</p>
    </div>
  );
}