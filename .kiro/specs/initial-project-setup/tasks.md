# Implementation Plan: Initial Project Setup

## Overview

Bootstrap the Beltline Panic repository as a fully operational Phaser 3 + TypeScript + Vite project with CI/CD workflows, a minimal working scene, and structural tests. Each task builds incrementally toward a runnable, deployable project.

## Tasks

- [x] 1. Create package.json and project configuration files
  - Write `package.json` with name `beltline-panic`, version `0.0.1`, private true
  - Declare `phaser` as a runtime dependency
  - Declare `typescript`, `vite`, `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `vitest`, `fast-check` as devDependencies
  - Add all five scripts: `dev` → `vite`, `build` → `tsc --noEmit && vite build`, `preview` → `vite preview`, `lint` → `eslint src/`, `typecheck` → `tsc --noEmit`
  - Write `tsconfig.json` with `target: "ES2020"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `strict: true`, `lib: ["ES2020", "DOM", "DOM.Iterable"]`, `skipLibCheck: true`, `noEmit: true`
  - Write `vite.config.ts` with `base: './'` and `build.outDir: 'dist'`
  - _Requirements: 1.1, 1.2, 1.5, 1.6, 2.1, 2.2, 2.3, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2. Create index.html and .gitignore
  - Write `index.html` as the Vite build root with a single `<script type="module" src="/src/main.ts">` tag and no inline canvas markup
  - Write `.gitignore` excluding `dist/`, `node_modules/`, `.DS_Store`, `.vscode/`, `.env`, `.env.local`, `.env.*.local`
  - _Requirements: 1.7, 5.1, 5.2, 5.3, 5.4_

- [x] 3. Create source directory structure
  - Create `src/scenes/`, `src/systems/`, `src/objects/`, `src/ui/`, `src/data/`, `src/utils/` with `.gitkeep` placeholders in each empty directory
  - Create `public/` directory with a `.gitkeep` placeholder
  - _Requirements: 3.1, 3.4_

- [x] 4. Implement InitialScene
  - Write `src/scenes/InitialScene.ts` as a Phaser `Scene` subclass
  - In `create()`, add centered text "Beltline Panic" using `this.add.text` with `this.scale.width / 2` and `this.scale.height / 2`, origin `0.5`
  - Add "© s3-d1" below the title using `this.add.text`, offset downward from center, origin `0.5`
  - Include no `preload()` method and load no external assets
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. Implement Bootstrap (src/main.ts)
  - Write `src/main.ts` defining `GameConfig` with `type: Phaser.AUTO`, `width: 800`, `height: 600`, `backgroundColor: '#1a1a2e'`, `scene: [InitialScene]`
  - Wrap `new Phaser.Game(config)` in a try/catch that calls `console.error` with a descriptive message on failure
  - Add a clearly marked comment block `// [YOUTUBE PLAYABLES] SDK load point` before game instantiation
  - Add a clearly marked comment block `// [YOUTUBE PLAYABLES] Ready signal` after game instantiation
  - _Requirements: 3.2, 4.4, 4.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 6. Create ESLint configuration
  - Write `eslint.config.js` using flat config format with `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser`
  - Target `src/**/*.ts` files only
  - Use a minimal rule set focused on catching real errors, no Prettier integration
  - _Requirements: 2.4, 2.5_

- [x] 7. Checkpoint — verify local dev and build work
  - Ensure `npm install` completes without errors
  - Ensure `npm run lint` exits 0 on the clean source
  - Ensure `npm run typecheck` exits 0
  - Ensure `npm run build` produces `dist/index.html`
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 8. Write structural tests and property test
  - [x] 8.1 Write package.json structural checks using vitest
    - Assert `phaser` is in `dependencies`
    - Assert `typescript`, `vite`, `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser` are in `devDependencies`
    - Assert all five scripts are present with correct commands
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 8.2 Write tsconfig.json and vite.config.ts structural checks
    - Assert `strict: true`, `lib` includes `"DOM"`, `target` is `"ES2020"`, `noEmit: true` in tsconfig
    - Assert `base` is `'./'` and `build.outDir` is `'dist'` in vite config (read as text, check for presence of values)
    - _Requirements: 1.5, 1.6_

  - [x] 8.3 Write source structure checks
    - Assert all six `src/` subdirectories exist
    - Assert `src/scenes/InitialScene.ts` exists
    - Assert `public/` directory exists
    - _Requirements: 3.1, 3.3, 3.4_

  - [x] 8.4 Write bootstrap content checks
    - Read `src/main.ts` and assert it contains `new Phaser.Game`
    - Assert `GameConfig` includes `type`, `width`, `height`, `backgroundColor`
    - Assert `[YOUTUBE PLAYABLES]` SDK load point comment is present before game instantiation
    - Assert `[YOUTUBE PLAYABLES]` ready signal comment is present after game instantiation
    - _Requirements: 3.2, 4.4, 11.1, 11.2, 11.4_

  - [x] 8.5 Write InitialScene content checks
    - Read `src/scenes/InitialScene.ts` and assert it calls `this.add.text` with `"Beltline Panic"`
    - Assert it calls `this.add.text` with `"© s3-d1"`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 8.6 Write .gitignore checks
    - Read `.gitignore` and assert it contains `dist/`, `node_modules/`, `.DS_Store`, `.vscode/`, `.env`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 8.7 Write property test for build output (Property 1)
    - **Property 1: Build output contains no Playables SDK references**
    - Run `npm run build`, then scan all files in `dist/` for known SDK patterns: `playables`, `ytgame`, `youtube.com/playables`
    - Assert zero matches across all output files
    - Use `fast-check` with `vitest` to frame this as a verifiable property
    - **Validates: Requirements 11.5**

- [x] 9. Create CI workflow
  - Write `.github/workflows/ci.yml` triggering on `pull_request` targeting `main` and `push` to `main`
  - Define a `ci` job with steps: checkout, setup-node (with npm cache), `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`, upload-artifact (`dist/`, 7-day retention)
  - Define a `dependency-review` job that runs only on `pull_request` events using `actions/dependency-review-action`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 10. Create preview deployment workflow
  - Write `.github/workflows/preview.yml` triggering on `pull_request` events: `opened`, `synchronize`, `reopened`, `closed`
  - Define a `deploy-preview` job (runs when action is not `closed`) that builds and deploys to a GitHub Pages preview environment, posting the URL as a deployment status
  - Define a `deactivate-preview` job (runs when action is `closed`) that deactivates the preview deployment
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 11. Create production deploy workflow
  - Write `.github/workflows/deploy-pages.yml` triggering on `push` to `main`
  - Define a single job that builds the project and deploys `dist/` to the GitHub Pages `production` environment
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 12. Create release workflow
  - Write `.github/workflows/release.yml` triggering via `workflow_dispatch` with a required `version` string input (e.g. `v0.1.0`)
  - Define a job that runs `npm ci`, `npm run build`, zips the `dist/` output, creates a GitHub Release tagged with the version input, and attaches the ZIP as a release asset
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 13. Final checkpoint — ensure all tests pass
  - Ensure all vitest tests pass with `vitest --run`
  - Ensure `npm run lint` exits 0
  - Ensure `npm run build` succeeds and `dist/index.html` is present
  - Ensure all four workflow files exist under `.github/workflows/`
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property 1 validates that Playables scaffolding never leaks into the production build
- Integration checks (build, lint) run as CI steps; unit/property tests run via `vitest --run`
