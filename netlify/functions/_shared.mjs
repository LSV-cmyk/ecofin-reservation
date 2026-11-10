import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual } from "node:crypto";

export const CATEGORIES = [
  ["01","Courtage en financement"],["02","Notariat"],["03","Agence immobilière"],
  ["04","Promotion immobilière"],["05","Construction de maisons individuelles"],
  ["06","Lotisseur et aménageur foncier"],["07","Architecture"],
  ["08","Bureau d’études techniques"],["09","Géomètre-expert"],
  ["10","Diagnostic immobilier"],["11","Expertise bâtiment"],
  ["12","Maçonnerie et gros œuvre"],["13","Électricité"],
  ["14","Plomberie et sanitaire"],["15","Menuiserie et fermetures"],
  ["16","Entreprise de rénovation"],["17","Couverture et étanchéité"],
  ["18","Pisciniste"],["19","Paysagiste et aménagement extérieur"]
];

/* Métiers déjà attribués hors candidature en ligne */
export const PREASSIGNED = { "01": true, "14": true };

export const store = () => getStore({ name: "ecofin", consistency: "strong" });

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8",
               "Cache-Control": "no-store", ...headers }
  });

const secret = () => process.env.ADMIN_PASSWORD || "";

export function makeToken() {
  const exp = Date.now() + 8 * 3600 * 1000;
  const sig = createHmac("sha256", secret()).update(String(exp)).digest("hex");
  return `${exp}.${sig}`;
}

export function validToken(token) {
  if (!token || !secret()) return false;
  const [exp, sig] = String(token).split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = createHmac("sha256", secret()).update(exp).digest("hex");
  const a = Buffer.from(sig, "hex"), b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function cookieFrom(req) {
  const raw = req.headers.get("cookie") || "";
  const hit = raw.split(";").map(s => s.trim()).find(s => s.startsWith("ecofin_admin="));
  return hit ? decodeURIComponent(hit.slice("ecofin_admin=".length)) : "";
}

export const isAdmin = req => validToken(cookieFrom(req));

export async function readApplications() {
  const data = await store().get("applications", { type: "json" });
  return Array.isArray(data) ? data : [];
}

export const writeApplications = list => store().setJSON("applications", list);

/* Statut public d'une catégorie, déduit des candidatures */
export function categoryStatuses(apps) {
  return CATEGORIES.map(([id, name]) => {
    if (PREASSIGNED[id]) return { id, name, status: "reserved" };
    const mine = apps.filter(a => a.categoryId === id);
    if (mine.some(a => a.status === "confirmed")) return { id, name, status: "reserved" };
    const live = ["pending_review","option_48h","accepted","contract_sent",
                  "awaiting_signature","awaiting_payment"];
    if (mine.some(a => live.includes(a.status))) return { id, name, status: "pending" };
    return { id, name, status: "available" };
  });
}

export const clean = (v, max = 300) => String(v ?? "").trim().slice(0, max);
