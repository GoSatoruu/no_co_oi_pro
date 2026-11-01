/** Nạp content khi chơi offline (FE-002: có bộ nhớ đệm và giữ đầy đủ opening/openingProfiles). */
const FILES = ['modes', 'levels', 'rules', 'pools', 'defects', 'accounts'];
const TEMPLATES = ['sales', 'purchases', 'cash_bank', 'corporate'];

let cachedBundle = null;

export async function loadBundle({ forceReload = false } = {}) {
  if (cachedBundle && !forceReload) {
    return cachedBundle;
  }
  const base = new URL('../content/', window.location.href);
  const get = async (p) => {
    const res = await fetch(new URL(p, base));
    if (!res.ok) throw new Error(`Không đọc được ${p}`);
    return res.json();
  };
  const raw = Object.fromEntries(await Promise.all(FILES.map(async f => [f, await get(`${f}.json`)])));
  const templates = (await Promise.all(TEMPLATES.map(f => get(`doc_templates/${f}.json`)))).flatMap(t => t.templates);
  cachedBundle = {
    ...raw,
    modes: raw.modes.modes,
    levels: raw.levels.levels,
    rules: raw.rules.rules,
    defects: raw.defects.defects,
    accounts: raw.accounts.accounts,
    opening: raw.accounts.opening,
    openingProfiles: raw.accounts.openingProfiles,
    templates,
  };
  return cachedBundle;
}
