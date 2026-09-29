// Photos are auto-discovered from `src/assets/alexandra_bw/`.
// Drop new files in that folder, `git push`, Vercel rebuilds, they're live.
// Supported formats: .jpg .jpeg .png .webp (case-insensitive).
//
// Each photo's id is its filename without extension (e.g. "IMG_1544").

const modules = import.meta.glob(
  "../assets/alexandra_bw/*.{jpg,JPG,jpeg,JPEG,png,PNG,webp,WEBP}",
  { eager: true }
);

function entryFromModule(path, mod) {
  const filename = path.split("/").pop();
  const id = filename.replace(/\.[^.]+$/, "");
  // Astro turns image imports into an ImageMetadata object where .src is
  // the resolved (hashed in prod) URL; plain URL modules expose the string
  // as .default directly.
  const def = mod.default;
  const src = typeof def === "string" ? def : def?.src;
  return { id, src };
}

// Alphabetical by id so a new file dropped into the folder falls into a
// stable, predictable slot.
export const PHOTOS = Object.entries(modules)
  .map(([path, mod]) => entryFromModule(path, mod))
  .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

// The photographer's arrangement — order shown on the reveal screen.
// Use filenames without the extension (e.g. "IMG_1548"). Any ids that
// don't match a real file are dropped. If the array is empty or nothing
// matches, the reveal falls back to the natural alphabetical order.
const PHOTOGRAPHER_PICK_INPUT = [];

const validIds = new Set(PHOTOS.map((p) => p.id));
const filteredPick = PHOTOGRAPHER_PICK_INPUT.filter((id) => validIds.has(id));
export const PHOTOGRAPHER_PICK = filteredPick.length
  ? filteredPick
  : PHOTOS.map((p) => p.id);

// Web3Forms access key (public, safe to ship). Register one at web3forms.com.
// Submissions arrive as email to the address tied to the key.
export const WEB3FORMS_KEY = "YOUR_WEB3FORMS_ACCESS_KEY";

// Bump when the telemetry payload shape changes so old submissions can be
// distinguished from new ones during analysis.
export const TELEMETRY_VERSION = 1;

// Copy — change this to whatever the title screen should read.
export const TITLE_LINES = ["look.", "choose.", "say why."];
export const TITLE_SUB = "a small experiment";

// The brief that appears after the free-look stage, before selection.
export const BRIEF_LINES = [
  "select up to 3 photos you liked.",
  "do not overthink it.",
  "trust your gut.",
];
export const BRIEF_SUB = "tap to continue";
