// Photos are auto-discovered from two folders:
//
//   src/assets/alexandra_bw/         — the series shown in the gallery
//                                      (order in the gallery is RANDOMISED
//                                      per visit — see app.js)
//   src/assets/photographers_pick/   — the photographer's curated pick,
//                                      rendered on the reveal screen in
//                                      alphabetical filename order (prefix
//                                      files with 01-, 02-, … to control
//                                      sequence)
//
// Drop / rename / delete files in either folder, `git push`, Vercel
// rebuilds and the site updates.
//
// Each photo's id is its filename without extension.

const galleryModules = import.meta.glob(
  "../assets/alexandra_bw/*.{jpg,JPG,jpeg,JPEG,png,PNG,webp,WEBP}",
  { eager: true }
);
const pickModules = import.meta.glob(
  "../assets/photographers_pick/*.{jpg,JPG,jpeg,JPEG,png,PNG,webp,WEBP}",
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

function loadFolder(modules) {
  return Object.entries(modules)
    .map(([path, mod]) => entryFromModule(path, mod))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

// Alphabetical (numeric-aware) so `01-`, `02-`, … prefixes drive the order.
// The gallery UI shuffles this at runtime; only the reveal cares about the
// literal sort of the pick folder.
export const PHOTOS = loadFolder(galleryModules);

const pickEntries = loadFolder(pickModules);

// If the photographers_pick folder is empty, fall back to the gallery so
// the reveal is never blank.
export const PHOTOGRAPHER_PICK = pickEntries.length ? pickEntries : PHOTOS;

// Web3Forms access key (public, safe to ship). Register one at web3forms.com.
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
