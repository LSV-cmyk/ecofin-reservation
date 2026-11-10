import { json, readApplications, writeApplications, CATEGORIES,
         categoryStatuses, clean } from "./_shared.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  let body = {};
  try { body = await req.json(); } catch { return json({ error: "Requête invalide." }, 400); }

  if (clean(body["bot-field"])) return json({ ok: true });           // piège à robots

  const categoryId = clean(body.categoryId || body["metier-candidature"], 2);
  const found = CATEGORIES.find(c => c[0] === categoryId);
  if (!found) return json({ error: "Métier inconnu." }, 400);

  const apps = await readApplications();
  const st = categoryStatuses(apps).find(c => c.id === categoryId);
  if (st.status === "reserved")
    return json({ error: "Ce métier n’est plus disponible." }, 409);

  const siret = clean(body.siret, 20).replace(/\s/g, "");
  const email = clean(body["email-professionnel"], 160);
  if (!/^\d{14}$/.test(siret)) return json({ error: "SIRET invalide." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "E-mail invalide." }, 400);

  const company = clean(body["raison-sociale"], 120);
  if (!company) return json({ error: "Raison sociale manquante." }, 400);

  if (apps.some(a => a.siret === siret && a.categoryId === categoryId &&
                     !["rejected","withdrawn","expired"].includes(a.status)))
    return json({ error: "Une candidature est déjà enregistrée pour cette entreprise." }, 409);

  const now = new Date().toISOString();
  const entry = {
    id: "ECO-" + Date.now().toString(36).toUpperCase(),
    company, siret,
    representative: clean(body.representant, 120),
    role: clean(body["qualite-representant"], 80),
    email, phone: clean(body.telephone, 30),
    categoryId, categoryName: found[1],
    extraMessage: clean(body["message-complementaire"], 1200),
    price: Number(clean(body["tarif-affiche"], 6).replace(/[^\d]/g, "")) || 550,
    status: "pending_review",
    adminNotes: "", sumupUrl: "",
    createdAt: now, updatedAt: now
  };

  apps.push(entry);
  await writeApplications(apps);
  return json({ ok: true, id: entry.id, categories: categoryStatuses(apps) }, 201);
};
