#!/usr/bin/env node

/**
 * Translation Coverage Checker
 *
 * Compares all locale folders against en/*.json (source of truth).
 * Prints missing keys per namespace per language.
 *
 * Usage: node frontend/scripts/check-translations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCALES_DIR = path.resolve(__dirname, '../public/locales');

function getKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function main() {
  const enDir = path.join(LOCALES_DIR, 'en');
  if (!fs.existsSync(enDir)) {
    console.error('Error: en/ locale directory not found at', enDir);
    process.exit(1);
  }

  const namespaces = fs.readdirSync(enDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));

  const enKeys = {};
  for (const ns of namespaces) {
    const filePath = path.join(enDir, `${ns}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    enKeys[ns] = getKeys(data);
  }

  const locales = fs.readdirSync(LOCALES_DIR)
    .filter(d => d !== 'en' && fs.statSync(path.join(LOCALES_DIR, d)).isDirectory());

  let totalMissing = 0;
  let totalExtra = 0;

  for (const locale of locales.sort()) {
    const localeDir = path.join(LOCALES_DIR, locale);
    let localeMissing = 0;
    let localeExtra = 0;

    for (const ns of namespaces) {
      const filePath = path.join(localeDir, `${ns}.json`);
      if (!fs.existsSync(filePath)) {
        console.log(`  [${locale}/${ns}] FILE MISSING — ${enKeys[ns].length} keys needed`);
        localeMissing += enKeys[ns].length;
        totalMissing += enKeys[ns].length;
        continue;
      }

      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const localeKeySet = new Set(getKeys(data));
      const enKeySet = new Set(enKeys[ns]);

      const missing = enKeys[ns].filter(k => !localeKeySet.has(k));
      const extra = [...localeKeySet].filter(k => !enKeySet.has(k));

      if (missing.length > 0) {
        console.log(`  [${locale}/${ns}] ${missing.length} missing key(s):`);
        missing.forEach(k => console.log(`    - ${k}`));
        localeMissing += missing.length;
        totalMissing += missing.length;
      }

      if (extra.length > 0) {
        console.log(`  [${locale}/${ns}] ${extra.length} extra key(s) (not in en):`);
        extra.forEach(k => console.log(`    + ${k}`));
        localeExtra += extra.length;
        totalExtra += extra.length;
      }
    }

    if (localeMissing === 0 && localeExtra === 0) {
      console.log(`  [${locale}] All good — 100% coverage`);
    } else {
      console.log(`  [${locale}] Summary: ${localeMissing} missing, ${localeExtra} extra`);
    }
    console.log();
  }

  console.log('='.repeat(50));
  console.log(`Total: ${totalMissing} missing keys, ${totalExtra} extra keys across ${locales.length} locale(s)`);

  if (totalMissing > 0) {
    process.exit(1);
  }
}

main();
