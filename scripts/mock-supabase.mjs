/**
 * Local PostgREST-compatible mock of the Supabase REST API — TESTING ONLY.
 *
 * Lets the full shopping flow (browse → cart → checkout → order) be exercised
 * end-to-end before the real Supabase schema has been applied. It implements
 * just the subset of PostgREST behaviour this app uses:
 *
 *   GET    /rest/v1/{table}?select=…&col=eq.v&col=in.(a,b)&or=(a.ilike.%x%,b.ilike.%x%)&order=col.dir&limit=N
 *   POST   /rest/v1/{table}?select=…            (insert; honours vnd.pgrst.object)
 *   PATCH  /rest/v1/{table}?col=eq.v            (update)
 *
 * Usage:  node scripts/mock-supabase.mjs   (listens on :54321)
 * Then:   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 npm run dev
 */
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";

const PORT = 54321;

// ---------------------------------------------------------------------------
// Deterministic UUIDs so cart productIds stay stable across restarts.
// ---------------------------------------------------------------------------
function slugUuid(slug) {
  const hex = createHash("md5").update(slug).digest("hex");
  return [
    hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16),
    hex.slice(16, 20), hex.slice(20, 32),
  ].join("-");
}

// ---------------------------------------------------------------------------
// In-memory catalog — mirrors supabase/seed.sql
// ---------------------------------------------------------------------------
const P = (slug, name, brand, category, unit, price, compareAt, badge, rating, sort) => ({
  id: slugUuid(slug), slug, name, brand,
  description: `${name} — ${unit}, sourced fresh by Village Mart.`,
  category_slug: category, unit_label: unit,
  price, compare_at_price: compareAt, badge, rating, sort_order: sort,
  image_url: `/images/products/${slug}.jpg`, created_at: new Date().toISOString(),
});

const products = [
  P("royal-stallion-parboiled-rice-50kg", "Royal Stallion Parboiled Rice", "Royal Stallion", "rice-grains", "50kg bag", 98500, 110000, "BESTSELLER", 4.8, 1),
  P("mama-gold-parboiled-rice-25kg", "Mama Gold Parboiled Rice", "Mama Gold", "rice-grains", "25kg bag", 52000, null, null, 4.6, 2),
  P("caprice-perfumed-rice-10kg", "Caprice Gold Perfumed Rice", "Caprice", "rice-grains", "10kg bag", 24500, null, "NEW", 4.5, 3),
  P("honeywell-honey-beans-2kg", "Honeywell Honey Beans (Oloyin)", "Honeywell", "rice-grains", "2kg", 8900, null, null, 4.4, 4),
  P("ijebu-garri-white-5kg", "Ijebu Garri (White)", "Village Mart Select", "rice-grains", "5kg", 6500, null, null, 4.3, 5),
  P("golden-penny-semovita-10kg", "Golden Penny Semovita", "Golden Penny", "rice-grains", "10kg", 15800, null, null, 4.5, 6),
  P("kings-vegetable-oil-5l", "Kings Vegetable Oil", "Kings", "oils-fats", "5L jerrycan", 18500, 21000, "SALE", 4.6, 7),
  P("power-oil-vegetable-oil-2-8l", "Power Oil Vegetable Oil", "Power Oil", "oils-fats", "2.8L", 10500, null, null, 4.5, 8),
  P("mamador-palm-oil-5l", "Mamador Premium Palm Oil", "Mamador", "oils-fats", "5L", 19800, null, "BESTSELLER", 4.7, 9),
  P("golden-penny-margarine-500g", "Golden Penny Margarine", "Golden Penny", "oils-fats", "500g", 3200, null, null, 4.2, 10),
  P("gino-tomato-paste-6x400g", "Gino Tomato Paste", "Gino", "tomato-canned", "400g × 6", 4800, 5400, "SALE", 4.7, 11),
  P("derica-tomato-paste-12x210g", "Derica Tomato Paste", "Derica", "tomato-canned", "210g × 12", 7900, null, null, 4.5, 12),
  P("titus-sardines-10x125g", "Titus Sardines in Vegetable Oil", "Titus", "tomato-canned", "125g × 10", 8500, null, null, 4.4, 13),
  P("indomie-instant-noodles-24x120g", "Indomie Instant Noodles (Super Pack)", "Indomie", "pasta-noodles", "120g × 24", 9800, null, "BESTSELLER", 4.8, 14),
  P("golden-penny-spaghetti-10x500g", "Golden Penny Spaghetti", "Golden Penny", "pasta-noodles", "500g × 10", 8200, null, null, 4.5, 15),
  P("milo-activ-go-1-8kg", "Milo Activ-Go", "Nestlé", "beverages-dairy", "1.8kg tin", 12400, 13900, "SALE", 4.7, 16),
  P("nescafe-classic-200g", "Nescafé Classic Coffee", "Nestlé", "beverages-dairy", "200g jar", 6900, null, null, 4.5, 17),
  P("peak-milk-powder-900g", "Peak Full Cream Milk Powder", "Peak", "beverages-dairy", "900g refill", 14900, null, "NEW", 4.6, 18),
  P("dangote-granulated-sugar-10kg", "Dangote Granulated Sugar", "Dangote", "spices-pantry", "10kg bag", 16500, null, null, 4.4, 19),
  P("maggi-chicken-cubes-100x10g", "Maggi Chicken Seasoning Cubes", "Maggi", "spices-pantry", "10g × 100", 5600, null, null, 4.8, 20),
  P("pure-honey-1l", "Natural Ijebu Honey", "Village Mart Select", "spices-pantry", "1L bottle", 12500, null, "NEW", 4.9, 21),
  P("village-mart-frozen-chicken-1kg", "Frozen Chicken (Cut-up)", "Village Mart Fresh", "fresh-frozen", "1kg pack", 7500, null, "NEW", 4.3, 22),
  P("crate-of-eggs-30pcs", "Crate of Eggs", "Village Mart Fresh", "fresh-frozen", "30 pieces", 6800, null, "BESTSELLER", 4.7, 23),
];

const categories = [
  ["rice-grains", "Rice & Grains", "Bags of rice, beans & swallow staples", "/images/cat-rice-grains.jpg", 1],
  ["oils-fats", "Cooking Oil & Fats", "Groundnut, palm oil & more", "/images/cat-oils-fats.jpg", 2],
  ["tomato-canned", "Tomato Paste & Canned", "Tinned tomatoes, sardines & mixes", "/images/cat-tomato-canned.jpg", 3],
  ["pasta-noodles", "Pasta & Noodles", "Spaghetti, macaroni & instant noodles", "/images/cat-pasta-noodles.jpg", 4],
  ["beverages-dairy", "Beverages & Dairy", "Milo, milk, coffee & family tins", "/images/cat-beverages-dairy.jpg", 5],
  ["spices-pantry", "Spices & Pantry", "Seasoning cubes, sugar & honey", "/images/cat-spices-pantry.jpg", 6],
  ["fresh-frozen", "Fresh & Frozen", "Eggs, frozen chicken & farm produce", "/images/cat-fresh-frozen.jpg", 7],
].map(([slug, name, tagline, image, sort]) => ({
  id: slugUuid(`cat-${slug}`), slug, name, tagline, image_url: image, sort_order: sort,
  created_at: new Date().toISOString(),
}));

/** Writable tables keyed by name. */
const db = {
  products,
  categories,
  customers: [],
  orders: [],
  order_items: [],
  newsletter_subscribers: [],
};

// ---------------------------------------------------------------------------
// PostgREST-style filter evaluation
// ---------------------------------------------------------------------------

/** Safe decode: URLSearchParams already decoded once; a second decode can
 *  hit invalid sequences (e.g. "%honey%"), so fall back to the raw value. */
function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function applyFilter(rows, key, rawValue) {
  const value = safeDecode(rawValue);
  if (key === "or") {
    // or=(name.ilike.%rice%,brand.ilike.%rice%) — OR over sub-filters
    const parts = value.replace(/^\(|\)$/g, "").split(/,(?=[a-z_]+\.)/i);
    return rows.filter((row) =>
      parts.some((part) => {
        const dot = part.indexOf(".");
        return applyFilter([row], part.slice(0, dot), part.slice(dot + 1)).length > 0;
      })
    );
  }
  const dot = value.indexOf(".");
  const op = value.slice(0, dot);
  const operand = value.slice(dot + 1);
  return rows.filter((row) => {
    const cell = row[key];
    switch (op) {
      case "eq": return String(cell) === operand;
      case "in": {
        const list = operand.replace(/^\(|\)$/g, "").split(",").map((s) => s.trim());
        return list.includes(String(cell));
      }
      case "ilike": {
        const pattern = operand.replace(/^%|%$/g, "").toLowerCase();
        return String(cell ?? "").toLowerCase().includes(pattern);
      }
      default: return true;
    }
  });
}

/** Pick only the columns requested in ?select= (supports `*` and embeds). */
function shapeRow(row, select, table) {
  if (!select || select === "*") {
    // Expand the one embed the app uses: order_items(*) on orders.
    const base = { ...row };
    if (table === "orders") base.order_items = db.order_items.filter((i) => i.order_id === row.id);
    return base;
  }
  const cols = select.split(",").map((c) => c.trim());
  const out = {};
  for (const col of cols) {
    if (col === "order_items(*)" || col === "order_items") {
      out.order_items = db.order_items.filter((i) => i.order_id === row.id);
    } else if (col === "*") {
      Object.assign(out, row);
    } else if (col in row) {
      out[col] = row[col];
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const table = url.pathname.replace(/^\/rest\/v1\//, "");
  const wantsSingle = (req.headers.accept ?? "").includes("vnd.pgrst.object");

  if (!(table in db)) {
    res.writeHead(404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ message: `relation "public.${table}" does not exist` }));
  }

  const rows = db[table];
  const params = url.searchParams;
  const select = params.get("select");

  // ---- INSERT -------------------------------------------------------------
  if (req.method === "POST") {
    const body = [];
    for await (const chunk of req) body.push(chunk);
    const items = JSON.parse(body.join(""));
    const inserted = (Array.isArray(items) ? items : [items]).map((item) => ({
      id: randomUUID(),
      created_at: new Date().toISOString(),
      ...item,
    }));
    rows.push(...inserted);
    console.log(`[mock] INSERT ${table}: ${inserted.length} row(s)`);
    res.writeHead(201, { "Content-Type": "application/json" });
    const shaped = inserted.map((r) => shapeRow(r, select, table));
    return res.end(JSON.stringify(wantsSingle ? shaped[0] : shaped));
  }

  // ---- UPDATE -------------------------------------------------------------
  if (req.method === "PATCH") {
    const body = [];
    for await (const chunk of req) body.push(chunk);
    const patch = JSON.parse(body.join(""));
    let matched = rows;
    for (const [key, value] of params) {
      if (key === "select") continue;
      matched = applyFilter(matched, key, value);
    }
    matched.forEach((row) => Object.assign(row, patch));
    console.log(`[mock] PATCH ${table}: ${matched.length} row(s)`);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(matched.map((r) => shapeRow(r, select, table))));
  }

  // ---- SELECT -------------------------------------------------------------
  if (req.method === "GET") {
    let result = [...rows];
    console.log(`[mock] GET ${table}  url=${url.pathname}${url.search}`);
    for (const [key, value] of params) {
      if (key === "select" || key === "order" || key === "limit") continue;
      result = applyFilter(result, key, value);
    }
    const orderParam = params.get("order");
    if (orderParam) {
      const [col, dir] = orderParam.split(".");
      result.sort((a, b) =>
        dir === "desc" ? (b[col] > a[col] ? 1 : -1) : (a[col] > b[col] ? 1 : -1)
      );
    }
    const limit = params.get("limit");
    if (limit) result = result.slice(0, Number(limit));

    console.log(`[mock] GET ${table} -> ${result.length} row(s)`);
    res.writeHead(200, { "Content-Type": "application/json" });
    const shaped = result.map((r) => shapeRow(r, select, table));
    return res.end(JSON.stringify(wantsSingle ? shaped[0] ?? null : shaped));
  }

  res.writeHead(405);
  res.end();
});

server.listen(PORT, () => {
  console.log(`[mock] Supabase REST mock listening on http://127.0.0.1:${PORT}`);
});
