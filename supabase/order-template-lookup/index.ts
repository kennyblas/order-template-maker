// order-template-lookup — READ-ONLY lookup of o2i account status and storage limit by store code.
// Deployed to the o2i Supabase project (chebtjqheqnrnjgbixza) as an Edge Function (verify_jwt: false).
// Only SELECTs. Caller must be signed in (o2i project's Google login) with a company email.
const DOMAIN = "@usawholesalesupplies.com";
const ALLOWED_ORIGINS = ["https://kennyblas.github.io"];
const DB_URL = Deno.env.get("SUPABASE_URL")!;
const DB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "content-type, x-user-token, authorization, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (b: unknown, s: number, h: Record<string, string>) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...h, "Content-Type": "application/json" } });

async function get(table: string, select: string, filter: string) {
  const url = `${DB_URL}/rest/v1/${table}?select=${select}&${filter}`;
  const r = await fetch(url, { headers: { apikey: DB_KEY, Authorization: `Bearer ${DB_KEY}` } });
  if (!r.ok) throw new Error(`${table}: ${r.status}`);
  return await r.json();
}
const inList = (vals: (string | number)[]) =>
  encodeURIComponent(vals.map((v) => `"${String(v).replace(/"/g, "")}"`).join(","));

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin") || "");
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return json({ error: "POST only" }, 405, h);

  // 1) Verify the signed-in user (o2i project's own login)
  const token = req.headers.get("x-user-token") || "";
  if (!token) return json({ error: "Not signed in" }, 401, h);
  const u = await fetch(`${DB_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } });
  if (!u.ok) return json({ error: "Session expired — sign in again" }, 401, h);
  const user = await u.json();
  if (!String(user?.email || "").toLowerCase().endsWith(DOMAIN)) return json({ error: "Company email required" }, 403, h);

  // 2) Read-only lookups
  let body: { store_codes?: unknown } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const codes = [...new Set((Array.isArray(body.store_codes) ? body.store_codes : [])
    .map((c) => String(c).trim().toUpperCase()).filter((c) => /^[A-Z0-9_\-]{1,20}$/.test(c)))].slice(0, 1000);
  if (!codes.length) return json({ error: "No valid store codes" }, 400, h);

  try {
    const stores = await get("store_info", "store_code,client_id", `store_code=in.(${inList(codes)})`);
    const ids = [...new Set(stores.map((s: any) => s.client_id).filter((x: any) => x != null))];
    const clients = ids.length
      ? await get("client_info", "client_id,client_name,status_account,storage_limit",
          `client_id=in.(${inList(ids as number[])})&deleted_at=is.null`)
      : [];
    const clientById = Object.fromEntries(clients.map((c: any) => [c.client_id, c]));

    // One answer per store code; skip stores whose client was deleted.
    const out: Record<string, unknown> = {};
    const dupes: string[] = [];
    for (const s of stores) {
      const code = String(s.store_code || "").trim().toUpperCase();
      const c = clientById[s.client_id];
      if (!code || !c) continue;
      if (out[code]) { dupes.push(code); continue; }
      out[code] = {
        store_code: code,
        client_name: c.client_name ?? "",
        account_status: c.status_account ?? "",
        storage_limit: c.storage_limit ?? "",
      };
    }
    return json({
      stores: Object.values(out),
      missing: codes.filter((c) => !out[c]),
      duplicates: [...new Set(dupes)],
    }, 200, h);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500, h);
  }
});
