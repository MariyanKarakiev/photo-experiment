import { PHOTOS, PHOTOGRAPHER_PICK, TELEMETRY_VERSION } from "../config/photos.js";
import {
  STEPS,
  PICK_ACTIONS,
  DEVICE_TYPES,
  PAYLOAD_SCREEN_NAMES,
  LIMITS,
  STORAGE,
  GRID_LAYOUT,
  BREAKPOINT_MOBILE_PX,
} from "../lib/constants.js";

const N = PHOTOS.length;

const state = {
  step: STEPS.TITLE,
  name: "",
  opener: null,
  currentIdx: 0,
  viewed: new Set(),
  selected: [],
  why: "",
  submitted: false,
};

const el = {};
const screens = {};

/* ---------- utilities ---------- */

function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function pad(n) { return String(n).padStart(2, "0"); }
function now() { return performance.now(); }
function ms2s(ms) { return Math.max(0, Math.round((ms || 0) / 1000)); }
function randomId(n = 8) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < n; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function savePersisted(patch) {
  const prev = loadPersisted();
  const next = { ...prev, ...patch };
  try { localStorage.setItem(STORAGE.LOCAL_KEY, JSON.stringify(next)); } catch {}
}
function loadPersisted() {
  try { return JSON.parse(localStorage.getItem(STORAGE.LOCAL_KEY) || "{}"); }
  catch { return {}; }
}

/* ---------- telemetry ---------- */

const telemetry = {
  sessionId: randomId(8),
  bootAt: now(),
  device: detectDevice(),

  screenEnteredAt: null,
  screenKey: null,
  msPerScreen: {
    [STEPS.LOOK]:   0,
    [STEPS.SWIPE]:  0,
    [STEPS.BRIEF]:  0,
    [STEPS.CHOOSE]: 0,
    [STEPS.WHY]:    0,
  },

  photoScreenKey: null, // STEPS.SWIPE or STEPS.CHOOSE
  photoStartedAt: null,
  photoId: null,
  msPerPhoto: { [STEPS.SWIPE]: {}, [STEPS.CHOOSE]: {} },

  chooseEnteredAt: null,
  firstSelectionMs: null,
  tileClickEvents: [],
  selectionEvents: [],
  submittedAt: null,

  markScreenEnter(step) {
    this.markScreenLeave();
    if (PAYLOAD_SCREEN_NAMES[step]) {
      this.screenKey = step;
      this.screenEnteredAt = now();
    } else {
      this.screenKey = null;
      this.screenEnteredAt = null;
    }
    if (step === STEPS.CHOOSE && this.chooseEnteredAt == null) {
      this.chooseEnteredAt = now();
    }
  },

  markScreenLeave() {
    if (this.screenKey && this.screenEnteredAt != null) {
      this.msPerScreen[this.screenKey] += Math.max(0, now() - this.screenEnteredAt);
    }
    this.screenKey = null;
    this.screenEnteredAt = null;
  },

  markPhotoEnter(screenKey, photoId) {
    this.markPhotoLeave();
    this.photoScreenKey = screenKey;
    this.photoStartedAt = now();
    this.photoId = photoId;
  },

  markPhotoLeave() {
    if (this.photoScreenKey && this.photoId && this.photoStartedAt != null) {
      const bucket = this.msPerPhoto[this.photoScreenKey];
      bucket[this.photoId] = (bucket[this.photoId] || 0) + Math.max(0, now() - this.photoStartedAt);
    }
    this.photoScreenKey = null;
    this.photoStartedAt = null;
    this.photoId = null;
  },

  logTileClick(photoId) {
    if (this.tileClickEvents.length >= LIMITS.EVENT_CAP) return;
    this.tileClickEvents.push({
      atSecond: ms2s(now() - this.bootAt),
      photo: photoId,
    });
  },

  logSelection(action, photoId) {
    if (this.selectionEvents.length >= LIMITS.EVENT_CAP) return;
    const chooseStart = this.chooseEnteredAt != null ? this.chooseEnteredAt : this.bootAt;
    const atSecond = ms2s(now() - chooseStart);
    if (this.firstSelectionMs == null && action === PICK_ACTIONS.PICK) {
      this.firstSelectionMs = now() - chooseStart;
    }
    this.selectionEvents.push({ atSecond, action, photo: photoId });
  },

  snapshot() {
    this.markPhotoLeave();
    this.markScreenLeave();
    const totalMs = now() - this.bootAt;

    const secondsPerScreen = {};
    for (const [internal, payloadName] of Object.entries(PAYLOAD_SCREEN_NAMES)) {
      secondsPerScreen[payloadName] = ms2s(this.msPerScreen[internal]);
    }
    secondsPerScreen.totalFromStartToSubmit = ms2s(totalMs);

    const bucket = (b) => {
      const out = {};
      for (const p of PHOTOS) out[p.id] = ms2s(b[p.id] || 0);
      return out;
    };

    return {
      telemetryVersion: TELEMETRY_VERSION,
      sessionId: this.sessionId,
      submittedAt: this.submittedAt || new Date().toISOString(),
      device: this.device,
      secondsPerScreen,
      secondsPerPhoto: {
        duringFreeBrowse: bucket(this.msPerPhoto[STEPS.SWIPE]),
        duringSelection:  bucket(this.msPerPhoto[STEPS.CHOOSE]),
      },
      secondsUntilFirstSelection: this.firstSelectionMs != null ? ms2s(this.firstSelectionMs) : null,
      tileClickEvents: this.tileClickEvents,
      selectionEvents: this.selectionEvents,
    };
  },
};

function detectDevice() {
  if (typeof navigator === "undefined") {
    return { type: DEVICE_TYPES.UNKNOWN, viewport: "?", userAgent: "" };
  }
  const ua = navigator.userAgent || "";
  const w = window.innerWidth;
  const coarse = matchMedia("(pointer: coarse)").matches;
  let type = DEVICE_TYPES.DESKTOP;
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) type = DEVICE_TYPES.TABLET;
  else if (/Mobi|iPhone|Android/i.test(ua)) type = DEVICE_TYPES.MOBILE;
  else if (coarse && w < BREAKPOINT_MOBILE_PX + 180) type = DEVICE_TYPES.MOBILE;
  else if (coarse) type = DEVICE_TYPES.TABLET;
  return { type, viewport: w + "x" + window.innerHeight, userAgent: ua };
}

/* ---------- navigation ---------- */

function go(step) {
  telemetry.markScreenEnter(step);
  state.step = step;
  Object.entries(screens).forEach(([k, node]) => {
    node.classList.toggle("on", k === step);
  });
  if (el.restart) el.restart.classList.toggle("visible", step !== STEPS.TITLE);
  const focusOn = {
    [STEPS.NAME]: () => el.nameInput?.focus(),
    [STEPS.WHY]:  () => el.whyInput?.focus(),
  }[step];
  if (focusOn) setTimeout(focusOn, 520);

  if (step === STEPS.SWIPE) {
    telemetry.markPhotoEnter(STEPS.SWIPE, PHOTOS[state.currentIdx].id);
  } else if (step === STEPS.CHOOSE) {
    telemetry.markPhotoEnter(STEPS.CHOOSE, PHOTOS[state.currentIdx].id);
  } else {
    telemetry.markPhotoLeave();
  }

  if (step === STEPS.LOOK) updateGridReady();
}

function restart() {
  try { localStorage.removeItem(STORAGE.LOCAL_KEY); } catch {}
  window.location.reload();
}

/* ---------- title ---------- */

function initTitle() {
  const screen = screens[STEPS.TITLE];
  const advance = () => go(STEPS.NAME);
  screen.addEventListener("click", advance, { once: true });
  document.addEventListener("keydown", function onKey(e) {
    if (state.step !== STEPS.TITLE) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      document.removeEventListener("keydown", onKey);
      advance();
    }
  });
}

/* ---------- brief ---------- */

function initBrief() {
  const screen = screens[STEPS.BRIEF];
  const advance = () => {
    state.currentIdx = 0;
    renderChoose();
    go(STEPS.CHOOSE);
  };
  screen.addEventListener("click", () => {
    if (state.step === STEPS.BRIEF) advance();
  });
  document.addEventListener("keydown", (e) => {
    if (state.step !== STEPS.BRIEF) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); advance(); }
  });
}

/* ---------- name ---------- */

function initName() {
  el.nameInput = $("#name-input");
  el.nameConfirm = $("#name-confirm");
  const validate = () => {
    el.nameConfirm.disabled = el.nameInput.value.trim().length === 0;
  };
  el.nameInput.addEventListener("input", validate);
  el.nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !el.nameConfirm.disabled) { e.preventDefault(); confirmName(); }
  });
  el.nameConfirm.addEventListener("click", confirmName);
  validate();
}
function confirmName() {
  const v = el.nameInput.value.trim();
  if (!v) return;
  state.name = v;
  savePersisted({ name: v });
  go(STEPS.LOOK);
}

/* ---------- look (adaptive grid + free-return) ---------- */

function initLook() {
  el.tileRow = $("#tile-row");
  el.lookCaption = $("#look-caption");
  el.lookReady = $("#look-ready");
  $$(".tile", el.tileRow).forEach((tile, idx) => {
    tile.addEventListener("click", () => onTileClick(idx));
    tile.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTileClick(idx); }
    });
  });
  el.lookReady.addEventListener("click", () => {
    if (state.viewed.size >= N) go(STEPS.BRIEF);
  });
  fitGrid();
  window.addEventListener("resize", fitGrid);
  updateGridReady();
}

function onTileClick(idx) {
  const p = PHOTOS[idx];
  telemetry.logTileClick(p.id);
  if (state.opener == null) {
    state.opener = p.id;
    savePersisted({ opener: state.opener });
  }
  state.currentIdx = idx;
  renderSwipe();
  go(STEPS.SWIPE);
}

function updateGridReady() {
  if (!el.lookReady || !el.lookCaption) return;
  const done = state.viewed.size >= N;
  el.lookReady.classList.toggle("visible", done);
  el.lookCaption.classList.toggle("hidden", done);
}

function fitGrid() {
  const availW = window.innerWidth * GRID_LAYOUT.VIEWPORT_WIDTH_FRACTION;
  const availH = window.innerHeight * GRID_LAYOUT.VIEWPORT_HEIGHT_FRACTION;
  const gap = GRID_LAYOUT.TILE_GAP_PX;
  const AR = GRID_LAYOUT.TILE_ASPECT_W_OVER_H;
  let bestCols = 3, bestSize = 0;
  for (let cols = 1; cols <= N; cols++) {
    const rows = Math.ceil(N / cols);
    const tileW = Math.min(
      (availW - (cols - 1) * gap) / cols,
      ((availH - (rows - 1) * gap) / rows) * AR
    );
    if (tileW > bestSize) { bestSize = tileW; bestCols = cols; }
  }
  const gridWidth = bestSize * bestCols + (bestCols - 1) * gap;
  document.documentElement.style.setProperty("--cols", bestCols);
  document.documentElement.style.setProperty("--grid-width", gridWidth + "px");
}

/* ---------- swipe (stage 1) ---------- */

function initSwipe() {
  el.swipeImg = $("#swipe-img");
  el.swipeIdx = $("#swipe-idx");
  el.swipePrev = $("#swipe-prev");
  el.swipeNext = $("#swipe-next");
  el.readyBtn = $("#ready-btn");
  el.closeBtn = $("#close-btn");

  el.swipePrev.addEventListener("click", () => swipeTo(state.currentIdx - 1));
  el.swipeNext.addEventListener("click", () => swipeTo(state.currentIdx + 1));
  el.readyBtn.addEventListener("click", () => {
    if (state.viewed.size >= N) go(STEPS.BRIEF);
  });
  el.closeBtn.addEventListener("click", closeSwipe);

  attachSwipeGestures($("#swipe-frame"), {
    onPrev: () => swipeTo(state.currentIdx - 1),
    onNext: () => swipeTo(state.currentIdx + 1),
  });
  attachKeyNav(STEPS.SWIPE, {
    left:   () => swipeTo(state.currentIdx - 1),
    right:  () => swipeTo(state.currentIdx + 1),
    escape: closeSwipe,
    enter:  () => { if (!el.readyBtn.disabled) el.readyBtn.click(); },
  });
}

function swipeTo(idx) {
  const next = ((idx % N) + N) % N;
  state.currentIdx = next;
  renderSwipe();
  telemetry.markPhotoEnter(STEPS.SWIPE, PHOTOS[state.currentIdx].id);
}

function renderSwipe() {
  const p = PHOTOS[state.currentIdx];
  el.swipeImg.src = p.src;
  el.swipeIdx.textContent = pad(state.currentIdx + 1) + " / " + pad(N);
  state.viewed.add(state.currentIdx);
  const seenAll = state.viewed.size >= N;
  el.readyBtn.classList.toggle("visible", seenAll);
  el.readyBtn.disabled = !seenAll;
}

function closeSwipe() {
  telemetry.markPhotoLeave();
  updateGridReady();
  go(STEPS.LOOK);
}

/* ---------- choose (stage 2) ---------- */

function initChoose() {
  el.chooseImg = $("#choose-img");
  el.chooseIdx = $("#choose-idx");
  el.choosePrev = $("#choose-prev");
  el.chooseNext = $("#choose-next");
  el.pickWord = $("#pick-word");
  el.chooseCounter = $("#choose-counter");
  el.doneBtn = $("#done-btn");

  el.choosePrev.addEventListener("click", () => chooseSwipeTo(state.currentIdx - 1));
  el.chooseNext.addEventListener("click", () => chooseSwipeTo(state.currentIdx + 1));
  el.pickWord.addEventListener("click", togglePick);
  el.doneBtn.addEventListener("click", () => {
    if (state.selected.length === 0) return;
    go(STEPS.WHY);
  });

  attachSwipeGestures($("#choose-frame"), {
    onPrev: () => chooseSwipeTo(state.currentIdx - 1),
    onNext: () => chooseSwipeTo(state.currentIdx + 1),
  });
  attachKeyNav(STEPS.CHOOSE, {
    left:  () => chooseSwipeTo(state.currentIdx - 1),
    right: () => chooseSwipeTo(state.currentIdx + 1),
    space: (e) => { e.preventDefault(); togglePick(); },
    enter: () => { if (!el.doneBtn.disabled) el.doneBtn.click(); },
  });
}

function chooseSwipeTo(idx) {
  const next = ((idx % N) + N) % N;
  state.currentIdx = next;
  renderChoose();
  telemetry.markPhotoEnter(STEPS.CHOOSE, PHOTOS[state.currentIdx].id);
}

function togglePick() {
  const p = PHOTOS[state.currentIdx];
  const idx = state.selected.indexOf(p.id);
  if (idx >= 0) {
    state.selected.splice(idx, 1);
    telemetry.logSelection(PICK_ACTIONS.UNPICK, p.id);
  } else if (state.selected.length < LIMITS.MAX_PICKS) {
    state.selected.push(p.id);
    telemetry.logSelection(PICK_ACTIONS.PICK, p.id);
  }
  renderChoose();
}

function renderChoose() {
  const p = PHOTOS[state.currentIdx];
  el.chooseImg.src = p.src;
  el.chooseIdx.textContent = pad(state.currentIdx + 1) + " / " + pad(N);
  const picked = state.selected.includes(p.id);
  el.pickWord.textContent = picked ? "selected" : "select";
  el.pickWord.classList.toggle("selected", picked);
  el.chooseCounter.textContent = state.selected.length + " / " + LIMITS.MAX_PICKS + " chosen";
  el.doneBtn.disabled = state.selected.length === 0;
}

/* ---------- why ---------- */

function initWhy() {
  el.whyInput = $("#why-input");
  el.submitBtn = $("#submit-btn");
  el.status = $("#submit-status");
  const validate = () => {
    el.submitBtn.disabled = el.whyInput.value.trim().length === 0;
  };
  el.whyInput.addEventListener("input", validate);
  el.submitBtn.addEventListener("click", submit);
  validate();
}

async function submit() {
  if (state.submitted) return;
  const why = el.whyInput.value.trim();
  if (!why) return;
  state.why = why;
  el.submitBtn.disabled = true;
  el.status.textContent = "sending…";

  telemetry.submittedAt = new Date().toISOString();
  const snapshot = telemetry.snapshot();
  const payload = {
    ...snapshot,
    name: state.name,
    openerPhoto: state.opener,
    finalPicksInOrder: state.selected.slice(),
    whyExplanation: why,
  };

  try {
    await postSubmission(payload);
    state.submitted = true;
    savePersisted({ submitted: true, name: state.name, opener: state.opener, selected: state.selected, why });
    go(STEPS.REVEAL);
  } catch (err) {
    console.error(err);
    el.status.textContent = "something went wrong · try again";
    el.submitBtn.disabled = false;
  }
}

async function postSubmission(payload) {
  const res = await fetch("/api/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = "http " + res.status;
    try { const d = await res.json(); if (d.error) msg = d.error; } catch {}
    throw new Error(msg);
  }
}

/* ---------- reveal ---------- */

function initReveal() {
  const row = $("#reveal-row");
  const byId = Object.fromEntries(PHOTOS.map((p) => [p.id, p]));
  PHOTOGRAPHER_PICK.forEach((id) => {
    const p = byId[id];
    if (!p) return;
    const tile = document.createElement("div");
    tile.className = "tile";
    const img = document.createElement("img");
    img.src = p.src;
    img.alt = "";
    tile.appendChild(img);
    row.appendChild(tile);
  });
}

/* ---------- gesture / key helpers ---------- */

function attachSwipeGestures(node, { onPrev, onNext }) {
  let startX = null, startY = null;
  node.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  node.addEventListener("touchend", (e) => {
    if (startX == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    startX = startY = null;
    if (Math.abs(dx) < LIMITS.SWIPE_MIN_DISTANCE_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) onNext(); else onPrev();
  });
}
function attachKeyNav(scope, handlers) {
  document.addEventListener("keydown", (e) => {
    if (state.step !== scope) return;
    if (e.key === "ArrowLeft" && handlers.left) { e.preventDefault(); handlers.left(e); }
    else if (e.key === "ArrowRight" && handlers.right) { e.preventDefault(); handlers.right(e); }
    else if (e.key === " " && handlers.space) { handlers.space(e); }
    else if (e.key === "Enter" && handlers.enter) { e.preventDefault(); handlers.enter(e); }
    else if (e.key === "Escape" && handlers.escape) { e.preventDefault(); handlers.escape(e); }
  });
}

/* ---------- boot ---------- */

function boot() {
  screens[STEPS.TITLE]  = $("#screen-title");
  screens[STEPS.NAME]   = $("#screen-name");
  screens[STEPS.LOOK]   = $("#screen-look");
  screens[STEPS.SWIPE]  = $("#screen-swipe");
  screens[STEPS.BRIEF]  = $("#screen-brief");
  screens[STEPS.CHOOSE] = $("#screen-choose");
  screens[STEPS.WHY]    = $("#screen-why");
  screens[STEPS.REVEAL] = $("#screen-reveal");

  el.restart = $("#restart");
  el.restart.addEventListener("click", restart);

  initTitle();
  initName();
  initLook();
  initSwipe();
  initBrief();
  initChoose();
  initWhy();
  initReveal();

  const persisted = loadPersisted();
  if (persisted.submitted) {
    Object.assign(state, persisted);
    go(STEPS.REVEAL);
  } else {
    go(STEPS.TITLE);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
