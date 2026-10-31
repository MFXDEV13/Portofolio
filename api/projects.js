const crypto = require("crypto");

const BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const ADMIN_USER = process.env.ADMIN_USER || "Admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "2006";
const ROW = "projects";
const CATS = ["Plugin", "Bot", "Web", "Lainnya"];

function sbHeaders(extra) {
  const h = { apikey: KEY, ...extra };
  // Kunci lama (JWT) dikirim juga sebagai Bearer; kunci baru "sb_secret_..." cukup lewat apikey.
  if (!String(KEY).startsWith("sb_")) h.Authorization = `Bearer ${KEY}`;
  return h;
}

async function loadProjects() {
  const r = await fetch(`${BASE}/rest/v1/site_data?key=eq.${ROW}&select=value`, {
    headers: sbHeaders(),
  });
  if (!r.ok) throw new Error("supabase " + r.status);
  const rows = await r.json();
  return rows.length && Array.isArray(rows[0].value) ? rows[0].value : [];
}

async function saveProjects(list) {
  const r = await fetch(`${BASE}/rest/v1/site_data?on_conflict=key`, {
    method: "POST",
    headers: sbHeaders({
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    }),
    body: JSON.stringify({ key: ROW, value: list, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error("supabase " + r.status);
}

function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function isAdmin(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Basic ")) return false;
  const text = Buffer.from(h.slice(6), "base64").toString();
  const i = text.indexOf(":");
  if (i < 0) return false;
  return same(text.slice(0, i), ADMIN_USER) && same(text.slice(i + 1), ADMIN_PASS);
}

function clean(list) {
  if (!Array.isArray(list) || list.length > 100) return null;
  const out = [];
  for (const p of list) {
    if (!p || typeof p.name !== "string" || !p.name.trim()) return null;
    const link = typeof p.link === "string" ? p.link.trim().slice(0, 300) : "";
    out.push({
      name: p.name.trim().slice(0, 80),
      cat: CATS.includes(p.cat) ? p.cat : "Lainnya",
      desc: typeof p.desc === "string" ? p.desc.trim().slice(0, 300) : "",
      tech: Array.isArray(p.tech)
        ? p.tech.filter((t) => typeof t === "string" && t.trim()).slice(0, 10).map((t) => t.trim().slice(0, 40))
        : [],
      link: /^https?:\/\//i.test(link) ? link : "",
    });
  }
  return out;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      if (req.query && req.query.check !== undefined) {
        if (isAdmin(req)) return res.status(200).json({ ok: true });
        await new Promise((r) => setTimeout(r, 800));
        return res.status(401).json({ error: "unauthorized" });
      }
      return res.status(200).json(BASE && KEY ? await loadProjects() : []);
    }
    if (req.method === "PUT") {
      if (!isAdmin(req)) {
        await new Promise((r) => setTimeout(r, 800));
        return res.status(401).json({ error: "unauthorized" });
      }
      const list = clean(req.body);
      if (!list) return res.status(400).json({ error: "invalid" });
      await saveProjects(list);
      return res.status(200).json(list);
    }
    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "method" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server" });
  }
};