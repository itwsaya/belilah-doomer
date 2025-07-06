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
          updateKeyboardColor(guessArr[idx], state);
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

  for (let i = 0; i < slots.length; i++) {
    if (!slots[i].isGrammar) {
      guessLetters.push(guessArr[i]);
      targetLetters.push(targetArr[i]);
    }
  }

  const letterStates = Array(guessLetters.length).fill("");
  const usedTarget = Array(targetLetters.length).fill(false);
  for (let i = 0; i < guessLetters.length; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      letterStates[i] = "correct";
      usedTarget[i] = true;
    }
  }
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
      updateKeyboardColor(guessArr[i], letterStates[letterIdx]);
      letterIdx++;
    }
  }
  return result;
}

function updateKeyboardColor(letter, state) {
  const key = keyboard.querySelector(`[data-key="${letter}"]`);
  if (!key) return;
  if (state === "correct") {
    key.classList.remove("wrong", "wrong-location");
    key.classList.add("correct");
  } else if (state === "wrong-location") {
    if (!key.classList.contains("correct")) {
      key.classList.remove("wrong");
      key.classList.add("wrong-location");
    }
  } else if (state === "wrong") {
    if (!key.classList.contains("correct") && !key.classList.contains("wrong-location")) {
      key.classList.add("wrong");
    }
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
