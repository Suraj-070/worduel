import React, { useEffect, useState, useRef } from "react";
import "../styles/Timer.css";

export default function Timer({ seconds, onTimeUp, paused }) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const countdownSound = useRef(new Audio("/sounds/countdown.mp3"));
  const timeupSound = useRef(new Audio("/sounds/timeup.mp3"));
  const playedTimeup = useRef(false);

  useEffect(() => {
    setTimeLeft(seconds);
    playedTimeup.current = false;
  }, [seconds]);

  useEffect(() => {
    if (paused || timeLeft <= 0) {
      if (timeLeft <= 0 && !playedTimeup.current) {
        playedTimeup.current = true;
        timeupSound.current.play();
        onTimeUp?.();
      }
      return;
    }

    // Play countdown beep in last 9 seconds
    if (timeLeft <= 9) {
      countdownSound.current.currentTime = 0;
      countdownSound.current.play();
    }

    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, paused, onTimeUp]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const pct = (timeLeft / seconds) * 100;
  const urgency = timeLeft <= 9 ? "urgent" : timeLeft <= 120 ? "warning" : "normal";

  return (
    <div className={`timer timer--${urgency}`}>
      <div className="timer__display">
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </div>
      <div className="timer__bar">
        <div className="timer__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}