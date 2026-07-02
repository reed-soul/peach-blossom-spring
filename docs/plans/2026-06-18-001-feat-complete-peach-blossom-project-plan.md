---
title: "feat: Complete Peach Blossom Spring interactive experience"
date: 2026-06-18
execution: code
---

# Complete Peach Blossom Spring Project

## Summary

Turn the vertical slice into a shippable interactive experience: full narrative arc of 《桃花源记》, consistent ink-wash 3D worlds, ink-driven dialogue, meaningful endings, and production-ready engineering.

## Problem Frame

The project demonstrates the core idea (explore → cave → village → choice) but lacks narrative depth, scene consistency, bug fixes, documentation, and engineering hygiene. The original intent is an **interactive immersive 3D retelling** where the player lives the fisherman's journey.

## Requirements

| ID | Requirement |
|----|-------------|
| R1 | Player completes menu → opening → forest → cave → village → ending without bugs |
| R2 | Village visuals match forest quality (terrain, ink wash, atmosphere) |
| R3 | Dialogue is data-driven via inkjs, not hardcoded strings |
| R4 | `storyState` drives NPC reactions and ending variants |
| R5 | Return ending reflects原文「遂迷，不复得路」as playable epilogue |
| R6 | README documents vision, controls, and local dev |
| R7 | CI runs build + unit tests on push |
| R8 | No dead code, accurate tech claims (WebGL not WebGPU) |

## Key Technical Decisions

1. **Navigation** — Replace `window.__sceneGoTo` with `src/engine/navigation.ts` module.
2. **Ink** — Compile `content/narrative/*.ink` to JSON at build time; runtime loads via inkjs `Story`.
3. **Rapier** — Pin `@react-three/rapier@1.4.0` for `@react-three/fiber@8` compatibility.
4. **VR** — Remove orphaned `PeachForestVR` and `@react-three/xr` (defer full VR to follow-up).
5. **Tests** — Vitest for store, navigation, and ink choice parsing.

## Implementation Units

### U1. Foundation — docs, navigation, bug fixes

**Goal:** Trustworthy core loop and project README.

**Files:** `README.md`, `src/engine/navigation.ts`, `src/engine/SceneManager.tsx`, `src/components/scenes/PeachForestScene.tsx`, `src/components/scenes/EndingScene.tsx`, `src/components/ui/MainMenu.tsx`

**Verification:** Restart from ending returns to menu; cave E only works in range; menu tech label accurate.

### U2. Narrative — inkjs integration

**Goal:** Village dialogue and choices driven by ink stories.

**Files:** `content/narrative/village.ink`, `src/narrative/`, `src/components/scenes/VillageScene.tsx`

**Verification:** NPC lines and choices load from ink; choices update `storyState`.

### U3. Village scene visual parity

**Goal:** Village uses shared world systems (terrain, trees, stream, ink wash).

**Files:** `src/components/scenes/VillageScene.tsx`, `src/components/world/VillageTerrain.tsx`

**Verification:** Village no longer uses flat green plane as primary ground.

### U4. Epilogue and ending depth

**Goal:** Return path includes epilogue scene; stay/return endings reflect choices.

**Files:** `src/components/scenes/EpilogueScene.tsx`, `src/store/useGameStore.ts`, `src/engine/SceneManager.tsx`

**Verification:** Choosing return shows epilogue before final ending text.

### U5. Engineering — deps, CI, tests

**Goal:** Clean install, automated checks, remove unused deps.

**Files:** `package.json`, `.github/workflows/ci.yml`, `vitest.config.ts`, `src/**/*.test.ts`

**Verification:** `npm ci && npm test && npm run build` passes.

## Scope Boundaries

### Deferred to Follow-Up Work

- Full WebXR VR mode
- WebGPU renderer migration
- Footstep audio hookup
- Localization beyond zh-CN

### Outside this product's identity

- Multiplayer, combat, inventory systems
