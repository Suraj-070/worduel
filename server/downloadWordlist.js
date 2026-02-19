const https = require("https");
const fs = require("fs");
const path = require("path");

const COMMON_URL =
  "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt";

const FULL_URL =
  "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt";

console.log("📥 Downloading game wordlist...");

// Download balanced game words
https.get(COMMON_URL, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    const balanced = data
      .split("\n")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length >= 3 && w.length <= 6 && /^[a-z]+$/.test(w))
      .slice(1000, 8000);

    fs.writeFileSync(path.join(__dirname, "wordlist.txt"), balanced.join("\n"), "utf-8");
    console.log(`✅ Saved ${balanced.length} game words to wordlist.txt`);
  });
}).on("error", (err) => console.error("❌ Failed:", err.message));

// Download large valid words list for validation
console.log("📥 Downloading validation wordlist...");
https.get(FULL_URL, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    const valid = data
      .split("\n")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length >= 3 && w.length <= 6 && /^[a-z]+$/.test(w));

    fs.writeFileSync(path.join(__dirname, "validwords.txt"), valid.join("\n"), "utf-8");
    console.log(`✅ Saved ${valid.length} valid words to validwords.txt`);
  });
}).on("error", (err) => console.error("❌ Failed:", err.message));