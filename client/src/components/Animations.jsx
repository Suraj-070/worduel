import React, { useEffect, useState } from "react";
import "../styles/Animations.css";

// ── Fire Streak ───────────────────────────────────────────────────────────────
export function FireStreak({ streak }) {
  if (streak < 2) return null;
  return (
    <div className="anim-fire">
      <div className="anim-fire__text">
        🔥 {streak} ROUND STREAK!
      </div>
      <div className="anim-fire__flames">
        {Array(12).fill(null).map((_, i) => (
          <div key={i} className="anim-fire__flame" style={{
            left: `${(i / 12) * 100}%`,
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${0.8 + Math.random() * 0.4}s`,
            fontSize: `${1.5 + Math.random() * 1.5}rem`,
          }}>🔥</div>
        ))}
      </div>
    </div>
  );
}

// ── Speed Demon ───────────────────────────────────────────────────────────────
export function SpeedDemon({ show }) {
  if (!show) return null;
  return (
    <div className="anim-speed">
      <div className="anim-speed__bolt">⚡</div>
      <div className="anim-speed__text">LIGHTNING FAST!</div>
      <div className="anim-speed__flash"/>
    </div>
  );
}

// ── First Try Crown ───────────────────────────────────────────────────────────
export function FirstTryCrown({ show }) {
  if (!show) return null;
  return (
    <div className="anim-crown">
      <div className="anim-crown__icon">👑</div>
      <div className="anim-crown__text">PERFECT!</div>
      <div className="anim-crown__confetti">
        {Array(20).fill(null).map((_, i) => (
          <div key={i} className="anim-crown__piece" style={{
            left: `${Math.random() * 100}%`,
            background: ["#FFD700", "#1a4aff", "#ffffff", "#4caf7d"][i % 4],
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${0.8 + Math.random() * 0.6}s`,
            width: `${6 + Math.random() * 8}px`,
            height: `${6 + Math.random() * 8}px`,
          }}/>
        ))}
      </div>
    </div>
  );
}

// ── Comeback King ─────────────────────────────────────────────────────────────
export function ComebackKing({ show }) {
  if (!show) return null;
  return (
    <div className="anim-comeback">
      <div className="anim-comeback__sweep"/>
      <div className="anim-comeback__text">
        <span>💀</span> COMEBACK! <span>💀</span>
      </div>
    </div>
  );
}

// ── Last Guess Tension ────────────────────────────────────────────────────────
export function LastGuessTension({ show }) {
  if (!show) return null;
  return (
    <div className="anim-tension">
      <div className="anim-tension__border"/>
      <div className="anim-tension__text">⚠️ LAST CHANCE!</div>
    </div>
  );
}

// ── Session Winner ────────────────────────────────────────────────────────────
export function SessionWinner({ winner, me }) {
  const isWinner = winner?.id === me?.id;
  return (
    <div className="anim-winner">
      <div className="anim-winner__confetti">
        {isWinner && Array(40).fill(null).map((_, i) => (
          <div key={i} className="anim-winner__piece" style={{
            left: `${Math.random() * 100}%`,
            background: ["#FFD700", "#1a4aff", "#ffffff", "#4caf7d", "#ff4757"][i % 5],
            animationDelay: `${Math.random() * 1.5}s`,
            animationDuration: `${1 + Math.random() * 1}s`,
            width: `${6 + Math.random() * 10}px`,
            height: `${6 + Math.random() * 10}px`,
            borderRadius: Math.random() > 0.5 ? "50%" : "0",
          }}/>
        ))}
      </div>
      <div className={`anim-winner__content ${isWinner ? "anim-winner__content--win" : "anim-winner__content--lose"}`}>
        {isWinner ? (
          <>
            <div className="anim-winner__trophy">🏆</div>
            <div className="anim-winner__title">YOU WIN!</div>
            <div className="anim-winner__sub">Magnificent performance!</div>
          </>
        ) : (
          <>
            <div className="anim-winner__trophy">💀</div>
            <div className="anim-winner__title">YOU LOSE!</div>
            <div className="anim-winner__sub">Better luck next time!</div>
          </>
        )}
      </div>
    </div>
  );
}