const STORAGE_KEY = "vocab-loop-player.words";
const SETTINGS_KEY = "vocab-loop-player.settings";
const SEED_IMPORT_KEY = "vocab-loop-player.seed.words-xlsx.v1";
const SEED_WORDS_URL = "seed-words.json";
const WORD_REPETITIONS = 3;
const MAX_MEANING_PARTS = 5;

const elements = {
  wordForm: document.querySelector("#wordForm"),
  wordInput: document.querySelector("#wordInput"),
  meaningInput: document.querySelector("#meaningInput"),
  wordList: document.querySelector("#wordList"),
  currentWord: document.querySelector("#currentWord"),
  currentMeaning: document.querySelector("#currentMeaning"),
  playState: document.querySelector("#playState"),
  wordCounter: document.querySelector("#wordCounter"),
  phaseEnglish: document.querySelector("#phaseEnglish"),
  phaseSpell: document.querySelector("#phaseSpell"),
  phaseChinese: document.querySelector("#phaseChinese"),
  playButton: document.querySelector("#playButton"),
  pauseButton: document.querySelector("#pauseButton"),
  stopButton: document.querySelector("#stopButton"),
  prevButton: document.querySelector("#prevButton"),
  nextButton: document.querySelector("#nextButton"),
  sampleButton: document.querySelector("#sampleButton"),
  exportButton: document.querySelector("#exportButton"),
  clearButton: document.querySelector("#clearButton"),
  rateInput: document.querySelector("#rateInput"),
  rateLabel: document.querySelector("#rateLabel"),
  gapInput: document.querySelector("#gapInput"),
  gapLabel: document.querySelector("#gapLabel"),
  shuffleInput: document.querySelector("#shuffleInput"),
  repeatInput: document.querySelector("#repeatInput"),
  installButton: document.querySelector("#installButton"),
};

const sampleWords = [
  { id: crypto.randomUUID(), word: "curious", meaning: "好奇的" },
  { id: crypto.randomUUID(), word: "steady", meaning: "稳定的；沉着的" },
  { id: crypto.randomUUID(), word: "practice", meaning: "练习；实践" },
];

const state = {
  words: loadWords(),
  currentIndex: 0,
  isPlaying: false,
  isPaused: false,
  playbackId: 0,
  deferredInstallPrompt: null,
};

shortenCurrentMeanings();
restoreSettings();
render();
bindEvents();
importSeedWords();
registerServiceWorker();

function bindEvents() {
  elements.wordForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const word = elements.wordInput.value.trim();
    const meaning = elements.meaningInput.value.trim();

    if (!word || !meaning) return;

    state.words.push({ id: crypto.randomUUID(), word, meaning: simplifyMeaning(meaning) });
    state.currentIndex = state.words.length - 1;
    saveWords();
    render();
    elements.wordForm.reset();
    elements.wordInput.focus();
  });

  elements.playButton.addEventListener("click", () => {
    if (state.isPaused) {
      resumePlayback();
      return;
    }
    startPlayback();
  });

  elements.pauseButton.addEventListener("click", pausePlayback);
  elements.stopButton.addEventListener("click", () => stopPlayback("已停止"));
  elements.prevButton.addEventListener("click", () => moveBy(-1));
  elements.nextButton.addEventListener("click", () => moveBy(1));
  elements.sampleButton.addEventListener("click", addSamples);
  elements.exportButton.addEventListener("click", exportWords);
  elements.clearButton.addEventListener("click", clearWords);

  elements.rateInput.addEventListener("input", () => {
    elements.rateLabel.textContent = `${Number(elements.rateInput.value).toFixed(1)}x`;
    saveSettings();
  });

  elements.gapInput.addEventListener("input", () => {
    elements.gapLabel.textContent = `${(Number(elements.gapInput.value) / 1000).toFixed(1)}s`;
    saveSettings();
  });

  elements.shuffleInput.addEventListener("change", saveSettings);
  elements.repeatInput.addEventListener("change", saveSettings);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    elements.installButton.hidden = false;
  });

  elements.installButton.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    elements.installButton.hidden = true;
  });
}

function loadWords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => item.word && item.meaning) : [];
  } catch {
    return [];
  }
}

function shortenCurrentMeanings() {
  let changed = false;
  state.words = state.words.map((item) => {
    const shortMeaning = simplifyMeaning(item.meaning);
    if (shortMeaning !== item.meaning) changed = true;
    return { ...item, meaning: shortMeaning };
  });

  if (changed) saveWords();
}

function simplifyMeaning(rawMeaning) {
  const cleaned = rawMeaning
    .replace(/\b(?:vt|vi|n|adj|adv|adverb|verb|noun|prep|pron|conj|interj|num|v)\.\s*/gi, "，")
    .replace(/\s+/g, " ")
    .trim();
  const parts = [];
  const seen = new Set();

  cleaned.split(/[，,；;、/]+/).forEach((part) => {
    if (parts.length >= MAX_MEANING_PARTS) return;

    const text = part.trim().replace(/^[ .。:：()（）[\]【】]+|[ .。:：()（）[\]【】]+$/g, "");
    if (!text || !/[\u4e00-\u9fff]/.test(text)) return;

    const key = text.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    parts.push(text);
  });

  return parts.length > 0 ? parts.join("，") : rawMeaning.trim();
}

function saveWords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.words));
}

async function importSeedWords() {
  if (localStorage.getItem(SEED_IMPORT_KEY)) return;

  try {
    const response = await fetch(SEED_WORDS_URL, { cache: "no-store" });
    if (!response.ok) return;

    const seedWords = await response.json();
    if (!Array.isArray(seedWords)) return;

    const existingWords = new Set(state.words.map((item) => item.word.trim().toLowerCase()));
    const additions = seedWords
      .filter((item) => item.word && item.meaning && !existingWords.has(item.word.trim().toLowerCase()))
      .map((item) => ({ id: crypto.randomUUID(), word: item.word.trim(), meaning: simplifyMeaning(item.meaning) }));

    localStorage.setItem(SEED_IMPORT_KEY, String(Date.now()));

    if (additions.length === 0) return;

    state.words.push(...additions);
    if (state.words.length === additions.length) state.currentIndex = 0;
    saveWords();
    elements.playState.textContent = `已导入 ${additions.length} 个单词`;
    render();
  } catch {
    elements.playState.textContent = "可手动添加单词";
  }
}

function restoreSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    if (saved.rate) elements.rateInput.value = saved.rate;
    if (saved.gap) elements.gapInput.value = saved.gap;
    elements.shuffleInput.checked = Boolean(saved.shuffle);
    elements.repeatInput.checked = true;
  } catch {
    elements.repeatInput.checked = true;
  }

  elements.repeatInput.checked = true;
  elements.repeatInput.disabled = true;

  elements.rateLabel.textContent = `${Number(elements.rateInput.value).toFixed(1)}x`;
  elements.gapLabel.textContent = `${(Number(elements.gapInput.value) / 1000).toFixed(1)}s`;
}

function saveSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      rate: elements.rateInput.value,
      gap: elements.gapInput.value,
      shuffle: elements.shuffleInput.checked,
      repeat: true,
    })
  );
}

function render() {
  const hasWords = state.words.length > 0;
  const current = state.words[state.currentIndex];

  elements.currentWord.textContent = current?.word || "添加一个单词开始";
  elements.currentMeaning.textContent = current?.meaning || "英文读音、英文拼写、中文意思会自动循环播放";
  elements.wordCounter.textContent = hasWords ? `${state.currentIndex + 1} / ${state.words.length}` : "0 / 0";
  elements.playButton.disabled = !hasWords;
  elements.pauseButton.disabled = !hasWords || !state.isPlaying;
  elements.stopButton.disabled = !hasWords || !state.isPlaying;
  elements.prevButton.disabled = !hasWords;
  elements.nextButton.disabled = !hasWords;
  elements.exportButton.disabled = !hasWords;
  elements.clearButton.disabled = !hasWords;

  renderWordList();
}

function renderWordList() {
  elements.wordList.innerHTML = "";

  if (state.words.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "还没有单词。可以先点“示例”，或者添加自己的生词。";
    elements.wordList.append(empty);
    return;
  }

  state.words.forEach((item, index) => {
    const row = document.createElement("li");
    row.className = `word-item${index === state.currentIndex ? " is-current" : ""}`;

    const main = document.createElement("div");
    main.className = "word-main";

    const word = document.createElement("strong");
    word.textContent = item.word;

    const meaning = document.createElement("span");
    meaning.textContent = item.meaning;

    const actions = document.createElement("div");
    actions.className = "word-actions";

    const chooseButton = document.createElement("button");
    chooseButton.type = "button";
    chooseButton.textContent = "选中";
    chooseButton.addEventListener("click", () => {
      state.currentIndex = index;
      stopPlayback("准备播放");
      render();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "删";
    deleteButton.addEventListener("click", () => deleteWord(index));

    main.append(word, meaning);
    actions.append(chooseButton, deleteButton);
    row.append(main, actions);
    elements.wordList.append(row);
  });
}

function addSamples() {
  const existing = new Set(state.words.map((item) => item.word.toLowerCase()));
  const newSamples = sampleWords
    .filter((item) => !existing.has(item.word.toLowerCase()))
    .map((item) => ({ ...item, id: crypto.randomUUID() }));

  if (newSamples.length === 0) return;

  state.words.push(...newSamples);
  if (state.words.length === newSamples.length) state.currentIndex = 0;
  saveWords();
  render();
}

function deleteWord(index) {
  state.words.splice(index, 1);
  if (state.currentIndex >= state.words.length) {
    state.currentIndex = Math.max(0, state.words.length - 1);
  }
  saveWords();
  stopPlayback("准备播放");
  render();
}

function clearWords() {
  if (!confirm("确定清空所有单词吗？")) return;
  stopPlayback("准备播放");
  state.words = [];
  state.currentIndex = 0;
  saveWords();
  render();
}

function exportWords() {
  const data = JSON.stringify(state.words, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vocab-loop-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function startPlayback() {
  if (state.words.length === 0) return;

  state.playbackId += 1;
  state.isPlaying = true;
  state.isPaused = false;
  elements.playButton.textContent = "播放中";
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  render();
  runLoop(state.playbackId);
}

async function runLoop(playbackId) {
  while (state.isPlaying && playbackId === state.playbackId && state.words.length > 0) {
    const current = state.words[state.currentIndex];
    render();

    for (let repetition = 1; repetition <= WORD_REPETITIONS; repetition += 1) {
      await playPhase("english", current.word, `英文发音 ${repetition}/${WORD_REPETITIONS}`, "en-US", playbackId);
      await waitBetweenPhases(playbackId);
      await playPhase("spell", spellWord(current.word), `英文拼写 ${repetition}/${WORD_REPETITIONS}`, "en-US", playbackId);
      await waitBetweenPhases(playbackId);
      await playPhase("chinese", current.meaning, `中文意思 ${repetition}/${WORD_REPETITIONS}`, "zh-CN", playbackId);
      await waitBetweenPhases(playbackId);

      if (!state.isPlaying || playbackId !== state.playbackId) return;
    }

    if (!state.isPlaying || playbackId !== state.playbackId) return;

    const wasLast = state.currentIndex >= state.words.length - 1;
    if (elements.shuffleInput.checked) {
      state.currentIndex = getRandomIndex();
    } else {
      state.currentIndex = wasLast ? 0 : state.currentIndex + 1;
    }
  }
}

async function playPhase(phase, text, label, lang, playbackId) {
  if (!state.isPlaying || playbackId !== state.playbackId) return;

  setPhase(phase);
  elements.playState.textContent = label;
  await speak(text, lang, playbackId);
}

function speak(text, lang, playbackId) {
  return new Promise((resolve) => {
    if (!state.isPlaying || playbackId !== state.playbackId) {
      resolve();
      return;
    }

    if (!("speechSynthesis" in window)) {
      window.setTimeout(resolve, 700);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = Number(elements.rateInput.value);
    utterance.pitch = 1;
    utterance.volume = 1;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      resolve();
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);

    window.setTimeout(() => {
      if (!finished && playbackId === state.playbackId) finish();
    }, Math.max(1800, text.length * 260));
  });
}

function waitBetweenPhases(playbackId) {
  return new Promise((resolve) => {
    const timeout = Number(elements.gapInput.value);
    window.setTimeout(() => {
      resolve();
    }, timeout);
  });
}

function pausePlayback() {
  if (!state.isPlaying || state.isPaused) return;
  state.isPlaying = false;
  state.isPaused = true;
  state.playbackId += 1;
  elements.playState.textContent = "已暂停";
  elements.playButton.textContent = "继续";
  setPhase();

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  render();
}

function resumePlayback() {
  startPlayback();
}

function stopPlayback(label = "准备播放") {
  state.isPlaying = false;
  state.isPaused = false;
  state.playbackId += 1;
  elements.playState.textContent = label;
  elements.playButton.textContent = "播放";
  setPhase();

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  render();
}

function moveBy(offset) {
  if (state.words.length === 0) return;
  const nextIndex = state.currentIndex + offset;
  state.currentIndex = (nextIndex + state.words.length) % state.words.length;

  if (state.isPlaying) {
    startPlayback();
  } else {
    render();
  }
}

function getRandomIndex() {
  if (state.words.length <= 1) return 0;
  let nextIndex = state.currentIndex;
  while (nextIndex === state.currentIndex) {
    nextIndex = Math.floor(Math.random() * state.words.length);
  }
  return nextIndex;
}

function spellWord(word) {
  return word.replace(/[^a-zA-Z]/g, "").toUpperCase().split("").join(". ");
}

function setPhase(activePhase) {
  const phaseMap = {
    english: elements.phaseEnglish,
    spell: elements.phaseSpell,
    chinese: elements.phaseChinese,
  };

  Object.values(phaseMap).forEach((item) => item.classList.remove("active"));
  if (activePhase) phaseMap[activePhase].classList.add("active");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      elements.playState.textContent = "可在线使用";
    });
  });
}
