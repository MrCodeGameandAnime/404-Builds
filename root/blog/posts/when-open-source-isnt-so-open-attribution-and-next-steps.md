---
title: "When Open Source Isn't So Open: Attribution and Next Steps"
date: 2026-11-03
description: Three further responses on MicroPython's enum work address contribution credit, shared tests, and the next steps for PR 980.
category: Commentary
draft: false
---

Read the original GitHub comments:

- [projectgus on attribution and the direction of the enum work](https://github.com/micropython/micropython-lib/pull/980#issuecomment-6618037373)
- [andrewleech on the CPython-based tests in PR #1061](https://github.com/micropython/micropython-lib/pull/980#issuecomment-6624696167)
- [IhorNehrutsa on continuing the work and handling contributions](https://github.com/micropython/micropython-lib/pull/980#issuecomment-6625468510)

The discussion around my contribution to MicroPython's enum work continued on November 3, with two further responses early on November 4. This entry is dated to the first comment and brings those three responses together.

## Attribution gets a concrete proposal

projectgus began by thanking both Ihor and me for our work. He acknowledged the difficulty of obtaining timely maintainer feedback and expressed appreciation for contributions that grow out of a real application's needs.

He understood attribution to be the main concern in my account. He also raised the distinction between Dungeon Drifters' proprietary code and the patch submitted through Ihor's fork, asking for confirmation that the contribution was intended to be MIT licensed for `micropython-lib`.

His proposed next step was specific: name the contributors through copyright statements in the relevant source files, pointing to the library's `cbor2` implementation as an example.

He also encouraged me to distinguish this experience from the wider MicroPython community, while acknowledging my decision to step away.

## The technical discussion continues

On enum support itself, projectgus considered both PR #980 and the alternative #1061 to need substantial work before an upstream merge. He nevertheless saw #980's approach as viable without first depending on interpreter metaclass support.

He identified porting CPython's enum tests as an outstanding task and offered more detailed review if Ihor wanted to continue.

andrewleech then pointed to CPython-based tests already included in his PR #1061 as potentially usable for this work. He explained that his implementation depends on proposed minimal metaclass support, with both interpreter and Python code contributing to its size.

## Ihor's response

Ihor confirmed that he was still working on the pull request and asked for time to prepare version 1.5.2.

He described his experience handling my pull request as unsuccessful in both technical and communication terms. He then asked andrewleech to submit the shared CPython/MicroPython test file to his enum branch and sought advice on handling such contributions.

These comments put several concrete next steps into the public discussion: contributor attribution in source files, reuse of existing tests, and further review. They record proposals and intentions, rather than confirmation that those steps have been completed.

For the earlier sequence, see [When Open Source Isn't So Open](./when-open-source-isnt-so-open.html) and [the October 29 follow-up](./when-open-source-isnt-so-open-follow-up.html).
