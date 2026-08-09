# Audit corrections V2.2

1. CSS masks are now true RGBA alpha masks; Chromium/WebKit no longer see a solid rectangle.
2. TaskFlow functional mask was rebuilt cleanly; DataVault now has a dedicated full glyph and a simpler mini glyph.
3. 16/24/32 exports were regenerated from dedicated small masks.
4. Android includes a ready-to-copy `res/` tree, API 26 adaptive XML, and API 33 monochrome XML.
5. iOS includes Any/Dark/Tinted single-size asset catalogs and Icon Composer source previews for modern appearance workflows.
6. Animations use an internal masked overlay; the original master image remains stationary.
7. Runtime cache is capped by memory (48 MB default), and canvas render resolution is capped (1024 px default).
8. Cross-origin assets use anonymous CORS and emit `freev-icon-error` on failures.
9. `interactive` is keyboard-accessible and emits `freev-activate`.
10. Added package metadata, TS definitions, Python dependency metadata, changelog, license notice, build script, and automated tests.
