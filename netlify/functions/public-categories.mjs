import { json, readApplications, categoryStatuses } from "./_shared.mjs";

export default async () => {
  const apps = await readApplications();
  return json({ categories: categoryStatuses(apps) });
};
