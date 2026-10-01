/**
 * Downloads real food photos for the catalog into public/images/.
 *
 * Two sources per slot, tried in order:
 *   1. A curated Unsplash photo id (verified reachable, downloaded as JPEG).
 *   2. A Wikimedia Commons full-text search ("filetype:bitmap <terms>") —
 *      the first bitmap result ≥ 600px wide wins.
 *
 * Usage:  node scripts/download-images.mjs
 * Every slot that fails all candidates is reported so bad images can be
 * swapped manually afterwards.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "images");
const PRODUCTS_DIR = path.join(OUT_DIR, "products");

/** UA header — Wikimedia requires a descriptive User-Agent. */
const UA = "VillageMartDemo/1.0 (contact: dev@villagemart.example)";

/** slot -> candidates. unsplash: photo id; commons: search terms. */
const MANIFEST = {
  // ---- products ----------------------------------------------------------
  "products/royal-stallion-parboiled-rice-50kg": [
    { unsplash: "photo-1586201375761-83865001e31c" }, // rice bowl
    { commons: "parboiled rice sack" },
    { commons: "white rice grains" },
  ],
  "products/mama-gold-parboiled-rice-25kg": [
    { commons: "white rice bowl" },
    { unsplash: "photo-1536304993881-ff6e9eefa2a6" }, // rice dish
  ],
  "products/caprice-perfumed-rice-10kg": [
    { commons: "basmati rice" },
    { unsplash: "photo-1512058564366-18510be2db19" },
  ],
  "products/honeywell-honey-beans-2kg": [
    { commons: "black eyed peas beans" },
    { commons: "cowpea beans" },
  ],
  "products/ijebu-garri-white-5kg": [
    { commons: "garri cassava" },
    { commons: "cassava flakes" },
    { unsplash: "photo-1626082927389-6cd097cdc6ec" }, // grains-ish
  ],
  "products/golden-penny-semovita-10kg": [
    { commons: "semolina flour" },
    { commons: "wheat flour bowl" },
  ],
  "products/kings-vegetable-oil-5l": [
    { commons: "bottle cooking oil white background" },
    { commons: "sunflower oil bottle" },
    { commons: "cooking oil bottle" },
  ],
  "products/power-oil-vegetable-oil-2-8l": [
    { commons: "palm oil bottle" },
    { commons: "vegetable oil jerrycan" },
  ],
  "products/mamador-palm-oil-5l": [
    { commons: "red palm oil" },
    { commons: "palm oil" },
  ],
  "products/golden-penny-margarine-500g": [
    { commons: "margarine tub" },
    { commons: "butter block" },
  ],
  "products/gino-tomato-paste-6x400g": [
    { unsplash: "photo-1546094096-0df4bcaaa337" }, // tomatoes
    { commons: "tomato paste can" },
    { commons: "tomato puree" },
  ],
  "products/derica-tomato-paste-12x210g": [
    { commons: "canned tomatoes" },
    { unsplash: "photo-1592924357228-91a4daadcfea" }, // tomatoes
  ],
  "products/titus-sardines-10x125g": [
    { commons: "canned sardines" },
    { commons: "sardines tin" },
  ],
  "products/indomie-instant-noodles-24x120g": [
    { commons: "instant noodles" },
    { unsplash: "photo-1612929633738-8fe44f7ec841" },
    { commons: "instant ramen pack" },
  ],
  "products/golden-penny-spaghetti-10x500g": [
    { unsplash: "photo-1621996346565-e3dbc646d9a9" }, // spaghetti
    { commons: "spaghetti pasta bundle" },
  ],
  "products/milo-activ-go-1-8kg": [
    { commons: "milo drink powder" },
    { commons: "hot chocolate mug" },
    { unsplash: "photo-1542990253-a781e04c0082" },
  ],
  "products/nescafe-classic-200g": [
    { unsplash: "photo-1509042239860-f550ce710b93" }, // coffee cup
    { commons: "instant coffee jar" },
  ],
  "products/peak-milk-powder-900g": [
    { unsplash: "photo-1550583724-b2692b85b150" }, // milk bottle
    { commons: "powdered milk" },
  ],
  "products/dangote-granulated-sugar-10kg": [
    { commons: "granulated sugar" },
    { unsplash: "photo-1581636625402-29b2a704ef13" },
  ],
  "products/maggi-chicken-cubes-100x10g": [
    { commons: "bouillon cubes" },
    { unsplash: "photo-1596040033229-a9821ebd058d" }, // spices
    { commons: "stock cubes" },
  ],
  "products/pure-honey-1l": [
    { unsplash: "photo-1558642452-9d2a7deb7f62" },
    { commons: "honey jar glass" },
    { commons: "honey" },
  ],
  "products/village-mart-frozen-chicken-1kg": [
    { commons: "raw chicken meat" },
    { unsplash: "photo-1587593810167-a84920ea0781" },
    { commons: "chicken meat pieces" },
  ],
  "products/crate-of-eggs-30pcs": [
    { unsplash: "photo-1506976785307-8732e854ad03" }, // eggs
    { commons: "eggs crate" },
  ],

  // ---- category tiles ------------------------------------------------------
  "cat-rice-grains": [{ unsplash: "photo-1586201375761-83865001e31c" }, { commons: "rice grains" }],
  "cat-oils-fats": [{ unsplash: "photo-1474979266404-7eaacbcd87c5" }, { commons: "cooking oil bottle" }],
  "cat-tomato-canned": [{ unsplash: "photo-1546094096-0df4bcaaa337" }, { commons: "tomatoes" }],
  "cat-pasta-noodles": [{ unsplash: "photo-1621996346565-e3dbc646d9a9" }, { commons: "spaghetti" }],
  "cat-beverages-dairy": [{ unsplash: "photo-1550583724-b2692b85b150" }, { commons: "milk glass" }],
  "cat-spices-pantry": [{ unsplash: "photo-1596040033229-a9821ebd058d" }, { commons: "spices market" }],
  "cat-fresh-frozen": [{ unsplash: "photo-1506976785307-8732e854ad03" }, { commons: "eggs basket" }],

  // ---- hero + promo banners -------------------------------------------------
  "hero-1": [
    { unsplash: "photo-1542838132-92c53300491e" }, // grocery produce shelves
    { commons: "market food stall vegetables" },
  ],
  "hero-2": [
    { commons: "grains market africa" },
    { unsplash: "photo-1512621776951-a57141f2eefd" }, // food bowls
  ],
  "hero-3": [
    { unsplash: "photo-1488459716781-31db52582fe9" }, // vegetables
    { commons: "fresh tomatoes basket" },
  ],
  "promo-bulk": [
    { commons: "shopping basket vegetables" },
    { unsplash: "photo-1543168256-418811576931" },
    { commons: "groceries bag" },
  ],
};

/** Download a URL and return its bytes, validating it is a real raster image. */
async function fetchImage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) throw new Error(`not an image (${type})`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 15_000) throw new Error(`too small (${bytes.length} bytes)`);
  return bytes;
}

/** Wikimedia Commons search -> URL of the first usable result thumbnail. */
async function commonsSearch(terms) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.searchParams.set("action", "query");
  api.searchParams.set("format", "json");
  api.searchParams.set("generator", "search");
  api.searchParams.set("gsrsearch", `filetype:bitmap ${terms}`);
  api.searchParams.set("gsrlimit", "5");
  api.searchParams.set("gsrnamespace", "6");
  api.searchParams.set("prop", "imageinfo");
  api.searchParams.set("iiprop", "url|size|mime");
  api.searchParams.set("iiurlwidth", "900"); // ask for a 900px thumbnail
  const res = await fetch(api, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(25_000) });
  if (!res.ok) throw new Error(`commons HTTP ${res.status}`);
  const json = await res.json();
  const pages = Object.values(json?.query?.pages ?? {});
  for (const page of pages) {
    const info = page?.imageinfo?.[0];
    if (!info) continue;
    if (info.width < 600) continue;
    if (!/jpeg|png|webp/.test(info.mime ?? "")) continue;
    return info.thumburl ?? info.url;
  }
  throw new Error("no usable commons result");
}

async function main() {
  await mkdir(PRODUCTS_DIR, { recursive: true });
  const failures = [];
  let ok = 0;
  let skipped = 0;

  for (const [slot, candidates] of Object.entries(MANIFEST)) {
    const outFile = path.join(OUT_DIR, `${slot}.jpg`);

    // Keep already-downloaded images (idempotent re-runs).
    if (existsSync(outFile)) {
      skipped++;
      continue;
    }

    let done = false;
    for (const candidate of candidates) {
      try {
        const url = candidate.unsplash
          ? `https://images.unsplash.com/${candidate.unsplash}?w=900&q=80&fm=jpg&fit=crop`
          : await commonsSearch(candidate.commons);
        const bytes = await fetchImage(url);
        await writeFile(outFile, bytes);
        console.log(`✔ ${slot}  <-  ${candidate.unsplash ?? `commons:${candidate.commons}`}`);
        ok++;
        done = true;
        break;
      } catch (err) {
        console.log(`   … ${slot}: candidate failed (${err.message})`);
      }
    }
    if (!done) {
      failures.push(slot);
      console.log(`✘ ${slot}  —  ALL candidates failed`);
    }
    // Small pause to stay polite with the APIs.
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`\nDone: ${ok} downloaded, ${skipped} already present, ${failures.length} failed.`);
  if (failures.length) console.log("Failed slots:\n  " + failures.join("\n  "));
}

main();
