/* Single source of truth for inventory is web/assets/js/catalog.js, because the
 * browser reads it without a fetch. The server needs the same rows, so export
 * them to server/lots.json:
 *
 *     node scripts/export_catalog.mjs
 *
 * Run it after editing the catalogue, and commit both files.
 */
import { writeFileSync } from "node:fs";
import { LOTS, CATEGORIES, GRADES } from "../web/assets/js/catalog.js";

const out = new URL("../server/lots.json", import.meta.url);
writeFileSync(out, JSON.stringify({ lots: LOTS, categories: CATEGORIES, grades: GRADES }, null, 2) + "\n");
console.log(`wrote ${LOTS.length} lots to ${out.pathname}`);
