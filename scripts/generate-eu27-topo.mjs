/**
 * Generate accurate EU-27 TopoJSON from Natural Earth 110m data.
 *
 * Usage: node scripts/generate-eu27-topo.mjs
 *
 * Prerequisites: npm install topojson-server topojson-simplify topojson-client
 *
 * This script:
 * 1. Downloads Natural Earth 110m countries GeoJSON
 * 2. Filters to EU-27 members
 * 3. Converts to TopoJSON with shared arcs (for mesh borders)
 * 4. Writes public/eu27.topo.json
 */

import { writeFileSync } from "fs";
import { topology } from "topojson-server";
import { presimplify, quantile, simplify } from "topojson-simplify";

const EU27_ISO_A2 = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

// Natural Earth 50m countries GeoJSON (public domain) — 50m includes Malta
const NE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";

// Override map for countries whose ISO_A2 is -99 in Natural Earth
const NAME_TO_ISO = {
  France: "FR",
  Norway: "NO",
};

async function main() {
  console.log("⬇  Downloading Natural Earth 50m countries…");
  const res = await fetch(NE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const world = await res.json();

  console.log(`   ${world.features.length} total features`);

  // Resolve ISO_A2 with multiple fallbacks
  function resolveISO(f) {
    if (f.properties.ISO_A2 && f.properties.ISO_A2 !== "-99") {
      return f.properties.ISO_A2;
    }
    if (f.properties.ISO_A2_EH && f.properties.ISO_A2_EH !== "-99") {
      return f.properties.ISO_A2_EH;
    }
    const name = f.properties.NAME || f.properties.NAME_EN;
    if (NAME_TO_ISO[name]) return NAME_TO_ISO[name];
    return null;
  }

  // Clip geometry to European bounding box to exclude overseas territories
  // This removes French Guiana, Reunion, Canaries, Azores, etc.
  const EUROPE_BBOX = { minLon: -25, maxLon: 45, minLat: 34, maxLat: 72 };

  function clipCoordinate(coord) {
    const [lon, lat] = coord;
    return (
      lon >= EUROPE_BBOX.minLon &&
      lon <= EUROPE_BBOX.maxLon &&
      lat >= EUROPE_BBOX.minLat &&
      lat <= EUROPE_BBOX.maxLat
    );
  }

  function clipRing(ring) {
    // Keep ring only if centroid is inside Europe
    if (ring.length === 0) return null;
    let sumLon = 0, sumLat = 0;
    for (const [lon, lat] of ring) {
      sumLon += lon;
      sumLat += lat;
    }
    const cLon = sumLon / ring.length;
    const cLat = sumLat / ring.length;
    if (
      cLon >= EUROPE_BBOX.minLon &&
      cLon <= EUROPE_BBOX.maxLon &&
      cLat >= EUROPE_BBOX.minLat &&
      cLat <= EUROPE_BBOX.maxLat
    ) {
      return ring;
    }
    return null;
  }

  function clipGeometry(geom) {
    if (geom.type === "Polygon") {
      const clipped = geom.coordinates
        .map(clipRing)
        .filter(Boolean);
      if (clipped.length === 0) return null;
      return { type: "Polygon", coordinates: clipped };
    }
    if (geom.type === "MultiPolygon") {
      const clipped = [];
      for (const polygon of geom.coordinates) {
        const rings = polygon.map(clipRing).filter(Boolean);
        if (rings.length > 0) clipped.push(rings);
      }
      if (clipped.length === 0) return null;
      if (clipped.length === 1) {
        return { type: "Polygon", coordinates: clipped[0] };
      }
      return { type: "MultiPolygon", coordinates: clipped };
    }
    return geom;
  }

  // Filter to EU-27, normalize properties
  const eu27Features = world.features
    .filter((f) => {
      const iso = resolveISO(f);
      return iso && EU27_ISO_A2.has(iso);
    })
    .map((f) => {
      const iso = resolveISO(f);
      const clippedGeom = clipGeometry(f.geometry);
      if (!clippedGeom) return null;
      return {
        type: "Feature",
        geometry: clippedGeom,
        properties: {
          ISO_A2: iso,
          NAME: f.properties.NAME || f.properties.NAME_EN,
        },
      };
    })
    .filter(Boolean);

  console.log(`   ${eu27Features.length} EU-27 features matched`);

  // Check which are missing
  const found = new Set(eu27Features.map((f) => f.properties.ISO_A2));
  for (const code of EU27_ISO_A2) {
    if (!found.has(code)) {
      console.warn(`   ⚠ Missing: ${code}`);
    }
  }

  // Build GeoJSON FeatureCollection
  const geojson = {
    type: "FeatureCollection",
    features: eu27Features,
  };

  // Convert to TopoJSON (this creates shared arcs between neighboring countries)
  console.log("🔧 Converting to TopoJSON with shared arcs…");
  let topo = topology({ countries: geojson }, 1e5);

  // Simplify to reduce file size while keeping recognizable borders
  topo = presimplify(topo);
  const minWeight = quantile(topo, 0.02); // keep top 98% of detail
  topo = simplify(topo, minWeight);

  const json = JSON.stringify(topo);
  const kb = (json.length / 1024).toFixed(1);

  writeFileSync("public/eu27.topo.json", json);
  console.log(`✅ Written public/eu27.topo.json (${kb} KB)`);

  // Verify
  const nArcs = topo.arcs.length;
  const nGeom = topo.objects.countries.geometries.length;
  console.log(`   ${nGeom} geometries, ${nArcs} arcs`);
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
