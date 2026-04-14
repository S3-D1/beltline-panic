# GitHub Usage

## Purpose

This document defines the GitHub workflow for **Beltline Panic**.

The repository uses a **feature-branch workflow** with pull requests, automated CI, preview deployments, and controlled releases. The goal is a clean `main` branch, fast review cycles, and repeatable delivery to GitHub Pages and itch.io.

---

## Branch Strategy

### Main branch
- `main` is always deployable
- direct pushes to `main` are not allowed
- all changes go through pull requests

### Feature branches
Use short-lived branches from `main`, for example:

- `feature/conveyor-loop`
- `feature/machine-input`
- `feature/upgrade-terminal`
- `fix/queue-overflow`
- `chore/deps`

Each branch should contain one focused change only.

---

## Pull Request Workflow

1. Create a feature branch from `main`
2. Implement the change
3. Rebase the branch onto the latest `main`
4. Open a pull request
5. Let CI run:
   - build
   - tests
   - SCA / dependency checks
6. Review the preview deployment
7. Merge only when checks are green

### PR rules
- pull requests are required for `main`
- required status checks must pass
- linear history is enforced
- merge commits are not used

---

## Rebase + Squash Policy

Before merge:
- rebase the feature branch onto the latest `main`

At merge time:
- use **Squash and merge**

This keeps the branch history clean during development and keeps `main` readable after merge.

### Commit guidance
- local feature branches may contain work-in-progress commits
- the final PR title should be clean enough to become the squashed commit message

---

## Preview Deployments

Every pull request should create a **preview deployment**.

### Purpose
Preview deployments are used for:
- gameplay review
- regression checks
- balancing validation
- quick sharing without merging to `main`

### Target
Recommended target:
- GitHub Pages preview environment, or
- another static preview host if needed

### Cleanup
When a pull request is merged or closed:
- the preview deployment should be removed or invalidated automatically
- related preview artifacts should expire automatically through retention settings

---

## Automated Deployments from `main`

Every successful merge to `main` should trigger:

1. production build
2. test run
3. artifact packaging
4. deployment to GitHub Pages production
5. optional creation of a versioned deploy artifact

`main` is the only branch that deploys to production.

---

## Build Artifacts

Each successful CI build should publish the generated web build as an artifact package.

### Artifact contents
The artifact should contain:
- production-ready web build
- zipped delivery package
- optional metadata such as commit SHA and build number

### Purpose
Artifacts are used for:
- reproducible review
- manual testing
- release promotion
- itch.io delivery input

Artifacts from CI are temporary workflow artifacts. Release assets are attached separately when creating a GitHub Release.

---

## Release Workflow

Releases are created manually through a **workflow_dispatch** workflow.

### Release flow
1. manually trigger the release workflow
2. select the target version / tag
3. download or reuse the built artifact package
4. upload the delivery build to itch.io
5. create a GitHub Release
6. attach the release package
7. publish release notes

### Rule
Production releases are intentional and manual.  
They are not created automatically from every push to `main`.

---

## CI Pipeline

Every pull request and every push to `main` should run the build pipeline.

### Minimum pipeline
- install dependencies
- lint
- build
- unit tests if present
- smoke tests / validation
- dependency review
- optional CodeQL or code scanning

### Goal
CI should block merges when the game does not build, tests fail, or dependency checks detect a problem.

---

## Security / Supply Chain Checks

The repository should include lightweight SCA in CI.

### Recommended checks
- Dependabot enabled
- dependency review on pull requests
- optional CodeQL / code scanning on default branch and pull requests

This is mainly to catch vulnerable dependency updates and obvious supply-chain issues early.

---

## Dependabot Policy

Dependabot pull requests may be auto-merged only when all of the following are true:

- the PR is labeled for auto-merge
- all required status checks pass
- branch protection requirements are satisfied
- the update is within the allowed dependency policy

Recommended label:
- `automerge`

Auto-merge should be limited to low-risk dependency updates.

---

## Required Repository Settings

### Branch protection for `main`
Enable:
- require pull requests before merging
- require approvals
- require status checks to pass
- require linear history
- disable force pushes
- disable direct deletion

### Merge settings
Enable:
- squash merge
- optional rebase merge

Disable:
- merge commits

### Actions / Environments
Configure:
- `preview` environment
- `production` environment
- deployment secrets
- artifact retention
- permissions for release and deployment workflows

---

## Suggested Workflow Files

```text
.github/workflows/
  ci.yml
  preview.yml
  deploy-pages.yml
  release.yml
  dependabot-auto-merge.yml