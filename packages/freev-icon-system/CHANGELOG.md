# Changelog

## 2.5.0
- `freev-activate` now fires once for both pointer clicks and keyboard activation.
- Keyboard activation reuses the click activation path to prevent duplicate custom events.
- Disabled interactive icons continue to suppress pointer and keyboard activation.
- Public icon size limit reduced from 4096 px to 2048 px; raster render side remains memory-capped.
- Added pointer-vs-keyboard activation regression coverage.
- Removed Python bytecode/cache files from the distributable archive.

## 2.4.0
- Corrected React/Vue distribution import paths.
- Added production Vue JS wrapper and typed React/Vue package exports.
- Added finite/clamped runtime size validation.
- Disabled icons now block pointer activation.
- `motion=off` and reduced-motion now omit animation overlays entirely, matching the static icon.
- Static exporter rejects `state=loading` and invalid sizes with a clear error.
- Added six Apple Icon Composer appearance source files per app.
- Added V2.4 edge-case regression tests.


## 2.3.0 — Final
- Corrections finales issues de l’audit V2.2.
- Animations par sous-calques et réduction du ghosting.
- Cache URL-safe et retry réseau.
- PWA manifests complets.
- Packaging npm/React/Vue/Types renforcé.
- Tests visuels Chromium automatisés.

## 2.2.0
- Fixed CSS mask alpha behavior in browsers.
- Rebuilt TaskFlow and DataVault functional/small masks.
- Android Studio-ready `res/` tree with API 33 monochrome icons.
- iOS Any/Dark/Tinted catalog plus Icon Composer source previews.
- Internal-part animation overlays: the master icon no longer rotates/moves as a whole.
- Memory-weighted render cache and capped canvas resolution.
- Cross-origin image handling and runtime error event.
- Keyboard-accessible `interactive` mode with `freev-activate`.
- Added package metadata, TypeScript definitions, Python dependency metadata, tests, and build output.
## 2.6.0
- Hardened all runtime option parsing with strict allowlists.
- Fixed animation attribute injection risk and invalid animation ghost layers.
- Invalid badges now fall back to none; small-size badges render as compact dots.
- Cache/render globals now reject NaN/invalid values and use safe defaults.
- Invalid asset-base emits freev-icon-error and falls back to module assets.
- Invalid app IDs emit freev-icon-error consistently across all variants.
- Web component import is SSR-safe in Node environments.
- Browser tests no longer require /usr/bin/chromium.
- Synced package, Python and manifest versions to 2.6.0.


## 2.7.0
- Mandatory automatic onboarding for every new game/software icon.
- Single-source app registry with generated Web runtime and TypeScript app union.
- Incoming folder + watch mode + build gate.
- Automatic symbol extraction with fail-closed confidence checks and optional mask override.
- Automatic Web/PWA/Android/iOS/Windows/macOS/small/animation generation.
- End-to-end onboarding test that adds and removes a temporary ninth application.
