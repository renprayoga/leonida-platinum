// Leonida Platinum — the hand-in program for the gta6-trophy-guide-01 entry
// (Node 22, standard library only). The guide itself is plain static files:
// app/index.html, its module app/app.js, its stylesheet app/style.css and its
// data app/data/trophies.json. This program copies app/ and screenshots/ from
// beside this file into the output directory and writes /output/dossier.json
// with the vendored make.fun library, exactly as the kit's starter does —
// the sealed scorer rebuilds the dossier with its own copy of that library
// and compares the two byte for byte, so vendor/makefun-frontend.ts must
// stay untouched. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for
// /output:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program runs twice and both runs must write the same bytes, so it
// does no sorting or hashing of its own: it copies the repository files as
// they are and lets buildDossier do the summarising. It refuses to hand in
// a broken entry instead of writing a dossier the gate would reject:
//   - app/ must exist with an index.html and data/trophies.json;
//   - screenshots/ must hold 3 or 4 images, each at most 256 KiB;
//   - trophies.json must name all 55 official trophies with a non-blank guide.
// A refusal exits non-zero with the reason on stderr, before any file is
// written, so a bad build never looks like a handed-in entry.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The 55 official PlayStation 5 trophy names, as the kit's starter lists
// them (Exophase and PSNProfiles agree on every name). Compared with case,
// curly quotes, dashes, the ellipsis and runs of white space set aside —
// the same normalisation the gate uses — so a name is never missed over a
// punctuation difference.
const OFFICIAL_TROPHY_NAMES = [
  'Vice Got a Price!', 'Just Like Paradise', 'Paradise Lost',
  'T**s Ass Drug Money', 'Vice City, Baby!', 'Top Of The World, Ma',
  'You Gotta Know When to Get Off', 'Trust', 'Break the Bank',
  'Family Matters', 'DWNFALL', 'Hi-Jacked', 'Snow Storm', 'A Long Road',
  'Cunning Stunts', 'Master of None', 'The Shootist', 'Top Fun',
  'Earn Cash, Not Kudos', 'Baited My Tackle', 'Stick Fiddler',
  'Road to Rehabilitation', 'This Was No Boat Accident', 'The Lone Rider',
  'Strangers & Freaks', 'Supply & Demand', 'Spin On This!',
  'Positive Mental Attitude', 'Fair Game', "Don't Touch My Deck",
  'You WAiNKer!', 'One Last Thing', 'Hot Together', 'Retail Therapy',
  'Whip It Good', 'Gunslinger', 'Catch Me If You Can', 'Challenging Tank',
  'Sneakthief', 'Maximum Withdrawal', 'A Classic Blitz Play',
  'The Goodtime State', 'Pest Control', 'In The Beginning…',
  'Capital Offense', 'Let’s Go Bowling', 'Personal Best',
  'Actions Speak Louder', 'Bad Luck, I Guess', 'The Truth Is Out There',
  'Ten Pin', 'Dime on the Dollar', 'Treat Yo Self', 'Little Boxes',
  'On the Spot',
];

// The gate's normalisation for trophy names: NFKC, curly quotes read as
// straight ones, every dash or hyphen sign as '-', '…' as three dots,
// white space folded, lower case.
function trophyNameKey(name) {
  return name
    .normalize('NFKC')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .toLowerCase()
    .split(/\s+/)
    .join(' ');
}

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function checkTrophyFile(path) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`app/data/trophies.json is not valid JSON: ${error.message}`);
  }
  const trophies = Array.isArray(parsed) ? parsed : parsed?.trophies;
  if (!Array.isArray(trophies)) fail('app/data/trophies.json holds no "trophies" array');
  const byKey = new Map();
  for (const trophy of trophies) {
    if (typeof trophy?.name !== 'string') continue;
    byKey.set(trophyNameKey(trophy.name), trophy);
  }
  const missing = OFFICIAL_TROPHY_NAMES.filter((name) => {
    const trophy = byKey.get(trophyNameKey(name));
    return !trophy || typeof trophy.guide !== 'string' || trophy.guide.trim() === '';
  });
  if (missing.length > 0) {
    fail(`app/data/trophies.json is missing a guide for: ${missing.join('; ')}`);
  }
}

function checkScreenshots(dir) {
  if (!existsSync(dir)) fail('screenshots/ is missing');
  const shots = readdirSync(dir)
    .filter((name) => !name.startsWith('.'))
    .filter((name) => statSync(join(dir, name)).isFile());
  if (shots.length < 3 || shots.length > 4) {
    fail(`screenshots/ holds ${shots.length} images, need 3 or 4`);
  }
  for (const name of shots) {
    if (!/^[A-Za-z0-9._-]+$/.test(name) || name.startsWith('-')) {
      fail(`screenshot name not allowed: ${name}`);
    }
    const size = statSync(join(dir, name)).size;
    if (size > 262144) fail(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
  }
}

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-flight checks first: refuse before writing anything.
const appDir = join(here, 'app');
if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');
if (!existsSync(join(appDir, 'data', 'trophies.json'))) fail('app/data/trophies.json is missing');
checkTrophyFile(join(appDir, 'data', 'trophies.json'));
checkScreenshots(join(here, 'screenshots'));

mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files and directories in
// app/ or 48 MiB of app files: app/ counts beside /output's own 1000-entry
// cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
console.log(`Leonida Platinum handed in: ${OFFICIAL_TROPHY_NAMES.length} trophies, dossier written to ${join(out, 'dossier.json')}`);
