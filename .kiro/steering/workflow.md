---
inclusion: auto
name: github-workflow
description: Use when creating or modifying CI, GitHub Actions, pull request workflow, preview deployments, release automation, or deployment configuration.
---

# GitHub Workflow Conventions

## Branching
- Use feature branches from `main`
- Do not push directly to `main`
- Open a pull request for all changes

## Merge strategy
- Rebase feature branches onto latest `main`
- Use squash merge
- Keep `main` linear and deployable

## CI expectations
For PRs and pushes to `main`, prefer:
- install
- build
- tests
- dependency or supply-chain checks
- artifact upload

## Deployments
- PRs should produce preview deployments when relevant
- `main` should deploy production preview/site automatically
- Preview deployments should be cleaned up automatically after merge or PR close

## Releases
- Releases are manual via workflow dispatch
- Release workflow should package build output
- Delivery target includes itch.io
- Create a GitHub Release and attach release assets

## Dependabot
- Auto-merge only for explicitly labeled Dependabot PRs
- Require green CI before auto-merge