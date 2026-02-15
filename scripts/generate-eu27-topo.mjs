/**
 * Generate high-accuracy EU-27 TopoJSON from Natural Earth 10m data.
 *
 * Usage: node scripts/generate-eu27-topo.mjs
 *
 * Prerequisites: npm install topojson-server topojson-simplify topojson-client
 *
 * This script:
 * 1. Downloads Natural Earth 10m countries GeoJSON (highest resolution)
 * 2. Filters to EU-27 members
 * 3. Clips to European extent (removes overseas territories via polygon centroid)
 * 4. Merges duplicate ISO codes (e.g. France metropolitan + Corsica)
 * 5. Converts to TopoJSON with shared arcs
 * 6. Applies light simplification (visually lossless at web zoom)
 * 7. Writes public/eu27.topo.json
 */

import { writeFileSync } from "fs";
import { topology } from "topojson-server";
import { presimplify, quantile, simplify } from "topojson-simplify";

const EU27_ISO_A2 = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

// Natural Earth 10m — highest resolution available (public domain)
const NE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson";

// Override map for countries whose ISO_A2 is -99 in Natural Earth
const NAME_TO_ISO = {
  France: "FR",
  Norway: "NO",
};

// European extent — generous enough for Canary Islands, Cyprus, Nordic
const EUROPE = { minLon: -26, maxLon: 45, minLat: 34, maxLat: 72 };

// ── Helpers ──────────────────────────────────────────────────────────

function resolveISO(f) {
  if (f.properties.ISO_A2 && f.properties.ISO_A2 !== "-99") return f.properties.ISO_A2;
  if (f.properties.ISO_A2_EH && f.properties.ISO_A2_EH !== "-99") return f.properties.ISO_A2_EH;
  const name = f.properties.NAME || f.properties.NAME_EN;
  return NAME_TO_ISO[name] ?? null;
}

/** Compute arithmetic centroid of a ring [[lon,lat], …] */
function ringCentroid(ring) {
  let sLon = 0, sLat = 0;
  for (const [lon, lat] of ring) { sLon += lon; sLat += lat; }
  return [sLon / ring.length, sLat / ring.length];
}

/** Check if a point [lon,lat] is inside the European bbox */
function inEurope([lon, lat]) {
  return lon >= EUROPE.minLon && lon <= EUROPE.maxLon &&
         lat >= EUROPE.minLat && lat <= EUROPE.maxLat;
}

/**
 * Keep only polygon rings (outer + holes) whose outer ring centroid
 * falls within the European bounding box. This removes French Guiana,
 * Réunion, Guadeloupe, etc. while keeping Corsica, Sardinia, Crete, etc.
 */
function clipToEurope(geom) {
  if (geom.type === "Polygon") {
    const outerCentroid = ringCentroid(geom.coordinates[0]);
    return inEurope(outerCentroid) ? geom : null;
  }
  if (geom.type === "MultiPolygon") {
    const kept = geom.coordinates.filter((polygon) => {
      const outerCentroid = ringCentroid(polygon[0]);
      return inEurope(outerCentroid);
    });
    if (kept.length === 0) return null;
    if (kept.length === 1) return { type: "Polygon", coordinates: kept[0] };
    return { type: "MultiPolygon", coordinates: kept };
  }
  return geom;
}

/** Merge geometries sharing the same ISO code into a single MultiPolygon */
function mergeByISO(features) {
  const byISO = new Map();
  for (const f of features) {
    const iso = f.properties.ISO_A2;
    if (!byISO.has(iso)) {
      byISO.set(iso, { ...f });
    } else {
      // Merge polygons into the existing feature
      const existing = byISO.get(iso);
      const a = existing.geometry;
      const b = f.geometry;
      const polysA = a.type === "MultiPolygon" ? a.coordinates : [a.coordinates];
      const polysB = b.type === "MultiPolygon" ? b.coordinates : [b.coordinates];
      existing.geometry = {
        type: "MultiPolygon",
        coordinates: [...polysA, ...polysB],
      };
    }
  }
  return [...byISO.values()];
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("⬇  Downloading Natural Earth 10m countries…");
  const res = await fetch(NE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const world = await res.json();
  console.log(`   ${world.features.length} total features`);

  // Step 1: Filter to EU-27 + clip to Europe + strip properties
  const rawEU = [];
  for (const f of world.features) {
    const iso = resolveISO(f);
    if (!iso || !EU27_ISO_A2.has(iso)) continue;
    const clipped = clipToEurope(f.geometry);
    if (!clipped) continue;
    rawEU.push({
      type: "Feature",
      geometry: clipped,
      properties: { ISO_A2: iso, NAME: f.properties.NAME || f.properties.NAME_EN },
    });
  }
  console.log(`   ${rawEU.length} raw EU-27 features after clip`);

  // Step 2: Merge duplicates (e.g. France appearing multiple times in 10m)
  const merged = mergeByISO(rawEU);
  console.log(`   ${merged.length} merged EU-27 features`);

  // Point count before topology
  let rawPts = 0;
  for (const f of merged) {
    const polys = f.geometry.type === "MultiPolygon"
      ? f.geometry.coordinates
      : [f.geometry.coordinates];
    for (const p of polys) for (const r of p) rawPts += r.length;
  }
  console.log(`   ${rawPts.toLocaleString()} coordinate points (pre-topology)`);

  // Check completeness
  const found = new Set(merged.map((f) => f.properties.ISO_A2));
  for (const code of EU27_ISO_A2) {
    if (!found.has(code)) console.warn(`   ⚠ Missing: ${code}`);
  }

  // Step 3: Build TopoJSON with high quantization (1e6 = ~0.1m precision at equator)
  console.log("🔧 Converting to TopoJSON with shared arcs…");
  const geojson = { type: "FeatureCollection", features: merged };
  let topo = topology({ countries: geojson }, 1e6);

  let topoPts = 0;
  topo.arcs.forEach((a) => (topoPts += a.length));
  console.log(`   ${topo.arcs.length} arcs, ${topoPts.toLocaleString()} points (post-topology)`);

  // Step 4: Light simplification — visually lossless at normal web zoom
  // quantile(topo, p) returns weight below which p fraction of points fall.
  // Higher p = more points kept = more geographic detail.
  // p=0.10 gives ~5000 points / ~190KB — crisp coastlines and borders
  topo = presimplify(topo);
  const threshold = quantile(topo, 0.10);
  topo = simplify(topo, threshold);

  let finalPts = 0;
  topo.arcs.forEach((a) => (finalPts += a.length));
  console.log(`   ${finalPts.toLocaleString()} points after simplification`);

  // Write
  const json = JSON.stringify(topo);
  const kb = (json.length / 1024).toFixed(1);
  writeFileSync("public/eu27.topo.json", json);
  console.log(`✅ Written public/eu27.topo.json (${kb} KB)`);
  console.log(`   ${topo.objects.countries.geometries.length} geometries, ${topo.arcs.length} arcs`);
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
