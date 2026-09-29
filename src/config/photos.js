// Photos as uploaded — this is the natural order shown in stage 1 (look).
export const PHOTOS = [
  { id: "p1", src: "/photos/IMG_1544.JPG" },
  { id: "p2", src: "/photos/IMG_1545.JPG" },
  { id: "p3", src: "/photos/IMG_1546.JPG" },
  { id: "p4", src: "/photos/IMG_1547.JPG" },
  { id: "p5", src: "/photos/IMG_1548.JPG" },
  { id: "p6", src: "/photos/IMG_1549.JPG" },
  { id: "p7", src: "/photos/IMG_1550.JPG" },
  { id: "p8", src: "/photos/IMG_1551.JPG" },
  { id: "p9", src: "/photos/IMG_1553.JPG" },
];

// The photographer's arrangement — order shown on the reveal.
// Edit this array to change what viewers see at the end.
export const PHOTOGRAPHER_PICK = ["p5", "p9", "p1", "p7", "p4", "p3", "p6", "p8", "p2"];

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
