import { saveSubmission } from "../../lib/storage.js";
import { PHOTOS } from "../../config/photos.js";
import { PICK_ACTIONS, LIMITS } from "../../lib/constants.js";

export const prerender = false;

function isValidPayload(p) {
  if (!p || typeof p !== "object") return false;
  if (typeof p.name !== "string" || !p.name.trim()) return false;
  if (!Array.isArray(p.finalPicksInOrder)) return false;
  if (typeof p.whyExplanation !== "string") return false;
  return true;
}

function buildEmailBody(p) {
  const byId = Object.fromEntries(PHOTOS.map((x) => [x.id, x]));
  const src = (id) => (byId[id] || {}).src || id;
  const picks = p.finalPicksInOrder
    .map((id, i) => `  ${i + 1}. ${id} — ${src(id)}`)
    .join("\n") || "  (none)";
  const spp = p.secondsPerScreen || {};
  const dwell = (p.secondsPerPhoto?.duringFreeBrowse) || {};
  const longestId = Object.keys(dwell).sort((a, b) => (dwell[b] || 0) - (dwell[a] || 0))[0];
  const longestSecs = longestId ? dwell[longestId] : 0;
  const undo = (p.selectionEvents || []).filter((e) => e.action === PICK_ACTIONS.UNPICK).length;
  const tileClicks = (p.tileClickEvents || []).map((e) => e.photo).join(", ");
  const dur = (s) => {
    const n = Math.round(s || 0);
    if (n < 60) return n + "s";
    const m = Math.floor(n / 60);
    return m + "m " + (n - m * 60) + "s";
  };
  return [
    `name:     ${p.name}`,
    `opener:   ${p.openerPhoto || "(none)"} — ${src(p.openerPhoto)}`,
    `picks:    ${p.finalPicksInOrder.length} of 3`,
    picks,
    ``,
    `why:`,
    p.whyExplanation || "(empty)",
    ``,
    `--- summary ---`,
    `device:                      ${p.device?.type || "?"} · ${p.device?.viewport || "?"}`,
    `total time:                  ${dur(spp.totalFromStartToSubmit)}`,
    `tile clicks:                 ${p.tileClickEvents?.length || 0}${tileClicks ? " (" + tileClicks + ")" : ""}`,
    `browse all photos (grid):    ${dur(spp.browseAllPhotosGrid)}`,
    `browse all photos (swipe):   ${dur(spp.browseAllPhotosSwipe)}${longestId ? "   longest: " + longestId + " (" + dur(longestSecs) + ")" : ""}`,
    `read instructions:           ${dur(spp.readInstructionsScreen)}`,
    `pick photos:                 ${dur(spp.pickPhotosSwipe)}   seconds until first selection: ${p.secondsUntilFirstSelection || 0}s`,
    `write explanation:           ${dur(spp.writeExplanationScreen)}`,
    `selection events:            ${(p.selectionEvents || []).length}${undo ? " (" + undo + " undo)" : ""}`,
    ``,
    `--- json ---`,
    JSON.stringify(p, null, 2),
  ].join("\n");
}

function envVar(name) {
  if (typeof process !== "undefined" && process.env && process.env[name]) return process.env[name];
  try { return import.meta.env[name]; } catch { return undefined; }
}

async function mirrorToWeb3Forms(payload) {
  const key = envVar("WEB3FORMS_KEY");
  if (!key || key === "YOUR_WEB3FORMS_ACCESS_KEY") return { mirrored: false, reason: "no-key" };
  const form = new FormData();
  form.append("access_key", key);
  form.append("subject", "photo experiment · " + payload.name);
  form.append("from_name", "photo experiment");
  form.append("name", payload.name);
  form.append("message", buildEmailBody(payload));
  const res = await fetch("https://api.web3forms.com/submit", { method: "POST", body: form });
  try {
    const data = await res.json();
    return { mirrored: Boolean(data.success), reason: data.message || null };
  } catch {
    return { mirrored: false, reason: "invalid response" };
  }
}

export async function POST({ request }) {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > LIMITS.MAX_PAYLOAD_BYTES) {
    return new Response(JSON.stringify({ ok: false, error: "payload too large" }), {
      status: 413, headers: { "content-type": "application/json" },
    });
  }
  let payload;
  try { payload = await request.json(); }
  catch { return new Response(JSON.stringify({ ok: false, error: "invalid json" }), { status: 400 }); }
  if (!isValidPayload(payload)) {
    return new Response(JSON.stringify({ ok: false, error: "invalid payload" }), { status: 400 });
  }
  payload.submittedAt = payload.submittedAt || new Date().toISOString();
  const saved = await saveSubmission(payload);
  const mirror = await mirrorToWeb3Forms(payload);
  return new Response(JSON.stringify({ ok: true, saved, mirror }), {
    status: 200, headers: { "content-type": "application/json" },
  });
}
