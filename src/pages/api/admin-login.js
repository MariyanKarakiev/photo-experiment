import { isPasswordCorrect, setAuthCookie, clearAuthCookie } from "../../lib/auth.js";

export const prerender = false;

export async function POST({ request, cookies, redirect }) {
  const form = await request.formData();
  const password = form.get("password");
  if (password && isPasswordCorrect(password)) {
    setAuthCookie(cookies);
    return redirect("/admin", 303);
  }
  return redirect("/admin/login?e=1", 303);
}

export async function GET({ cookies, redirect }) {
  clearAuthCookie(cookies);
  return redirect("/admin/login", 303);
}
