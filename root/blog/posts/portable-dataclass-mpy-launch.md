---
title: From Dungeon Drifters to Portable Dataclass MPY
date: 2026-10-15
description: How Dungeon Drifters' MicroPython portability work became Portable Dataclass MPY, a standalone Python package now available on PyPI.
category: Build notes
---

Sometimes building a game produces a tool of its own. Portable Dataclass MPY grew out of the MicroPython portability work for Dungeon Drifters, and version 0.1.0 is now available on PyPI and GitHub.

## It started with a game

Dungeon Drifters uses dataclasses to describe things like combat moves, status effects, and character specifications. Bringing those models into its MicroPython environment called for a small dataclass implementation and a way to carry their field information across.

The [original MicroPython portability directory](https://github.com/MrCodeGameandAnime/Dungeon-Drifters/tree/master/root/portability/micropython) contains that game-specific implementation alongside other compatibility modules. Its generated field manifest connects the runtime to actual Dungeon Drifters models, from combat results to Drifter specifications.

That dataclass work became the starting point for a standalone package: Portable Dataclass MPY.

## Prepare on CPython, run on MicroPython

The approach splits the work between the development machine and the target runtime. You write ordinary module-level dataclasses, generate an ordered field manifest on CPython, and copy that manifest and the small dataclass runtime onto MicroPython alongside your models.

CPython continues to use its native standard-library dataclasses. The compatibility runtime belongs in the MicroPython deployment.

The supported subset includes construction, defaults, default factories, equality, frozen classes, inheritance, custom methods, and post-init hooks. The host CLI generates deterministic metadata and provides a freshness check to run before deployment.

This is a focused subset of Python's dataclasses. Features such as generated representations, `asdict`, and keyword-only fields are outside the current scope. See the [package documentation](https://pypi.org/project/portable-dataclass-mpy/0.1.0/) for supported behavior and limitations; individual boards and MicroPython builds still need their own qualification.

## Version 0.1.0 is available

Install the package on your development machine:

```sh
pip install portable-dataclass-mpy==0.1.0
```

The release includes the host CLI, the MicroPython runtime, and a runnable example with a preparation script. It is published under the MIT License.

The [release notes](https://github.com/MrCodeGameandAnime/portable-dataclass-mpy/releases/tag/v0.1.0) record four CI runs of 72 tests on CPython 3.12 and MicroPython 1.29.0 Unix, covering normal and optimized verification of the checkout and rebuilt source archive. Fresh PyPI installation, CLI, and example checks also passed across the host and MicroPython workflow.

What began as support code for one game is now available for other projects with the same portability problem.

[Get the package on PyPI](https://pypi.org/project/portable-dataclass-mpy/0.1.0/) or [explore the v0.1.0 release on GitHub](https://github.com/MrCodeGameandAnime/portable-dataclass-mpy/releases/tag/v0.1.0).
