import React, { useEffect, useState } from "react";
import "../styles/LoadingScreen.css";

export default function LoadingScreen({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing...");
  const [phase, setPhase] = useState(0); // 0=intro 1=loading 2=done

  useEffect(() => {
    // Phase 0 — logo animation plays first
    const introTimer = setTimeout(() => setPhase(1), 1500);
    return () => clearTimeout(introTimer);
  }, []);

  useEffect(() => {
    if (phase !== 1) return;

    const steps = [
      { pct: 15,  text: "Initializing battle arena..." },
      { pct: 30,  text: "Loading word database..." },
      { pct: 50,  text: "Connecting to server..." },
      { pct: 65,  text: "Sharpening your weapons..." },
      { pct: 80,  text: "Preparing opponents..." },
      { pct: 95,  text: "Almost ready..." },
      { pct: 100, text: "Let the battle begin!" },
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i >= steps.length) {
        clearInterval(interval);
        setPhase(2);
        setTimeout(onFinish, 1000);
        return;
      }
      setProgress(steps[i].pct);
      setStatusText(steps[i].text);
      i++;
    }, 500);

    return () => clearInterval(interval);
  }, [phase, onFinish]);

  return (
    <div className={`loading ${phase === 2 ? "loading--exit" : ""}`}>

      {/* Animated background particles */}
      <div className="loading__particles">
        {Array(20).fill(null).map((_, i) => (
          <div key={i} className="loading__particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
          }}/>
        ))}
      </div>

      {/* Grid lines background */}
      <div className="loading__grid"/>

      <div className="loading__content">

        {/* ── Logo Animation ── */}
        <div className={`loading__logo-wrap ${phase >= 0 ? "loading__logo-wrap--visible" : ""}`}>

          {/* Outer rotating ring */}
          <div className="loading__ring loading__ring--outer"/>
          <div className="loading__ring loading__ring--middle"/>
          <div className="loading__ring loading__ring--inner"/>

          {/* SVG Logo */}
          <div className="loading__svg-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="140" height="140">
              <defs>
                <filter id="lglow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="lbolt" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <linearGradient id="lwGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff"/>
                  <stop offset="50%" stopColor="#88aaff"/>
                  <stop offset="100%" stopColor="#1a4aff"/>
                </linearGradient>
                <linearGradient id="llGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff"/>
                  <stop offset="100%" stopColor="#1a4aff" stopOpacity="0.5"/>
                </linearGradient>
                <radialGradient id="lbgGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0d1a3a"/>
                  <stop offset="100%" stopColor="#050510"/>
                </radialGradient>
              </defs>

              {/* Background */}
              <circle cx="100" cy="100" r="94" fill="url(#lbgGrad)"/>

              {/* W letter */}
              <text x="100" y="135"
                fontFamily="Arial Black, sans-serif"
                fontSize="108" fontWeight="900"
                textAnchor="middle"
                fill="url(#lwGrad)"
                filter="url(#lglow)"
              >W</text>

              {/* Lightning left */}
              <polygon points="72,44 61,80 72,76 58,116 83,70 70,74"
                fill="url(#llGrad)" filter="url(#lbolt)" opacity="0.95"/>

              {/* Lightning right */}
              <polygon points="128,44 117,80 128,76 114,116 139,70 126,74"
                fill="url(#llGrad)" filter="url(#lbolt)" opacity="0.95"/>

              {/* Sparks */}
              <circle cx="56" cy="40" r="2.5" fill="#fff" opacity="0.9"/>
              <circle cx="48" cy="52" r="1.5" fill="#88aaff" opacity="0.8"/>
              <circle cx="144" cy="40" r="2.5" fill="#fff" opacity="0.9"/>
              <circle cx="152" cy="52" r="1.5" fill="#88aaff" opacity="0.8"/>
            </svg>
          </div>

          {/* Pulse rings */}
          <div className="loading__pulse"/>
          <div className="loading__pulse loading__pulse--2"/>
        </div>

        {/* ── Title ── */}
        <div className="loading__title-wrap">
          {"WORDSTRIKE".split("").map((letter, i) => (
            <span
              key={i}
              className="loading__letter"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {letter}
            </span>
          ))}
        </div>

        <p className="loading__tagline">
          {"THINK FAST. STRIKE FASTER.".split("").map((c, i) => (
            <span key={i} style={{ animationDelay: `${0.8 + i * 0.03}s` }}
              className="loading__tagline-char">
              {c === " " ? "\u00A0" : c}
            </span>
          ))}
        </p>

        {/* ── Progress Section ── */}
        {phase >= 1 && (
          <div className="loading__progress-wrap">
            {/* Bar */}
            <div className="loading__bar-track">
              <div className="loading__bar-fill" style={{ width: `${progress}%` }}>
                <div className="loading__bar-glow"/>
              </div>
            </div>

            {/* Bottom row */}
            <div className="loading__progress-info">
              <span className="loading__status">{statusText}</span>
              <span className="loading__pct">{progress}%</span>
            </div>

            {/* Tick marks */}
            <div className="loading__ticks">
              {[0, 25, 50, 75, 100].map((tick) => (
                <div
                  key={tick}
                  className={`loading__tick ${progress >= tick ? "loading__tick--active" : ""}`}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Corner decorations */}
      <div className="loading__corner loading__corner--tl"/>
      <div className="loading__corner loading__corner--tr"/>
      <div className="loading__corner loading__corner--bl"/>
      <div className="loading__corner loading__corner--br"/>

    </div>
  );
}