import React, { useEffect, useRef, useState } from "react";
import "../styles/Timer.css";

export default function Timer({ seconds, onTimeUp, paused }) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const intervalRef = useRef(null);
  const onTimeUpRef = useRef(onTimeUp);
  const pausedRef = useRef(paused);
  const playedTimeup = useRef(false);

  // Sound refs
  const countdownSound = useRef(null);
  const timeupSound = useRef(null);

  // Initialize sounds once
  useEffect(() => {
    countdownSound.current = new Audio("/sounds/countdown.mp3");
    timeupSound.current = new Audio("/sounds/timeup.mp3");
    countdownSound.current.volume = 0.7;
    timeupSound.current.volume = 0.8;
  }, []);

  // Keep refs updated without triggering re-renders
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Reset when new round starts
  useEffect(() => {
    setTimeLeft(seconds);
    playedTimeup.current = false;
  }, [seconds]);

  // Single clean interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (paused || seconds <= 0) return;

    let current = seconds;

    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return;

      current -= 1;
      setTimeLeft(current);

      // Play countdown beep in last 9 seconds
      if (current <= 9 && current > 0) {
        if (countdownSound.current) {
          countdownSound.current.currentTime = 0;
          countdownSound.current.play().catch(() => {});
        }
      }

      // Time up
      if (current <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;

        if (!playedTimeup.current) {
          playedTimeup.current = true;
          if (timeupSound.current) {
            timeupSound.current.play().catch(() => {});
          }
        }

        onTimeUpRef.current?.();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [seconds]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const pct = Math.max(0, (timeLeft / seconds) * 100);
  const urgency =
    timeLeft <= 9 ? "urgent" : timeLeft <= 60 ? "warning" : "normal";

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
