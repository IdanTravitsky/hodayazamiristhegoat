# Standalone build verification

- Production build and TypeScript validation passed on 2026-09-09.
- Served and inspected the actual static output locally, including a fresh visitor session.
- Verified the phone hero, increased text sizes, download response, exact Hebrew note, and normal-flow report stamp. Tablet inspection confirms the butterfly and League snowball no longer overlap text.
- Verified phase controls: 8 day outfits, 6 moonlight outfits, 14 Blood Moon outfits. Only one selected character appears in the main scene.
- All 15 achievement hints start collapsed for a fresh visitor; previous saved progress remains compatible.
- Exercised the new Eras charm and the repaired moon hit target. No horizontal overflow at 390px.
- Fonts, sprites, photographs, and interactive code are served as static files. No OpenAI runtime or hosting service is required.

Custom-domain DNS should be changed only after the GitHub Pages custom domain has been configured.

## Readability and pointer-drag follow-up (2026-09-09)
- Added an adaptive paper outline to the handwritten hero caption and softened the day/Blood Moon palette; the full domain header fits at 320px, 390px, tablet, and desktop sizes.
- Replaced native HTML drag initiation with pointer capture for mouse, touch, and pen. Only the file disables touch scrolling; the rest of the page still scrolls normally.
- Browser-tested successful and missed pointer drops at desktop and 390px widths, ghost cleanup, undo, the tap-to-bin fallback, and persistence after reload. No browser errors. The browser automation sends mouse pointer events; a physical touchscreen was not available for testing.
