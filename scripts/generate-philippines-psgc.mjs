#!/usr/bin/env node
/**
 * Builds apps/api/database/data/philippines-psgc.json from a pinned PSA PSGC flat dump.
 *
 * Default source: bendlikeabamboo/barangay-data-repository @ 2026-07-13
 * (derived from the Philippine Statistics Authority PSGC master list).
 *
 * Includes Luzon, Visayas, and Mindanao (all PSGC regions).
 *
 * Usage:
 *   node scripts/generate-philippines-psgc.mjs
 *   node scripts/generate-philippines-psgc.mjs --input /path/to/barangay_flat.json
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const PUBLICATION_DATE = "2026-07-13";
const SOURCE_URL =
  "https://raw.githubusercontent.com/bendlikeabamboo/barangay-data-repository/main/2026-07-13/barangay_flat.json";
const SOURCE_LABEL =
  "PSA PSGC via bendlikeabamboo/barangay-data-repository barangay_flat.json (2026-07-13)";

/** Skip ICC shells that only wrap a single city (Isabela City). */
const SKIPPED_SHELL_CODES = new Set(["0990100000"]);

const TYPE_MAP = {
  region: "region",
  province: "province",
  special_geographic_area: "province",
  highly_urbanized_city: "city",
  independent_component_city: "city",
  component_city: "city",
  municipality: "municipality",
  /** Flattened into the parent city; not emitted as rows. */
  submunicipality: null,
  barangay: "barangay",
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "apps/api/database/data/philippines-psgc.json");

function parseArgs(argv) {
  const inputIndex = argv.indexOf("--input");
  return {
    input: inputIndex >= 0 ? argv[inputIndex + 1] : null,
  };
}

async function loadSource(inputPath) {
  if (inputPath) {
    const absolute = resolve(inputPath);
    if (!existsSync(absolute)) {
      throw new Error(`Input file not found: ${absolute}`);
    }
    return JSON.parse(readFileSync(absolute, "utf8"));
  }

  const cachePath = resolve(root, "scripts/.cache/barangay_flat-2026-07-13.json");
  mkdirSync(dirname(cachePath), { recursive: true });
  if (!existsSync(cachePath)) {
    const response = await fetch(SOURCE_URL);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download PSGC dump: HTTP ${response.status}`);
    }
    await pipeline(Readable.fromWeb(response.body), createWriteStream(cachePath));
  }
  return JSON.parse(readFileSync(cachePath, "utf8"));
}

function normalizeName(name) {
  return String(name).replace(/\s+/g, " ").trim();
}

function resolveParentCode(row, byCode) {
  let parentCode =
    row.parent_psgc_id && row.parent_psgc_id !== "0000000000" ? row.parent_psgc_id : null;

  while (parentCode) {
    if (SKIPPED_SHELL_CODES.has(parentCode)) {
      const shell = byCode.get(parentCode);
      parentCode =
        shell?.parent_psgc_id && shell.parent_psgc_id !== "0000000000"
          ? shell.parent_psgc_id
          : null;
      continue;
    }

    const parent = byCode.get(parentCode);
    if (parent?.type === "submunicipality") {
      parentCode =
        parent.parent_psgc_id && parent.parent_psgc_id !== "0000000000"
          ? parent.parent_psgc_id
          : null;
      continue;
    }

    break;
  }

  return parentCode;
}

function buildAreas(rows) {
  const byCode = new Map(rows.map((row) => [row.psgc_id, row]));
  const areas = [];

  for (const row of byCode.values()) {
    if (SKIPPED_SHELL_CODES.has(row.psgc_id)) continue;
    if (row.type === "submunicipality") continue;

    const mappedType = TYPE_MAP[row.type];
    if (mappedType === null) continue;
    if (!mappedType) {
      throw new Error(`Unsupported PSGC type "${row.type}" for ${row.psgc_id}`);
    }

    const parentCode = resolveParentCode(row, byCode);
    if (parentCode && !byCode.has(parentCode) && !SKIPPED_SHELL_CODES.has(parentCode)) {
      throw new Error(`Missing parent ${parentCode} for ${row.psgc_id}`);
    }

    areas.push({
      code: row.psgc_id,
      name: normalizeName(row.name),
      type: mappedType,
      parentCode,
    });
  }

  const order = { region: 0, province: 1, city: 2, municipality: 2, barangay: 3 };
  areas.sort((a, b) => {
    const typeDelta = (order[a.type] ?? 9) - (order[b.type] ?? 9);
    if (typeDelta !== 0) return typeDelta;
    return a.code.localeCompare(b.code);
  });

  return areas;
}

function assertInvariants(areas) {
  const byCode = new Map(areas.map((area) => [area.code, area]));
  const required = [
    ["1000000000", "region"],
    ["1600000000", "region"],
    ["1300000000", "region"],
    ["0700000000", "region"],
    ["1004308000", "city"],
    ["1630400000", "city"],
    ["1600209000", "municipality"],
    ["1380600000", "city"],
    ["1004308083", "barangay"],
    ["1630400103", "barangay"],
    ["1600209020", "barangay"],
  ];

  for (const [code, type] of required) {
    const area = byCode.get(code);
    if (!area || area.type !== type) {
      throw new Error(`Expected ${type} ${code} in Philippines dump`);
    }
  }

  const manilaBarangay = [...byCode.values()].find(
    (area) => area.type === "barangay" && area.parentCode === "1380600000",
  );
  if (!manilaBarangay) {
    throw new Error("Expected Manila barangays to be flattened under City of Manila");
  }

  for (const area of areas) {
    if (area.parentCode && !byCode.has(area.parentCode)) {
      throw new Error(`Dangling parentCode ${area.parentCode} on ${area.code}`);
    }
  }
}

const { input } = parseArgs(process.argv.slice(2));
const sourceRows = await loadSource(input);
if (!Array.isArray(sourceRows)) {
  throw new Error("PSGC source must be a flat array");
}

const areas = buildAreas(sourceRows);
assertInvariants(areas);

const counts = areas.reduce((acc, area) => {
  acc[area.type] = (acc[area.type] ?? 0) + 1;
  return acc;
}, {});

const payload = {
  source: SOURCE_LABEL,
  publicationDate: PUBLICATION_DATE,
  sourceUrl: SOURCE_URL,
  scope: "philippines",
  generatedAt: new Date().toISOString(),
  counts,
  areas,
};

mkdirSync(dirname(outputPath), { recursive: true });
const json = `${JSON.stringify(payload)}\n`;
await pipeline(Readable.from([json]), createWriteStream(outputPath));

console.log(
  `Wrote ${areas.length} Philippine areas to ${outputPath} (${Object.entries(counts)
    .map(([type, count]) => `${type}=${count}`)
    .join(", ")})`,
);
