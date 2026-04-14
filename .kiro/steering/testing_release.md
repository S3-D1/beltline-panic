---
inclusion: auto
name: testing-release
description: Use when creating tests, build pipelines, release workflows, packaging, itch.io delivery, GitHub Pages deployment, or release documentation.
---

# Testing and Release Guidance

## Testing approach
This is a jam project. Favor practical coverage:
- keep automated tests focused and lightweight
- prioritize smoke tests and build validation
- preserve fast CI feedback

## Build artifacts
Each production-capable build should output:
- browser-ready static build
- zipped package when needed for release
- metadata such as commit SHA or version where useful

## Delivery targets
- GitHub Pages for hosted previews / production web build
- itch.io for jam delivery

## Release expectations
Before release:
- build succeeds
- tests and checks are green
- package is verified locally
- release asset is attachable to GitHub Release
- itch.io upload path is clear and reproducible

## Safety rules
- Never hardcode secrets
- Use repository or environment secrets for tokens
- Keep release workflows explicit and manually triggered unless stated otherwise