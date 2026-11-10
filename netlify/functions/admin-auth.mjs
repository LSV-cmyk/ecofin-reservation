import { json, makeToken, isAdmin } from "./_shared.mjs";

const cookie = (value, maxAge) =>
  `ecofin_admin=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

export default async (req) => {
  if (req.method === "GET")
    return json({ authenticated: isAdmin(req) });

  if (req.method === "DELETE")
    return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });

  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected)
    return json({ error: "Mot de passe administrateur non configuré sur le serveur." }, 500);

  let body = {};
  try { body = await req.json(); } catch { return json({ error: "Requête invalide." }, 400); }

  if (String(body.password || "") !== expected)
    return json({ error: "Mot de passe incorrect." }, 403);

  return json({ ok: true }, 200, { "Set-Cookie": cookie(makeToken(), 8 * 3600) });
};
