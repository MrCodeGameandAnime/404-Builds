---
name: beads-out-gameplay
description: Play Beads Out through Phone Link with native Windows Computer Use. Use visual reasoning, select only white-highlighted boxes, move briskly, and stop at the requested level boundary.
metadata:
  short-description: Play Beads Out via Phone Link
---

# Beads Out Gameplay

Use this skill when the user asks you to play or observe Beads Out on their mirrored Android screen in Phone Link.

## Controls and move selection

- Follow the bundled Computer Use skill and use native `node_repl` / `@oai/sky` for all Windows UI interaction. Do not substitute browser automation, ADB, scripts, coordinate macros, image-processing code, or external automation.
- Inspect the current Phone Link game window and level visually. **A box is selectable only when it has a white highlight.** Treat boxes without that highlight as unavailable; do not click them, even if their color seems like a good match.
- Among the white-highlighted boxes, choose a useful move based on the visible bead path and the game state. The highlight determines legality; color/path context helps choose between legal moves.
- Play at a brisk pace. Take one current screenshot, make one deliberate click on a highlighted box, then refresh the screen to verify the result and continue. Avoid repeated inspections or long waits when the game is ready for a move. Use only a brief pause when an animation needs time to settle.
- If no box is visibly highlighted, the board is obscured, or the next move cannot be identified confidently, do not guess. Re-observe once if needed, then ask the user or wait for their direction.
- Track approximate input count and distinguish registered moves from clicks that did not change the game state.

## User handoff and completion

- If the user takes over or asks you to watch, immediately stop all game input. Continue read-only observation only; do not resume playing unless asked.
- When the requested level shows a clear completion state (for example, a “Congrats” screen), stop playing. If asked not to start the next level, leave any Next/Continue control untouched. Do not infer that a reward button is safe to press if it could advance the game.
- Report whether the requested level completed, approximate interactions, and any control or visual difficulties. Be clear about anything that remains uncertain.
