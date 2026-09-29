import { listSubmissions } from "../../lib/storage.js";
import { isAuthenticated } from "../../lib/auth.js";

export const prerender = false;

export async function GET({ cookies }) {
  if (!isAuthenticated(cookies)) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorised" }), {
      status: 401, headers: { "content-type": "application/json" },
    });
  }
  const submissions = await listSubmissions();
  return new Response(JSON.stringify({ ok: true, submissions }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
