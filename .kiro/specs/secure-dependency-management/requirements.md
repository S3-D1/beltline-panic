# Requirements Document

## Introduction

This feature hardens dependency management and reduces software supply-chain risk for the Beltline Panic repository. The repository currently uses npm with `package-lock.json`, four GitHub Actions workflows (`ci.yml`, `preview.yml`, `deploy-pages.yml`, `release.yml`), and a Dependabot configuration for npm and GitHub Actions ecosystems.

The migration replaces npm with pnpm as the sole package manager, enforces lockfile-based deterministic installs, adds supply-chain safeguards, configures a delayed Dependabot update policy with auto-merge for low-risk updates, and updates all CI/CD workflows accordingly. The repository is a solo-developed browser game jam project, so the implementation must remain practical, explicit, and maintainable.

## Glossary

- **Package_Manager_Guard**: A preinstall script in `package.json` that detects the running package manager and blocks execution when npm or yarn is used, requiring pnpm instead.
- **CI_Pipeline**: The set of GitHub Actions workflows that run on pull requests and pushes to `main`, including lint, typecheck, build, test, and dependency review jobs.
- **Dependabot**: GitHub's built-in dependency update automation service, configured through `.github/dependabot.yml`.
- **Dependabot_Auto_Merge_Workflow**: A GitHub Actions workflow that automatically enables auto-merge on pull requests opened by Dependabot, relying on existing branch protection and required status checks to gate the actual merge.
- **Dependency_Review_Action**: The `actions/dependency-review-action` GitHub Action that scans pull request dependency changes for known vulnerabilities and license issues.
- **Lockfile**: The `pnpm-lock.yaml` file that pins exact dependency versions and integrity hashes for reproducible installs.
- **Corepack**: A Node.js built-in tool that manages package manager versions based on the `packageManager` field in `package.json`.
- **Cooldown_Period**: The minimum time Dependabot waits after a new dependency version is published before proposing an update, configured via the `cooldown` option in `dependabot.yml`.
- **Lifecycle_Scripts**: Scripts defined in dependency packages (e.g., `postinstall`, `preinstall`) that run automatically during installation, representing a supply-chain attack vector.
- **Trusted_Dependencies_Allowlist**: An explicit list of packages in `.pnpmrc` or pnpm configuration that are permitted to run lifecycle scripts during install, while all others are blocked.

## Requirements

### Requirement 1: Migrate to pnpm as sole package manager

**User Story:** As a developer, I want pnpm to be the only supported package manager, so that installs are faster, disk-efficient, and use a strict dependency resolution model.

#### Acceptance Criteria

1. THE Package_Manager_Guard SHALL block execution and print an error message when the install command is run using npm or yarn.
2. THE `package.json` SHALL declare a `packageManager` field specifying the exact pnpm version in Corepack-compatible format (e.g., `pnpm@9.x.x`).
3. WHEN a developer runs `corepack enable` and then `pnpm install`, THE Corepack tool SHALL activate the pnpm version declared in the `packageManager` field.
4. THE repository SHALL contain a committed `pnpm-lock.yaml` Lockfile and SHALL NOT contain a `package-lock.json` file.
5. WHEN `pnpm install` is run in the repository root, THE pnpm package manager SHALL produce a `node_modules` directory and a `pnpm-lock.yaml` Lockfile that are consistent with the declared dependencies.

### Requirement 2: Enforce lockfile-based deterministic installs in CI

**User Story:** As a developer, I want CI to use frozen lockfile installs, so that builds are reproducible and never silently modify dependency versions.

#### Acceptance Criteria

1. WHEN the CI_Pipeline runs an install step, THE CI_Pipeline SHALL use `pnpm install --frozen-lockfile` to install dependencies.
2. IF the Lockfile is out of sync with `package.json`, THEN THE CI_Pipeline SHALL fail the install step with a non-zero exit code.
3. THE CI_Pipeline SHALL enable Corepack before running pnpm commands so that the correct pnpm version is used.
4. WHEN the CI_Pipeline sets up Node.js caching, THE CI_Pipeline SHALL configure the cache for pnpm instead of npm.

### Requirement 3: Update all GitHub workflows for pnpm

**User Story:** As a developer, I want all GitHub Actions workflows to use pnpm, so that CI, preview deployments, production deployments, and releases all use the same package manager as local development.

#### Acceptance Criteria

1. WHEN the CI workflow (`ci.yml`) runs, THE CI_Pipeline SHALL use pnpm for dependency installation, linting, typechecking, and building.
2. WHEN the preview deployment workflow (`preview.yml`) runs, THE preview workflow SHALL use pnpm for dependency installation and building.
3. WHEN the production deployment workflow (`deploy-pages.yml`) runs, THE deployment workflow SHALL use pnpm for dependency installation and building.
4. WHEN the release workflow (`release.yml`) runs, THE release workflow SHALL use pnpm for dependency installation and building.
5. THE CI_Pipeline SHALL NOT reference npm in any install, build, lint, typecheck, or test commands across all four workflows.

### Requirement 4: Configure Dependabot for pnpm with cooldown policy

**User Story:** As a developer, I want Dependabot to use the pnpm ecosystem and delay version update proposals, so that newly released versions have time to surface issues before being proposed.

#### Acceptance Criteria

1. THE Dependabot configuration SHALL specify `pnpm` as the package ecosystem instead of `npm`.
2. THE Dependabot configuration SHALL set a Cooldown_Period of at least 2 days for version updates, as the closest safe built-in option to the requested 36-hour delay.
3. THE Dependabot configuration SHALL continue to schedule GitHub Actions ecosystem updates on a weekly basis.
4. WHEN a new dependency version is published, THE Dependabot service SHALL wait at least the configured Cooldown_Period before opening a version update pull request.
5. THE Dependabot configuration SHALL group minor and patch updates together to reduce pull request noise.
6. THE Dependabot configuration SHALL keep major version updates separate from minor and patch updates so that breaking changes are reviewed individually.

### Requirement 5: Preserve fast security updates

**User Story:** As a developer, I want security updates to remain fast and not be delayed by the version update cooldown, so that known vulnerabilities are patched promptly.

#### Acceptance Criteria

1. THE Dependabot configuration SHALL NOT apply the Cooldown_Period to security updates.
2. WHEN a security advisory is published for a dependency, THE Dependabot service SHALL open a security update pull request without waiting for the cooldown to expire.
3. THE Dependabot configuration SHALL keep security updates ungrouped so that each vulnerability fix is reviewed individually.

### Requirement 6: Auto-merge Dependabot pull requests

**User Story:** As a developer, I want Dependabot pull requests to be automatically set to auto-merge, so that low-risk dependency updates land without manual intervention once all checks pass.

#### Acceptance Criteria

1. WHEN Dependabot opens a pull request, THE Dependabot_Auto_Merge_Workflow SHALL automatically enable auto-merge on that pull request.
2. THE Dependabot_Auto_Merge_Workflow SHALL only enable auto-merge on pull requests authored by Dependabot.
3. WHILE auto-merge is enabled on a Dependabot pull request, THE repository branch protection SHALL require all required status checks to pass before the merge is executed.
4. THE Dependabot_Auto_Merge_Workflow SHALL use the repository's existing branch protection rules and required checks rather than bypassing them.
5. THE Dependabot_Auto_Merge_Workflow SHALL use squash merge to maintain linear history consistent with the repository's merge policy.
6. IF a required status check fails on a Dependabot pull request, THEN THE repository branch protection SHALL block the merge even though auto-merge is enabled.

### Requirement 7: Dependency review enforcement in pull requests

**User Story:** As a developer, I want pull requests to be checked for known vulnerable dependencies before merge, so that vulnerabilities are caught during review rather than after deployment.

#### Acceptance Criteria

1. WHEN a pull request is opened against `main`, THE Dependency_Review_Action SHALL scan the dependency changes for known vulnerabilities.
2. IF the Dependency_Review_Action detects a dependency with a known vulnerability, THEN THE Dependency_Review_Action SHALL fail the check and block the merge.
3. THE Dependency_Review_Action SHALL be configured to fail on vulnerabilities with severity "low" or higher.
4. THE Dependency_Review_Action SHALL run as a required status check in the CI_Pipeline for pull requests.

### Requirement 8: Restrict lifecycle script execution

**User Story:** As a developer, I want install-time lifecycle scripts from third-party packages to be blocked by default, so that untrusted code does not execute automatically during dependency installation.

#### Acceptance Criteria

1. THE pnpm configuration SHALL disable automatic execution of Lifecycle_Scripts from third-party dependencies by default.
2. WHERE a dependency requires lifecycle scripts to function correctly, THE Trusted_Dependencies_Allowlist SHALL explicitly list that dependency as permitted to run scripts.
3. WHEN `pnpm install` is run and a non-allowlisted dependency contains lifecycle scripts, THE pnpm package manager SHALL skip those scripts without failing the install.
4. THE Trusted_Dependencies_Allowlist SHALL be maintained in a committed configuration file (`.npmrc` or pnpm workspace configuration) so that allowances are version-controlled and reviewable.

### Requirement 9: Keep local development workflow functional

**User Story:** As a developer, I want the local development workflow to remain fast and simple after the migration, so that the jam-friendly development experience is preserved.

#### Acceptance Criteria

1. WHEN a developer runs `pnpm install` followed by `pnpm dev`, THE Vite development server SHALL start and serve the game locally.
2. WHEN a developer runs `pnpm build`, THE Vite build tool SHALL produce a production build in the `dist/` directory.
3. WHEN a developer runs `pnpm test`, THE Vitest test runner SHALL execute all tests and report results.
4. WHEN a developer runs `pnpm lint`, THE ESLint linter SHALL check all source files and report results.
5. THE `package.json` scripts section SHALL preserve all existing script commands (`dev`, `build`, `preview`, `lint`, `typecheck`, `test`) with equivalent behavior under pnpm.
