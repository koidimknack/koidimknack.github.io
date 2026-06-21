# Vue Three Ball Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-file 2D canvas page with a minimal Vue/Vite app that renders a full-screen Three.js bouncing ball prototype whose tilt responds to pointer position.

**Architecture:** Keep the app small: Vue owns lifecycle and controls, Three.js owns rendering, and pure JavaScript helpers own testable movement math. The first prototype uses a generated sphere mesh rather than external 3D assets so the concept can be tested before adding face scans.

**Tech Stack:** Vue 3, Vite, Three.js, Vitest, Playwright-based browser verification.

---

### Task 1: Branch And Dependencies

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `.gitignore`

- [x] **Step 1: Create branch**

Run: `git checkout -b codex/vue-three-ball-prototype`
Expected: branch switches from `main` to `codex/vue-three-ball-prototype`.

- [ ] **Step 2: Add minimal Vue/Vite dependency metadata**

Add `package.json` with scripts for `dev`, `build`, and `test`, plus runtime dependencies `@vitejs/plugin-vue`, `vite`, `vue`, `three`, and `vitest`.

### Task 2: Testable Scene Logic

**Files:**
- Create: `src/scene/ballMotion.js`
- Create: `src/scene/ballMotion.test.js`

- [ ] **Step 1: Write tests first**

Cover pointer normalization, tilt target mapping, velocity integration, and viewport-bound bouncing.

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- --run`
Expected: fail because `src/scene/ballMotion.js` does not exist yet.

- [ ] **Step 3: Implement minimal pure helpers**

Implement `clamp`, `normalizePointer`, `getTiltForPointer`, and `stepBall`.

- [ ] **Step 4: Verify tests pass**

Run: `npm test -- --run`
Expected: all tests pass.

### Task 3: Vue Three.js App

**Files:**
- Replace: `index.html`
- Create: `src/main.js`
- Create: `src/App.vue`
- Create: `src/scene/createBouncingBallScene.js`

- [ ] **Step 1: Add Vue mount shell**

Make `index.html` only mount `<div id="app"></div>` and load `/src/main.js`.

- [ ] **Step 2: Build full-screen Three.js scene component**

Use a Vue component with a canvas ref. Initialize renderer, camera, lights, a sphere mesh, pointer tracking, resize handling, animation loop, and cleanup.

- [ ] **Step 3: Preserve a simple speed control**

Expose a bottom overlay range input that changes the speed factor used by the animation loop.

### Task 4: Verification

**Files:**
- No new files expected.

- [ ] **Step 1: Run unit tests**

Run: `npm test -- --run`
Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Vite build exits with code 0 and emits `dist`.

- [ ] **Step 3: Run browser visual check**

Run: `npm run dev -- --host 127.0.0.1`
Open local app, verify the page has a nonblank Three.js canvas on desktop and mobile viewport, and inspect pixels to confirm rendered content changes over time.
