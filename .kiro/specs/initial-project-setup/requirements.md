# Requirements Document

## Introduction

This feature initializes the Beltline Panic repository as a production-aware Phaser 3 + TypeScript + Vite game project. The setup must support a solo jam workflow: fast local iteration, reliable static builds, automated CI, preview deployments on pull requests, production deployment from `main`, and a manual release workflow. The initial scene renders the game title and copyright notice. YouTube Playables compatibility scaffolding is included as a non-blocking layer that does not interfere with the primary web build.

## Glossary

- **Project**: The Beltline Panic repository and all its source, config, and workflow files.
- **Vite**: The build tool used for local development and production static output.
- **Phaser**: Phaser 3, the game framework used for all rendering and scene management.
- **Bootstrap**: The minimal entry point that initializes the Phaser game instance.
- **InitialScene**: The single Phaser scene rendered at startup, showing the title and copyright text.
- **CI**: The GitHub Actions continuous integration workflow (`ci.yml`).
- **PreviewWorkflow**: The GitHub Actions workflow (`preview.yml`) that deploys a preview build on every pull request.
- **DeployWorkflow**: The GitHub Actions workflow (`deploy-pages.yml`) that deploys the production build from `main` to GitHub Pages.
- **ReleaseWorkflow**: The GitHub Actions workflow (`release.yml`) that creates a versioned release via `workflow_dispatch`.
- **PlayablesSDK**: The YouTube Playables JavaScript SDK, loaded conditionally before game code.
- **StaticBuild**: The output of `npm run build`, a self-contained directory of static web files.
- **Artifact**: A zipped build package attached to a CI run or GitHub Release.

---

## Requirements

### Requirement 1: Project Initialization

**User Story:** As a developer, I want the repository initialized as a Phaser 3 + TypeScript + Vite project, so that I can run the game locally and produce a static web build immediately.

#### Acceptance Criteria

1. THE Project SHALL include a `package.json` that declares Phaser 3, TypeScript, and Vite as dependencies.
2. WHEN `npm install` is executed, THE Project SHALL install all declared dependencies without errors.
3. WHEN `npm run dev` is executed, THE Vite SHALL start a local development server with hot reload enabled.
4. WHEN `npm run build` is executed, THE Vite SHALL produce a StaticBuild in the `dist/` directory.
5. THE Project SHALL include a `tsconfig.json` configured for browser targets, strict mode, and Phaser 3 compatibility.
6. THE Project SHALL include a `vite.config.ts` that sets the build output directory to `dist/` and configures a base path compatible with GitHub Pages deployment.
7. THE Project SHALL include an `index.html` entry point that loads the Bootstrap module.

---

### Requirement 2: Dependency Setup

**User Story:** As a developer, I want a minimal, well-configured dependency set, so that the project stays lean and easy to audit during the jam.

#### Acceptance Criteria

1. THE `package.json` SHALL declare Phaser 3 as a runtime dependency.
2. THE `package.json` SHALL declare TypeScript and Vite as development dependencies.
3. THE `package.json` SHALL NOT declare dependencies unrelated to building, linting, or running the game.
4. THE Project SHALL include an ESLint configuration compatible with TypeScript source files.
5. WHEN `npm run lint` is executed, THE ESLint SHALL check all TypeScript files under `src/` and report violations.

---

### Requirement 3: Source Structure

**User Story:** As a developer, I want the source directory to match the documented architecture, so that future scenes and systems have a clear home from the start.

#### Acceptance Criteria

1. THE Project SHALL include the following directories: `src/scenes/`, `src/systems/`, `src/objects/`, `src/ui/`, `src/data/`, `src/utils/`.
2. THE Bootstrap SHALL reside at `src/main.ts` and initialize the Phaser game instance with the InitialScene.
3. THE InitialScene SHALL reside at `src/scenes/InitialScene.ts`.
4. THE Project SHALL include a `public/` directory for static assets served by Vite without processing.

---

### Requirement 4: Initial Scene

**User Story:** As a developer, I want a minimal working Phaser scene at startup, so that I can confirm the game renders correctly before building further.

#### Acceptance Criteria

1. WHEN the game loads in a browser, THE InitialScene SHALL display the text "Beltline Panic" centered on the canvas.
2. WHEN the game loads in a browser, THE InitialScene SHALL display the text "© s3-d1" below the title text.
3. THE InitialScene SHALL use a single Phaser scene only and SHALL NOT load external assets.
4. THE Bootstrap SHALL configure the Phaser game with a canvas renderer, a defined width and height, and a background color.
5. IF the browser canvas context cannot be created, THEN THE Bootstrap SHALL log an error to the browser console.

---

### Requirement 5: Project-Specific .gitignore

**User Story:** As a developer, I want a project-specific `.gitignore`, so that build artifacts, local config, and editor files are never committed.

#### Acceptance Criteria

1. THE `.gitignore` SHALL exclude the `dist/` directory.
2. THE `.gitignore` SHALL exclude the `node_modules/` directory.
3. THE `.gitignore` SHALL exclude common editor and OS metadata files including `.DS_Store` and `.vscode/` local settings.
4. THE `.gitignore` SHALL exclude environment files such as `.env` and `.env.local`.

---

### Requirement 6: npm Scripts

**User Story:** As a developer, I want a consistent set of npm scripts, so that all common tasks are accessible without memorizing tool-specific commands.

#### Acceptance Criteria

1. THE `package.json` SHALL declare a `dev` script that starts the Vite development server.
2. THE `package.json` SHALL declare a `build` script that runs the TypeScript compiler check followed by the Vite production build.
3. THE `package.json` SHALL declare a `preview` script that serves the StaticBuild locally using Vite's preview server.
4. THE `package.json` SHALL declare a `lint` script that runs ESLint over `src/`.
5. THE `package.json` SHALL declare a `typecheck` script that runs `tsc --noEmit` to validate types without emitting files.

---

### Requirement 7: CI Workflow

**User Story:** As a developer, I want a CI workflow that runs on every pull request and push to `main`, so that broken builds and lint failures are caught before merging.

#### Acceptance Criteria

1. THE CI SHALL trigger on pull requests targeting `main` and on pushes to `main`.
2. WHEN triggered, THE CI SHALL execute the following steps in order: install dependencies, run lint, run typecheck, run build.
3. IF any CI step fails, THEN THE CI SHALL mark the workflow run as failed and block the pull request from merging.
4. THE CI SHALL run a dependency review step on pull requests to detect newly introduced vulnerable dependencies.
5. WHEN the build step succeeds, THE CI SHALL upload the `dist/` directory as a workflow artifact.
6. THE CI workflow file SHALL reside at `.github/workflows/ci.yml`.

---

### Requirement 8: Preview Deployment Workflow

**User Story:** As a developer, I want every pull request to produce a preview deployment, so that I can review gameplay changes before merging to `main`.

#### Acceptance Criteria

1. THE PreviewWorkflow SHALL trigger on pull request events: `opened`, `synchronize`, and `reopened`.
2. WHEN triggered, THE PreviewWorkflow SHALL build the project and deploy the StaticBuild to a GitHub Pages preview environment.
3. WHEN a pull request is closed or merged, THE PreviewWorkflow SHALL deactivate the associated preview deployment.
4. THE PreviewWorkflow SHALL post the preview URL as a comment or deployment status on the pull request.
5. THE PreviewWorkflow file SHALL reside at `.github/workflows/preview.yml`.

---

### Requirement 9: Production Deployment Workflow

**User Story:** As a developer, I want every successful merge to `main` to automatically deploy the production build to GitHub Pages, so that the live build is always current.

#### Acceptance Criteria

1. THE DeployWorkflow SHALL trigger on pushes to `main`.
2. WHEN triggered, THE DeployWorkflow SHALL build the project and deploy the StaticBuild to the GitHub Pages production environment.
3. THE DeployWorkflow SHALL use the `production` GitHub Actions environment for deployment.
4. THE DeployWorkflow file SHALL reside at `.github/workflows/deploy-pages.yml`.

---

### Requirement 10: Release Workflow

**User Story:** As a developer, I want a manually triggered release workflow, so that I can create versioned releases and attach build artifacts for itch.io delivery.

#### Acceptance Criteria

1. THE ReleaseWorkflow SHALL trigger via `workflow_dispatch` with a required input for the release version tag.
2. WHEN triggered, THE ReleaseWorkflow SHALL build the project and package the StaticBuild as a ZIP Artifact.
3. WHEN the build succeeds, THE ReleaseWorkflow SHALL create a GitHub Release tagged with the provided version input.
4. THE ReleaseWorkflow SHALL attach the ZIP Artifact to the GitHub Release as a release asset.
5. THE ReleaseWorkflow file SHALL reside at `.github/workflows/release.yml`.

---

### Requirement 11: YouTube Playables Compatibility Scaffolding

**User Story:** As a developer, I want YouTube Playables compatibility scaffolding in place from the start, so that adapting the game for Playables later does not require restructuring the entry point.

#### Acceptance Criteria

1. THE Bootstrap SHALL include a clearly marked section where the PlayablesSDK can be loaded before the Phaser game instance is created.
2. THE Bootstrap SHALL include a clearly marked call site where the game-ready signal can be sent to the PlayablesSDK after the Phaser game instance is initialized.
3. WHERE the PlayablesSDK is not present, THE Bootstrap SHALL initialize the Phaser game normally without errors.
4. THE Bootstrap SHALL include inline comments identifying the PlayablesSDK load point and the ready signal call site.
5. THE Project SHALL NOT load the PlayablesSDK by default in the initial setup; the scaffolding SHALL be present as commented or conditional code only.
