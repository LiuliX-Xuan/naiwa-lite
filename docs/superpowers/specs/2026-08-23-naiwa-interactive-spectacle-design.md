# NAIWA Interactive Spectacle Design

**Date:** 2026-08-23
**Status:** Approved direction, ready for user spec review
**Goal:** Rework the NAIWA story so every meaningful visual and text element responds to the visitor, with Elastic Text as the page's recognisable interaction and one controlled release climax.

## Core Direction

The page becomes a tactile interactive specimen instead of a passive 3D scroll page. The motion language is layered so that the screen remains readable:

1. **Ambient response:** a full-page line-ripple field gives the background continuous low-energy movement.
2. **Contact response:** pointer movement creates a local fluid trail, magnetic UI drift, and a short-lived response around the model.
3. **Text response:** all meaningful text receives an interaction. Display words use Elastic Text; supporting text uses lighter hover, sweep, or scramble behaviours appropriate to its reading role.
4. **Narrative release:** the particle tunnel appears only in the final release chapter, concentrating the accumulated energy into one full-screen event.

The visual style remains pale yellow, mint, charcoal, and paper at the beginning. Contrast and saturated gold/mint light increase with scroll, with the final chapter briefly moving into a dark, luminous tunnel before returning to the page palette.

## Interaction Inventory

### Background

- A fixed, procedural **Line Ripple Background** sits behind the existing Three.js canvas. Pointer motion locally bends or brightens the field; scrolling advances the flow phase.
- A restrained perspective **Kinetic Grid** replaces or blends with the ripple field only in the signal/release range. It must never obscure copy or the model.
- Grain remains, but is reduced where the new background carries sufficient texture.

### Pointer and UI

- A **Fluid Trail** appears only when the pointer crosses the model, a large display word, navigation, or a readout. It decays quickly and never stays as an all-screen cursor replacement.
- Header navigation, metadata, chapter readouts, and release notes use magnetic displacement on hover/focus. Their borders/rules or underlines react independently, so the small UI is also alive.
- On touch devices, a tap creates the same local pulse but no drag gesture blocks vertical scrolling.

### Text

- **Elastic Text** is used for the hero word `奶蛙` and the primary keyword in each chapter. Every character is independently draggable. Dragging a character stretches adjacent characters with falloff; releasing it returns the string through a spring response.
- The hero word is large and central enough to act as the interaction tutorial without extra instructional copy.
- Chapter display text is Elastic Text at a lower follow strength. Each chapter uses one highlighted phrase, never all three title lines, so its typography keeps a deliberate hierarchy.
- Supporting labels, numeric readouts, and navigation use Scramble Text or magnetic tracking when hovered/focused.
- Paragraphs respond at line or word-run level with a colour sweep and a small pointer-driven lift. Paragraph glyphs are not individually draggable because reading and selection would become unreliable; every paragraph still has its own visible response.
- Existing scroll reveal becomes the entry state for text. Hover/drag effects are additive and reset cleanly after leaving the element.

### Model and Scene

- The current model pointer hit test continues to drive a local particle response.
- A short **Liquid Distortion** pass occurs at the solid-to-particle threshold and when a pointer directly crosses the model. It is local to the character silhouette rather than a full-page filter.
- Existing particle colours sampled from the model remain intact. The oversized orbit field and dense release clutter are removed or reduced to background-scale detail.
- The final release uses a **Particle Tunnel**: particles and the background perspective pull forward for one short scroll-controlled passage, then settle. It is reversible when the user scrolls upward.

## Scene Sequence

1. **Hero / form:** line-ripple background, draggable `奶蛙`, responsive header and model. The scene is bright and tactile.
2. **Origin / material:** chapter keyword receives the elastic interaction. Paragraphs gain a reading sweep; the model gains localized fluid response.
3. **Signal:** ripple field transitions toward a mint/gold kinetic grid. Labels scramble briefly on hover while the model gets a more visible distortion response.
4. **Release:** the grid deepens, particle density stays readable around copy, then the final tunnel creates the only full-screen burst. Reverse scrolling unwinds the sequence without a stranded effect.

## Technical Boundaries

- Keep the app Vite + vanilla JavaScript + Three.js. Recreate the selected component behaviours with the existing stack; do not add a second UI framework.
- Split DOM motion from scene motion. A focused text-interaction module owns pointer/keyboard/touch state and cleanup. `model-effects.js` retains pure Three.js scroll and response calculations.
- Use pointer capture only while an Elastic Text character is being dragged. Keyboard focus must trigger a short equivalent elastic pulse for interactive text and UI.
- Use `prefers-reduced-motion` to disable continuous waves, dragging physics, and tunnel travel while preserving clear focus and hover states.
- Constrain all visual updates to requestAnimationFrame, transforms, opacity, and shader uniforms. Do not add per-frame DOM layout reads, particle buffer rewrites, or an additional WebGL renderer.

## Validation

- Add unit coverage for pure elastic-chain calculations, pointer activation/decay, and scroll ranges for the grid/tunnel sequence.
- Verify desktop pointer drag, keyboard focus, and mobile tap paths.
- Run `npm test` and `npm run build`.
- Capture desktop and 390 px-wide screenshots at the hero, every chapter entry, the signal transition, and the release tunnel. Check copy clearance, no text overlap, model loading, reverse scroll, and reduced-motion behaviour.

## Scope Exclusions

- No permanent full-screen cursor replacement, autoplay audio, or every-element particle explosion.
- No drag interaction on paragraph-level glyphs, because it undermines reading and text selection. Those blocks receive their own lighter interactive response instead.
- No new content sections or card galleries; the work enriches the existing narrative structure.
