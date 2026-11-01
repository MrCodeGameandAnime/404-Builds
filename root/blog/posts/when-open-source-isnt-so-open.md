---
title: When Open Source Isn't So Open
date: 2026-10-20
description: My account of contributing to the enum work around MicroPython's micropython-lib PR 980, and why I ended my involvement.
category: Commentary
draft: false
---

[Read the original GitHub comment](https://github.com/micropython/micropython-lib/pull/980#issuecomment-6303489668)

# When Open Source Isn't So Open

I rarely work with other people on software.

That is not because software communities do not matter to me. It is almost the opposite. I care enough about the work that I usually prefer to build things myself, own the decisions, own the mistakes, and know exactly where everything came from.

MicroPython is different because Dungeon Drifters depends on it heavily, and Enum support is one of those areas where the gap between CPython and MicroPython has real downstream consequences. Dungeon Drifters already had a working compatibility approach for some of those problems, so when I saw the ongoing work around [`micropython-lib` PR #980](https://github.com/micropython/micropython-lib/pull/980), it looked like a place where that work could actually help.

Not with theory. Not with a feature request. With working code, tests, reproductions, and a real project that depended on the behavior. That was the entire reason for getting involved.

For reference, the repository where the analysis, testing, reproductions, and solution work were developed and documented is here:

https://github.com/MrCodeGameandAnime/enum_980

All timestamps below are UTC.

## I showed the approach first


On October 16, 2026, at 14:51:58 UTC, I posted a detailed technical analysis explaining that immediate enum-member availability and genuine declared `StrEnum` instance identity were possible on stock MicroPython without first adding metaclass support to the interpreter.

The comment demonstrated the approach already being used by Dungeon Drifters, including real instances of the declared string subclass, the process-wide `__build_class__` finalization mechanism, implementation and test links, and reproducible comparisons against both PR #980 and the proposed metaclass work in #1061.

That comment is here:

https://github.com/micropython/micropython-lib/pull/980#issuecomment-6218137384

The question was straightforward: if immediately usable, correctly typed `StrEnum` members were an intended compatibility goal, could Dungeon Drifters' member-construction approach help inform the implementation?

About sixteen hours later, on October 17 at 06:53:27 UTC, Ihor replied:

> "Thank you very much. I will develop the immediate member availability after class definition."

https://github.com/micropython/micropython-lib/pull/980#issuecomment-6230902708

That response came directly after the technical work and implementation mechanism had been published, so the next step was to make the contribution path explicit.

At 12:40:55 UTC that same day, I asked to contribute the implementation myself:

> "If you don't mind, I’d like to contribute the implementation. Are you open to me preparing a focused patch based on DD’s approach for your branch?"

https://github.com/micropython/micropython-lib/pull/980#issuecomment-6233993745

The comment also explained that even narrow developmental participation in the Python ecosystem, especially MicroPython, meant a lot to me.

This was not an attempt to claim somebody else's project. It was a request for a clear lane to contribute the thing I had already demonstrated.

## Then the implementation appeared anyway


On October 18 at 14:18:50 UTC, Ihor responded that version 1.5.0 now supported immediate enum-member availability.

He also told me:

> "You are very welcome to collaborate on this project, and I’d be happy to have your help."

But the work specifically offered was:

> "review the code, test the implementation, and check the README.md for accuracy, clarity, and completeness."

https://github.com/micropython/micropython-lib/pull/980#issuecomment-6250984767

About 28 minutes later, commit `c3b5aae` was recorded on Ihor's branch:

`python-stdlib\enum: Bump to version="1.5.0".`

The commit description states:

> "The builder hook allows using an Enum without lazy initialization."

https://github.com/micropython/micropython-lib/pull/980/commits/c3b5aaeb61c33ee13c70a6d3dfcd95a8b185e297

That was the first point where this stopped feeling like normal collaboration.

The sequence was simple: Dungeon Drifters' approach and implementation mechanism were demonstrated publicly. Ihor said he would develop it. I explicitly asked to contribute that implementation myself. The implementation then appeared under his commit, after which the role offered to me was review and testing.

Walking away at that point would have been understandable. Instead, I accepted the invitation in good faith and kept working.

## So I did the review, testing, and engineering

By October 20 at 01:06:54 UTC, that review had turned into considerably more than checking a README.

A focused contribution was prepared directly against `c3b5aae`, including:

- genuine declared-class identity for `StrEnum` members
- preservation of direct functional `StrEnum(...)` creation
- canonical lookup behavior
- declared methods
- class iteration
- ordinary string indexing and slicing
- full/mini builder-hook coexistence
- preservation of older aliases across fresh imports
- the missing mini enum length operation
- expanded regression coverage
- README/documentation updates
- validation on unmodified MicroPython 1.29.0 on Windows and Unix
- normal and `-O2` execution
- 21 full enum tests and 8 mini enum tests

The contribution summary is here:

https://github.com/micropython/micropython-lib/pull/980#issuecomment-6280910209

Less than an hour later, at 02:02:40 UTC, I opened an actual pull request against Ihor's `enum` branch:

**PR #1: `python-stdlib/enum: Improve StrEnum behavior and tests`**

https://github.com/IhorNehrutsa/micropython-lib/pull/1

The PR was based specifically on:

`c3b5aaeb61c33ee13c70a6d3dfcd95a8b185e297`

It contained one commit modifying 8 files with 542 additions and 88 deletions.

The description documented the implementation, tests, tradeoffs, supported behavior, stock-MicroPython limitations, and the cooperative `__build_class__` work.

At that point, everything seemed to have been done the right way. The problem had been analyzed publicly. Permission to contribute had been requested. Collaboration had been welcomed. The existing implementation had been tested, a focused patch had been written, and the pull request targeted a known base commit.

That should have been the point where the work could be reviewed together.

It was not.

## Eighteen and a half hours later

At 20:30:13 UTC on October 20, approximately 18½ hours after my PR was opened, Ihor pushed:

`3fac58bb330edfc6754cfa761d897e530091a675`

with the title:

`python-stdlib\enum: Bump to version="1.5.1".`

https://github.com/micropython/micropython-lib/pull/980/changes/3fac58bb330edfc6754cfa761d897e530091a675

This was not merely a version bump.

Among other things, it changed enum-member construction so the generated member inherited from both the raw value type and the enum class:

```python
(type(v), cls)
```

It also changed functional construction, member lookup, extension behavior, class initialization, the builder hook, and the representation and initialization of typed enum members.

Those were the same core implementation areas addressed by my submitted contribution.

Then, at 20:31:57 UTC, just 104 seconds later, another commit was pushed:

`1310b91d758edefb8de789d4abb5637a5967542b`

with the title:

`python-stdlib\enum_mini: Bump to version="1.5.1".`

https://github.com/micropython/micropython-lib/pull/980/changes/1310b91d758edefb8de789d4abb5637a5967542b

That commit substantially reworked `enum_mini.py`, including:

- enum-member inheritance from the declared enum class
- functional enum construction
- lookup behavior
- subclass-extension behavior
- `__len__`
- initialization
- the `__build_class__` mechanism

Again, the overlap was direct.

This was now the second time in the same short sequence that technical direction or implementation work had been contributed, followed by overlapping implementation moving directly into the branch under someone else's commits.

That was enough.

## What happened to my PR

The pull request had been created against `c3b5aae`.

Ihor's subsequent 1.5.1 commits advanced that same base branch and changed the same implementation files, leaving the contribution conflicted.

The overlap included:

- `python-stdlib/enum/CPy/CPy.py`
- `python-stdlib/enum/enum.py`
- `python-stdlib/enum/enum_check.py`
- `python-stdlib/enum/enum_mini.py`
- `python-stdlib/enum/enum_usage.py`
- `python-stdlib/enum/test_enum.py`
- `python-stdlib/enum/test_enum_mini.py`

My PR remained open, unmerged, and non-mergeable because the base branch changed underneath it.

That distinction matters. This was not a loose suggestion followed by somebody independently continuing their work weeks later. The code had already been submitted. The PR existed. The implementation areas were visible. The tests were visible. The tradeoffs were visible.

Within roughly 18½ hours, overlapping work was pushed directly into the branch the PR targeted.

## The attribution was eventually acknowledged

For completeness, the description of PR #980 was later edited to include:

> "@MrCodeGameandAnime Thank you very much. I catch the idea of immediate member availability after class definition from the DD’s enum implementation"

So the public PR itself now acknowledges that the immediate-member-availability idea came from Dungeon Drifters.

That acknowledgement matters because it establishes the provenance of that part of the work in the public record. It does not, however, undo the way the collaboration unfolded.

## Why I ended my involvement

The same basic pattern happened twice in a matter of days.

First came a public technical solution. Ihor said he would develop it. I explicitly asked to contribute the implementation myself. The implementation appeared under his authorship, and the role offered afterward was review and testing.

I accepted that anyway.

Then came substantial engineering, testing, documentation, and review work, followed by a focused pull request. Within approximately 18½ hours, overlapping implementation changes were again pushed directly into Ihor's branch under his own commits, changing the same core areas and displacing the contribution.

Those are not assumptions about anyone's intent. They are the publicly recorded sequence of comments, commits, timestamps, links, and pull requests. Anyone can review them and draw their own conclusions.

Under those circumstances, continuing to contribute implementation work, testing, review, debugging, research, or technical solutions no longer made sense, despite my extensive use of MicroPython in Dungeon Drifters and work informed by:

https://github.com/orgs/micropython/discussions/18291

The only goal was to help move Enum forward so Dungeon Drifters could eventually consume a maintained upstream implementation instead of relying on a local compatibility shim. The maintainers asked for a concrete use case, and Dungeon Drifters provided one through a real, active game, alongside implementation work, testing, and reproducible results.

The hope was simple: working with Ihor and demonstrating a real downstream need would show that the work was useful and that the community cared.

What I was not willing to do was repeatedly contribute substantial work into a structure where the end result was a pat on the back and an attaboy while the work itself was absorbed elsewhere.

PR #980 had already been stuck for months and had been open since 2025. A team could have gotten this done. Now it was back to one.

This situation is exactly why someone like me, who absolutely loves software, rarely works with other people. I gave faith, trust, and respect to the collaboration.

That was the end of my involvement.
