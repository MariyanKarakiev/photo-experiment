// Submission storage. Prefers Vercel Blob when a token is present; falls
// back to a local JSON directory for `astro dev` on your laptop.

import { put, list } from "@vercel/blob";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STORAGE } from "./constants.js";

function envVar(name) {
  if (typeof process !== "undefined" && process.env && process.env[name]) return process.env[name];
  try { return import.meta.env[name]; } catch { return undefined; }
}
const HAS_BLOB = Boolean(envVar("BLOB_READ_WRITE_TOKEN"));
const LOCAL_DIR = fileURLToPath(new URL("../../.local-data/submissions/", import.meta.url));

async function ensureLocalDir() {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
}

function submissionFilename(payload) {
  const stamp = (payload.submittedAt || new Date().toISOString())
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");
  const slug = String(payload.name || "anonymous")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "anonymous";
  const salt = Math.random().toString(36).slice(2, 6);
  return `${STORAGE.SUBMISSION_DIR}/${stamp}__${slug}__${salt}.json`;
}

export async function saveSubmission(payload) {
  const filename = submissionFilename(payload);
  const body = JSON.stringify(payload, null, 2);
  if (HAS_BLOB) {
    const res = await put(filename, body, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
    return { storage: "blob", url: res.url, filename };
  }
  await ensureLocalDir();
  const abs = path.join(LOCAL_DIR, filename.replace(/^submissions\//, ""));
  await fs.writeFile(abs, body, "utf8");
  return { storage: "local", url: abs, filename };
}

export async function listSubmissions() {
  if (HAS_BLOB) {
    const out = [];
    let cursor;
    do {
      const res = await list({ prefix: `${STORAGE.SUBMISSION_DIR}/`, cursor });
      cursor = res.cursor;
      for (const b of res.blobs) {
        const r = await fetch(b.url);
        if (!r.ok) continue;
        try { out.push(await r.json()); } catch {}
      }
    } while (cursor);
    return out.sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  }
  await ensureLocalDir();
  const files = (await fs.readdir(LOCAL_DIR)).filter((f) => f.endsWith(".json"));
  const out = [];
  for (const f of files) {
    try { out.push(JSON.parse(await fs.readFile(path.join(LOCAL_DIR, f), "utf8"))); }
    catch {}
  }
  return out.sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
}
