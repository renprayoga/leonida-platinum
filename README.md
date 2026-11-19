# Leonida Platinum — GTA VI Trophy Guide & Tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/renprayoga/leonida-platinum/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/renprayoga/leonida-platinum/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline web app that guides and tracks all **55 PlayStation 5 trophies** of Grand Theft Auto VI — 1 platinum, 2 gold, 6 silver, 46 bronze — built for the [make.fun bounty "Build the best GTA 6 trophy guide"](https://make.fun/bounty/gta6-trophy-guide-01).

## What it does

- **Checklist tracker** — every trophy with its official name, description and grade. Tick trophies off as you earn them; progress is saved in the browser (localStorage) and can be **exported to JSON and imported back**.
- **Filters** — by kind (story, collectibles, activities, exploration, combat, money, platinum), by grade, by status (earned / remaining / missable), plus full-text search.
- **Spoiler setting** — hides the names and descriptions of story trophies until they are earned.
- **Roadmap to the platinum** — five stages built from the official descriptions (story → stranger strands → collectibles → activities → money & combat clean-up), with per-stage progress and a "Next up" pointer.
- **Missable trophies flagged** — six trophies tied to one-off moments or one-way choices, each with why it can be missed.
- **A guide for every trophy, in our own words, with sources** — each guide names where its facts come from (Exophase for the official list, PSNProfiles for PSN progress counts). Where the official description does not pin down an exact location or step, the guide says so instead of inventing one.

## Run it offline

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests at run time — every file the app loads is under `app/`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory, checks that `app/data/trophies.json` names all 55 official trophies with a guide, and writes `dossier.json` with the vendored `vendor/makefun-frontend.ts`.

## Sources

- [Exophase — GTA VI trophy list](https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/) — official names, descriptions, grades
- [PSNProfiles — GTA VI trophies](https://psnprofiles.com/trophies/43531-grand-theft-auto-vi) — PSN progress counts

Unofficial fan guide. Not affiliated with Rockstar Games or PlayStation. No Rockstar logo or official artwork is used.

## License

MIT — see [LICENSE](LICENSE).
