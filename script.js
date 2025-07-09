import targetWords from "./targetWords.js";
// import dictionary from "./dictionary.js";

const keyboard = document.querySelector("[data-keyboard]");
const guessList = document.querySelector("[data-guess-list]");
const inputArea = document.querySelector("[data-input-area]");
const alertContainer = document.querySelector("[data-alert-container]");

// Pick today's phrase
const referenceDate = new Date(2025, 6, 6);
const msOffsetFromRefDate = Date.now() - referenceDate;
const dayOffsetFromRefDate = msOffsetFromRefDate / 1000 / 60 / 60 / 24;
const targetPhrase = targetWords[Math.floor(dayOffsetFromRefDate % targetWords.length)].toUpperCase();

const phraseSlots = parsePhrase(targetPhrase)
  .map((slot, i) => ({ ...slot, index: i }));
let currentGuess = Array(phraseSlots.length).fill(""); // Only for letters

// --- New state for letter counting ---
const targetLetterCounts = {};
for (const slot of phraseSlots) {
  if (!slot.isGrammar) {
    const ch = slot.char;
    targetLetterCounts[ch] = (targetLetterCounts[ch] || 0) + 1;
  }
}
const correctLetterPlacements = {};
const guessedLetterCounts = {};
function resetGuessTracking() {
  for (const key in correctLetterPlacements) delete correctLetterPlacements[key];
  for (const key in guessedLetterCounts) delete guessedLetterCounts[key];
}
// --- End new state ---

startInteraction();
renderInputArea();

function makeIndexGroups(slots) {
  const groups = [];
  let i = 0;
  while (i < slots.length) {
    const group = [];
    // collect up through the next space (inclusive)
    do {
      group.push(slots[i].index);
      i++;
    } while (i < slots.length && slots[i - 1].char !== " ");
    groups.push(group);
  }
  return groups;
}

function parsePhrase(phrase) {
  // Returns [{char, isGrammar}]
  return [...phrase].map(char => ({
    char,
    isGrammar: !char.match(/[A-Z]/i)
  }));
}

function trimTrailingSpaceTile(container) {
  const last = container.lastElementChild;
  if (last && last.dataset.grammar === "true" && last.classList.contains("input-space")) {
    container.removeChild(last);
  }
}

function renderInputArea() {
  inputArea.innerHTML = "";
  const maxPerLine = getMaxTilesPerLine();
  const groups     = makeIndexGroups(phraseSlots);

  let count       = 0;
  let lineEl      = document.createElement("div");
  lineEl.className = "input-line";

  for (const group of groups) {
    if (count + group.length > maxPerLine) {
      // drop trailing blank if any
      trimTrailingSpaceTile(lineEl);
      inputArea.appendChild(lineEl);

      lineEl = document.createElement("div");
      lineEl.className = "input-line";
      count = 0;
    }

    for (const idx of group) {
      const slot = phraseSlots[idx];
      let el;

      if (slot.char === " ") {
        el = document.createElement("div");
        el.className = "input-char input-space";
        el.dataset.grammar = "true";

      } else if (slot.isGrammar) {
        el = document.createElement("span");
        el.className = "input-char";
        el.dataset.grammar = "true";
        el.textContent = slot.char;

      } else {
        el = document.createElement("div");
        el.className = "input-char input-underline";
        el.dataset.index = idx;
        el.textContent = currentGuess[idx] || "";
      }

      lineEl.appendChild(el);
    }

    count += group.length;
  }

  // flush last line (and trim trailing space)
  trimTrailingSpaceTile(lineEl);
  inputArea.appendChild(lineEl);
}

function renderGuessRow(guessArr, resultArr) {
  const maxPerLine = getMaxTilesPerLine();
  const groups     = makeIndexGroups(phraseSlots);

  const guessBlock = document.createElement("div");
  guessBlock.className = "guess-block";

  let count        = 0;
  let lineEl       = document.createElement("div");
  lineEl.className = "guess-line";

  for (const group of groups) {
    if (count + group.length > maxPerLine) {
      trimTrailingSpaceTile(lineEl);
      guessBlock.appendChild(lineEl);

      lineEl = document.createElement("div");
      lineEl.className = "guess-line";
      count = 0;
    }

    for (const idx of group) {
      const slot = phraseSlots[idx];
      let el;

      if (slot.char === " ") {
        el = document.createElement("div");
        el.className = "guess-char input-space";
        el.dataset.grammar = "true";

      } else if (slot.isGrammar) {
        el = document.createElement("span");
        el.className = "guess-char";
        el.dataset.grammar = "true";
        el.textContent = slot.char;

      } else {
        el = document.createElement("div");
        el.className = "guess-char input-underline";
        el.textContent = guessArr[idx] || "";
        const state = resultArr[idx];
        if (state) {
          el.classList.add(state);
          updateKeyboardColor(guessArr[idx]);
        }
      }

      lineEl.appendChild(el);
    }

    count += group.length;
  }

  // flush last line
  trimTrailingSpaceTile(lineEl);
  guessBlock.appendChild(lineEl);

  guessList.appendChild(guessBlock);
  guessList.scrollTop = guessList.scrollHeight;
}

function startInteraction() {
  document.addEventListener("click", handleMouseClick);
  document.addEventListener("keydown", handleKeyPress);
}

function stopInteraction() {
  document.removeEventListener("click", handleMouseClick);
  document.removeEventListener("keydown", handleKeyPress);
}

function handleMouseClick(e) {
  // Find the closest ancestor with data-key, data-enter, or data-delete
  const keyBtn = e.target.closest("[data-key]");
  const enterBtn = e.target.closest("[data-enter]");
  const deleteBtn = e.target.closest("[data-delete]");

  if (keyBtn) {
    pressKey(keyBtn.dataset.key);
    return;
  }
  if (enterBtn) {
    submitGuess();
    return;
  }
  if (deleteBtn) {
    deleteKey();
    return;
  }
}

function handleKeyPress(e) {
  if (e.key === "Enter") {
    submitGuess();
    return;
  }
  if (e.key === "Backspace" || e.key === "Delete") {
    deleteKey();
    return;
  }
  if (e.key.match(/^[a-zA-Z]$/)) {
    pressKey(e.key.toUpperCase());
    return;
  }
}

function pressKey(key) {
  for (let i = 0; i < phraseSlots.length; i++) {
    if (!phraseSlots[i].isGrammar && !currentGuess[i]) {
      currentGuess[i] = key;
      break;
    }
  }
  renderInputArea();
}

function deleteKey() {
  for (let i = phraseSlots.length - 1; i >= 0; i--) {
    if (!phraseSlots[i].isGrammar && currentGuess[i]) {
      currentGuess[i] = "";
      break;
    }
  }
  renderInputArea();
}

function submitGuess() {
  for (let i = 0; i < phraseSlots.length; i++) {
    if (!phraseSlots[i].isGrammar && !currentGuess[i]) {
      showAlert("Not enough letters!");
      shakeInputArea();
      return;
    }
  }

  // Optional: Validate each word in the guess (skip grammar)
  /*
  const guessPhrase = phraseSlots.map((slot, i) =>
    slot.isGrammar ? slot.char : currentGuess[i]
  ).join("");
  const words = guessPhrase.split(/[^A-Z]+/i).filter(Boolean);
  for (const word of words) {
    if (!dictionary.includes(word.toLowerCase())) {
      showAlert("Not in word list");
      shakeInputArea();
      return;
    }
  }
  */

  const resultArr = evaluateGuess(currentGuess, phraseSlots, targetPhrase);
  renderGuessRow(currentGuess, resultArr);

  if (resultArr.every((r, i) => phraseSlots[i].isGrammar || r === "correct")) {
    showAlert("you win !! yipeeee", 3000);
    stopInteraction();
    return;
  }

  currentGuess = Array(phraseSlots.length).fill("");
  renderInputArea();
}

function evaluateGuess(guessArr, slots, target) {
  const result = [];
  const targetArr = [...target];
  const guessLetters = [];
  const targetLetters = [];

  // Reset tracking for this guess
  resetGuessTracking();

  for (let i = 0; i < slots.length; i++) {
    if (!slots[i].isGrammar) {
      guessLetters.push(guessArr[i]);
      targetLetters.push(targetArr[i]);
      guessedLetterCounts[guessArr[i]] = (guessedLetterCounts[guessArr[i]] || 0) + 1;
    }
  }

  const letterStates = Array(guessLetters.length).fill("");
  const usedTarget = Array(targetLetters.length).fill(false);

  // First pass: correct placements
  for (let i = 0; i < guessLetters.length; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      letterStates[i] = "correct";
      usedTarget[i] = true;
      correctLetterPlacements[guessLetters[i]] = (correctLetterPlacements[guessLetters[i]] || 0) + 1;
    }
  }
  // Second pass: wrong-location
  for (let i = 0; i < guessLetters.length; i++) {
    if (letterStates[i]) continue;
    const idx = targetLetters.findIndex(
      (ch, j) => ch === guessLetters[i] && !usedTarget[j]
    );
    if (idx !== -1) {
      letterStates[i] = "wrong-location";
      usedTarget[idx] = true;
    } else {
      letterStates[i] = "wrong";
    }
  }

  let letterIdx = 0;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].isGrammar) {
      result.push("");
    } else {
      result.push(letterStates[letterIdx]);
      updateKeyboardColor(guessArr[i]);
      letterIdx++;
    }
  }
  return result;
}

// Helper to get how many of a letter remain unsolved
function getRemainingToSolve(letter) {
  const needed = targetLetterCounts[letter] || 0;
  const solved = correctLetterPlacements[letter] || 0;
  return Math.max(needed - solved, 0);
}

function updateKeyboardColor(letter) {
  const key = keyboard.querySelector(`[data-key="${letter}"]`);
  if (!key) return;

  // Remove any previous badge
  let badge = key.querySelector(".key-badge");
  if (badge) badge.remove();

  // Always show badge after first guess, even if count is 0 (for the "cute little blank icon")
  if (guessedLetterCounts[letter] > 0) {
    badge = document.createElement("span");
    badge.className = "key-badge";
    badge.textContent = (letter in targetLetterCounts) ? getRemainingToSolve(letter) : "";
    badge.style.position = "absolute";
    badge.style.top = "2px";
    badge.style.right = "4px";
    badge.style.fontSize = "0.7em";
    badge.style.background = "#eee";
    badge.style.borderRadius = "50%";
    badge.style.padding = "2px 5px";
    key.style.position = "relative";
    key.appendChild(badge);
  }

  // Coloring logic
  const correct = correctLetterPlacements[letter] || 0;
  const needed = targetLetterCounts[letter] || 0;

  if (needed === 0 && guessedLetterCounts[letter] > 0) {
    // Letter does not exist in phrase, keep it grey
    key.classList.remove("correct", "wrong-location");
    key.classList.add("wrong");
  } else if (correct >= needed && needed > 0) {
    key.classList.remove("wrong", "wrong-location");
    key.classList.add("correct");
  } else if (guessedLetterCounts[letter] > 0 && needed > 0) {
    key.classList.remove("wrong", "correct");
    key.classList.add("wrong-location");
  } else {
    key.classList.remove("correct", "wrong-location");
    key.classList.add("wrong");
  }
}

function showAlert(message, duration = 1000) {
  const alert = document.createElement("div");
  alert.textContent = message;
  alert.classList.add("alert");
  alertContainer.prepend(alert);
  if (duration == null) {
    return;
  }
  setTimeout(() => {
    alert.classList.add("hide");
    alert.addEventListener("transitionend", () => {
      alert.remove();
    });
  }, duration);
}

function shakeInputArea() {
  inputArea.classList.add("shake");
  inputArea.addEventListener(
    "animationend",
    () => {
      inputArea.classList.remove("shake");
    },
    { once: true }
  );
}

function getMaxTilesPerLine() {
  // grab the computed width of your input-area (or guess-row container)
  const containerWidth = inputArea.clientWidth;
  // create a dummy tile to measure a single tile’s width+gap
  const dummy = document.createElement("div");
  dummy.className = "input-char";
  dummy.style.visibility = "hidden";
  inputArea.appendChild(dummy);
  const style = getComputedStyle(dummy);
  const tileWidth = dummy.offsetWidth;
  const gap = parseFloat(style.marginRight) || parseFloat(getComputedStyle(inputArea).gap);
  inputArea.removeChild(dummy);
  // how many full (tile + gap) chunks fit?
  return Math.floor((containerWidth + gap) / (tileWidth + gap));
}

function makeGroups(slots) {
  const groups = [];
  let i = 0;
  while (i < slots.length) {
    const group = [];
    // grab everything up to *but not including* the next space
    while (i < slots.length && slots[i].char !== " ") {
      group.push(slots[i]);
      i++;
    }
    // if it *is* a space, include it too, then end the group
    if (i < slots.length && slots[i].char === " ") {
      group.push(slots[i]);
      i++;
    }
    groups.push(group);
  }
  return groups;
}