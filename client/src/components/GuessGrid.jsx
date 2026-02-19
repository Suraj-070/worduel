import React from "react";
import "../styles/GuessGrid.css";

export default function GuessGrid({ guesses, currentInput, wordLength, maxGuesses, shake }) {
  const rows = [];

  for (let i = 0; i < maxGuesses; i++) {
    if (i < guesses.length) {
      rows.push(
        <div key={i} className="guess-row guess-row--submitted">
          {guesses[i].result.map((r, j) => (
            <div
              key={j}
              className={`tile tile--${r.status}`}
              style={{ animationDelay: `${j * 80}ms` }}
            >
              {r.letter.toUpperCase()}
            </div>
          ))}
        </div>
      );
    } else if (i === guesses.length) {
      const cells = [];
      for (let j = 0; j < wordLength; j++) {
        cells.push(
          <div
            key={j}
            className={`tile tile--input ${currentInput[j] ? "tile--filled" : ""} ${
              shake ? "tile--shake" : ""
            }`}
          >
            {currentInput[j]?.toUpperCase() || ""}
          </div>
        );
      }
      rows.push(
        <div key={i} className="guess-row guess-row--active">
          {cells}
        </div>
      );
    } else {
      rows.push(
        <div key={i} className="guess-row guess-row--empty">
          {Array(wordLength).fill(null).map((_, j) => (
            <div key={j} className="tile tile--empty" />
          ))}
        </div>
      );
    }
  }

  return <div className="guess-grid">{rows}</div>;
}