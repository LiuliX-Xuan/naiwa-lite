# NAIWA Rounded Display Font

## Goal

Make the Chinese display headings feel more rounded, thick, and Q弹 while preserving the existing interactive elastic glyph behavior and the editorial mono labels.

## Direction

- Combine the visual character of the bubble round option with the heavier soft-geometric option.
- Use a rounded display face for `h1`, `h2`, and the large Chinese display copy.
- Increase display weight so the main title reads as a solid soft object rather than a thin editorial stroke.
- Use a warm milky-yellow text palette for display type, body copy, labels, and HUD text.
- Keep `DM Mono` for navigation, metadata, readouts, and chapter display labels.
- Keep body copy on the existing `Manrope` and system Chinese sans stack for readability.

## Interaction Constraints

- Preserve `[data-elastic-text]` markup and GSAP drag/rebound behavior.
- Do not change particle, scroll, or pointer interaction logic.
- Keep the title width and line breaks stable across desktop and mobile.
- Respect reduced-motion behavior already present in the project.

## Verification

- Add a focused style regression assertion for the rounded display font stack and heavier weight.
- Run the full test suite and production build.
- Visually check hero and chapter headings at desktop and mobile widths.
