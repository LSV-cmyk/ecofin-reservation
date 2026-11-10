import { json, isAdmin, readApplications, writeApplications,
         categoryStatuses, clean } from "./_shared.mjs";

const PENDING   = ["pending_review","option_48h"];
const FOLLOWUP  = ["accepted","contract_sent","awaiting_signature","awaiting_payment"];
const ALLOWED   = [...PENDING, ...FOLLOWUP, "confirmed","rejected","withdrawn","expired"];

export default async (req) => {
  if (!isAdmin(req)) return json({ error: "Non authentifié." }, 401);

  const apps = await readApplications();

  if (req.method === "GET") {
    const sorted = [...apps].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json({
      applications: sorted,
      categories: categoryStatuses(apps),
      counts: {
        total: apps.length,
        pending:   apps.filter(a => PENDING.includes(a.status)).length,
        followup:  apps.filter(a => FOLLOWUP.includes(a.status)).length,
        confirmed: apps.filter(a => a.status === "confirmed").length
      }
    });
  }

  if (req.method === "PATCH") {
    let body = {};
    try { body = await req.json(); } catch { return json({ error: "Requête invalide." }, 400); }

    const item = apps.find(a => a.id === body.id);
    if (!item) return json({ error: "Candidature introuvable." }, 404);

    if (body.status !== undefined) {
      if (!ALLOWED.includes(body.status)) return json({ error: "Statut inconnu." }, 400);
      if (body.status === "confirmed") {
        const clash = apps.find(a => a.id !== item.id &&
                                     a.categoryId === item.categoryId &&
                                     a.status === "confirmed");
        if (clash) return json({ error: "Ce métier est déjà confirmé pour " + clash.company + "." }, 409);
      }
      item.status = body.status;
    }
    if (body.adminNotes !== undefined) item.adminNotes = clean(body.adminNotes, 2000);
    if (body.sumupUrl   !== undefined) item.sumupUrl   = clean(body.sumupUrl, 300);
    if (body.price      !== undefined) {
      const p = Number(body.price);
      if (Number.isFinite(p) && p >= 0 && p <= 10000) item.price = p;
    }
    item.updatedAt = new Date().toISOString();

    await writeApplications(apps);
    return json({ ok: true, application: item, categories: categoryStatuses(apps) });
  }

  return json({ error: "Méthode non autorisée." }, 405);
};
