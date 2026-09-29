// Single source of truth for enum values, thresholds and other constants.
// Anywhere the code would otherwise use a raw string or unexplained number,
// it references one of these instead.

export const STEPS = Object.freeze({
  TITLE:  "title",
  NAME:   "name",
  LOOK:   "look",
  SWIPE:  "swipe",
  BRIEF:  "brief",
  CHOOSE: "choose",
  WHY:    "why",
  REVEAL: "reveal",
});

export const PICK_ACTIONS = Object.freeze({
  PICK:   "pick",
  UNPICK: "unpick",
});

export const DEVICE_TYPES = Object.freeze({
  DESKTOP: "desktop",
  MOBILE:  "mobile",
  TABLET:  "tablet",
  UNKNOWN: "unknown",
});

// Internal step key → plain-English payload key. Anything that ships to the
// admin dashboard or the JSON payload uses the value on the right.
export const PAYLOAD_SCREEN_NAMES = Object.freeze({
  [STEPS.LOOK]:   "browseAllPhotosGrid",
  [STEPS.SWIPE]:  "browseAllPhotosSwipe",
  [STEPS.BRIEF]:  "readInstructionsScreen",
  [STEPS.CHOOSE]: "pickPhotosSwipe",
  [STEPS.WHY]:    "writeExplanationScreen",
});

export const LIMITS = Object.freeze({
  MAX_PICKS: 3,
  EVENT_CAP: 500,
  MAX_PAYLOAD_BYTES: 300 * 1024,
  SWIPE_MIN_DISTANCE_PX: 40,
});

export const STORAGE = Object.freeze({
  LOCAL_KEY:      "photo-experiment/state/v1",
  ADMIN_COOKIE:   "pe_admin",
  SUBMISSION_DIR: "submissions",
  DEFAULT_ADMIN_COOKIE_MAX_AGE_SEC: 60 * 60 * 24 * 7, // 7 days
});

// Values used by the adaptive tile grid layout. Kept here so nobody has to
// wonder what 0.92 / 0.72 mean when they land in fitGrid().
export const GRID_LAYOUT = Object.freeze({
  TILE_ASPECT_W_OVER_H:    2 / 3,
  TILE_GAP_PX:             6,
  VIEWPORT_WIDTH_FRACTION: 0.92,
  VIEWPORT_HEIGHT_FRACTION: 0.72,
});

// Breakpoint in px. CSS `@media` can't read JS, so the same value is also
// stated in the top of `global.css` and every media query lines up with it.
export const BREAKPOINT_MOBILE_PX = 720;
