import React from "react";
import "../styles/LetterPool.css";

export default function LetterPool({ letters, onLetterClick, usedLetters }) {
  const usedCounts = usedLetters.reduce((acc, l) => {
    acc[l] = (acc[l] || 0) + 1;
    return acc;
  }, {});

  const availableCounts = {};
  letters.forEach((l) => {
    availableCounts[l] = (availableCounts[l] || 0) + 1;
  });

  return (
    <div className="letter-pool">
      <p className="letter-pool__label">Available Letters</p>
      <div className="letter-pool__tiles">
        {letters.map((letter, i) => {
          const used = usedCounts[letter] || 0;
          const available = availableCounts[letter] || 0;
          const isUsed = used >= available;

          return (
            <button
              key={i}
              className={`pool-tile ${isUsed ? "pool-tile--used" : ""}`}
              onClick={() => !isUsed && onLetterClick(letter)}
              disabled={isUsed}
            >
              {letter.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}