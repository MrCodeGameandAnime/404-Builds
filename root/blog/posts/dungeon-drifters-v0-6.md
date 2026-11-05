---
title: "Dungeon Drifters v0.6: Into the Browser, Into the Dungeon"
date: 2026-10-30
description: Dungeon Drifters v0.6 brings browser play, profile saves, companion onboarding, and the first dungeon floor through the Goblin Lord.
category: Games
draft: false
---

[Read the v0.6 release notes on GitHub](https://github.com/MrCodeGameandAnime/Dungeon-Drifters/releases/tag/v0.6)

Dungeon Drifters v0.6 is available. This release takes the portable gameplay runtime into the browser and establishes the first dungeon progression loop: prepare at the Hub, venture into Floor I, face the Goblin Lord, and return.

## A playable browser game

The new Play page runs the game through Pyodide, bringing the Python runtime into the browser while preserving the public site's existing structure and navigation.

The release also adds local-first profile saves. Optional synchronization through the Dungeon Drifters profile API includes explicit conflict recovery, giving the browser game a persistence workflow alongside the gameplay.

## From the Hub to Floor I

The Hub onboarding loop introduces companion recruitment and combat as a two-Drifter party. After the tutorial fight, players return to the Hub and secure their rewards before continuing.

Floor I expands that loop into ten battles, with two Rest points and the Goblin Lord encounter. Extraction and replay from the Hub make this a repeatable dungeon run rather than a single encounter.

The current playable endpoint is defeating the Floor I Goblin Lord and returning to the Hub. Later floors remain planned work.

## Building up your weapons

The Hub merchant adds another part of progression: crafting signature-weapon components, installing them, and improving them through Tier V.

Together, the Hub, party combat, dungeon run, and weapon progression give this release a connected path through the game's first floor.

## Qualifying the release

The release records successful browser gameplay and persistence journeys, PostgreSQL profile-service checks, content checks, and build checks. It also retains the established pinned MicroPython qualification; the T0 test consolidation did not change the runtime.

Overlapping tests were consolidated and test ownership recorded ahead of the M1–M9 development program. Those later systems remain separate from what v0.6 delivers.

The [hosted CI run for the release commit](https://github.com/MrCodeGameandAnime/Dungeon-Drifters/actions/runs/41066957880) is linked in the release notes.

v0.6 brings Dungeon Drifters to a concrete milestone: a browser game with a first floor to explore, a boss to reach, and a Hub to come back to.
