# Implementation Plan: Secure Dependency Management

## Overview

Migrate the Beltline Panic repository from npm to pnpm and harden the dependency supply chain. All changes are configuration-driven: `package.json` updates, `.npmrc` creation, CI workflow rewrites, Dependabot reconfiguration, a new auto-merge workflow, and dependency review enforcement. Each task builds incrementally so the repository is never left in a broken state.

## Tasks

- [x] 1. Migrate package manager from npm to pnpm
  - [x] 1.1 Update `package.json` with pnpm configuration
    - Add `"packageManager": "pnpm@10.11.0"` field (use latest stable pnpm 10.x at implementation time)
    - Add `"preinstall": "npx only-allow pnpm"` to the `scripts` section
    - Preserve all existing scripts (`dev`, `build`, `preview`, `lint`, `typecheck`, `test`) unchanged
    - _Requirements: 1.1, 1.2, 1.3, 9.5_

  - [x] 1.2 Create `.npmrc` with pnpm supply-chain settings
    - Create `.npmrc` in the project root
    - Add `onlyBuiltDependencies[]= ` to block lifecycle scripts by default with an empty allowlist
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 1.3 Generate `pnpm-lock.yaml` and remove `package-lock.json`
    - Run `pnpm install` to generate `pnpm-lock.yaml` from the existing `package.json` dependencies
    - Delete `package-lock.json` from the repository
    - Verify `pnpm-lock.yaml` is valid by running `pnpm install --frozen-lockfile`
    - _Requirements: 1.4, 1.5_

- [x] 2. Checkpoint — Verify local development workflow
  - Run `pnpm install`, `pnpm build`, `pnpm test`, `pnpm lint`, and `pnpm typecheck` to confirm all commands work correctly under pnpm
  - Verify that `npm install` is blocked by the preinstall guard
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 3. Update CI workflow (`ci.yml`) for pnpm
  - [x] 3.1 Rewrite `ci.yml` to use pnpm
    - Add `pnpm/action-setup@v4` step before `actions/setup-node@v4`
    - Change `actions/setup-node` cache from `'npm'` to `'pnpm'`
    - Update Node.js version to `'24'` to match other workflows
    - Replace `npm ci` with `pnpm install --frozen-lockfile`
    - Replace `npm run lint` with `pnpm lint`
    - Replace `npm run typecheck` with `pnpm typecheck`
    - Replace `npm run build` with `pnpm build`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.5_

  - [x] 3.2 Add dependency review enforcement to `ci.yml`
    - In the existing `dependency-review` job, add `fail-on-severity: low` to the `actions/dependency-review-action@v4` configuration
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 4. Update preview deployment workflow (`preview.yml`) for pnpm
  - Add `pnpm/action-setup@v4` step before `actions/setup-node@v4` in the `deploy-preview` job
  - Change `actions/setup-node` cache from `'npm'` to `'pnpm'`
  - Replace `npm ci` with `pnpm install --frozen-lockfile`
  - Replace `npm run build` with `pnpm build`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.2, 3.5_

- [x] 5. Update production deployment workflow (`deploy-pages.yml`) for pnpm
  - Add `pnpm/action-setup@v4` step before `actions/setup-node@v4`
  - Change `actions/setup-node` cache from `'npm'` to `'pnpm'`
  - Replace `npm ci` with `pnpm install --frozen-lockfile`
  - Replace `npm run build` with `pnpm build`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.3, 3.5_

- [x] 6. Update release workflow (`release.yml`) for pnpm
  - Add `pnpm/action-setup@v4` step before `actions/setup-node@v4`
  - Change `actions/setup-node` cache from `'npm'` to `'pnpm'`
  - Replace `npm ci` with `pnpm install --frozen-lockfile`
  - Replace `npm run build` with `pnpm build`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.4, 3.5_

- [x] 7. Checkpoint — Verify no npm references remain in workflows
  - Search all files in `.github/workflows/` for `npm ` and `cache: 'npm'` references
  - Confirm every workflow uses `pnpm/action-setup@v4`, `cache: 'pnpm'`, `pnpm install --frozen-lockfile`, and `pnpm <script>` commands
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 3.5_

- [x] 8. Reconfigure Dependabot for pnpm with cooldown policy
  - Update `.github/dependabot.yml`: change `package-ecosystem` from `"npm"` to `"pnpm"`
  - Add `cooldown:` section with `default-days: 3` to the pnpm ecosystem entry
  - Rename the group from `npm-minor-patch` to `minor-patch`
  - Keep the group filtering `minor` and `patch` update-types only (major updates stay separate as individual PRs)
  - Keep the `github-actions` ecosystem entry unchanged
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3_

- [x] 9. Create Dependabot auto-merge workflow
  - Create `.github/workflows/dependabot-auto-merge.yml`
  - Trigger on `pull_request` events
  - Set permissions: `contents: write`, `pull-requests: write`
  - Guard the job with `if: github.actor == 'dependabot[bot]'`
  - Use `gh pr merge --auto --squash "$PR_URL"` with `GITHUB_TOKEN`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 10. Final checkpoint — Full verification
  - Run `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck` to confirm everything works
  - Verify `package-lock.json` does not exist
  - Verify `pnpm-lock.yaml` exists
  - Verify `.npmrc` exists with `onlyBuiltDependencies` setting
  - Verify `package.json` has `packageManager` field and `preinstall` guard
  - Verify all four workflows use pnpm setup pattern
  - Verify `dependabot.yml` uses `pnpm` ecosystem with cooldown
  - Verify `dependabot-auto-merge.yml` exists with correct configuration
  - Verify `ci.yml` dependency-review job has `fail-on-severity: low`
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 1.1–1.5, 2.1–2.4, 3.1–3.5, 4.1–4.6, 5.1–5.3, 6.1–6.6, 7.1–7.4, 8.1–8.4, 9.1–9.5_

## Notes

- All changes are configuration files — no application code is modified
- Property-based testing does not apply to this feature (no executable business logic)
- Each task builds on previous tasks; the repository should remain functional after each step
- Checkpoints verify incremental progress before moving to the next phase
- The `pnpm/action-setup@v4` action reads the `packageManager` field from `package.json` automatically — no version parameter needed
- Security updates bypass the Dependabot cooldown by default (built-in Dependabot behavior)
- The auto-merge workflow relies on existing branch protection rules to gate actual merges
