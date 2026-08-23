# NAIWA Rich Motion Field Design

**Date:** 2026-08-23  
**Status:** Approved for planning  
**Goal:** Add a richer interaction language to the NAIWA 3D story without competing with the character or introducing a new visual theme.

## Experience

The page will use three coordinated motion layers:

1. **Living orbits:** The existing field rings and marker points become visibly alive during the form and particle stages. Their shape, rotation, opacity, and marker movement are driven by scroll progress rather than remaining largely static.
2. **Gravity release:** Near the release chapter, particles briefly pull toward a focal region before the existing burst expands them across the scene. The effect is short, scroll-reversible, and only active while the release range is entered.
3. **Pointer field:** The existing pointer response gains a small, visible ring-field response in the particle stage. It must retain the current mobile fallback, which uses the automatic scene motion without requiring pointer input.

The palette remains the current pale yellow, leaf green, charcoal, and off-white. New effects may use opacity, motion, and scale, but not saturated cyber colors, large dark panels, or persistent opaque overlays.

## Architecture

- `src/model-effects.js` owns pure scroll-to-motion calculations. It will expose a compact field-state helper for ring motion and the release collapse phase; helpers remain independently unit-testable.
- `src/main.js` consumes the calculated state in the animation loop. The existing `interactionField` supplies the orbit geometry, markers, and materials; no third-party component package is added.
- The particle shader receives only the small set of new numeric/vector uniforms needed for the collapse phase and pointer-field highlights. Existing color sampling, raycasting, and mobile pixel-ratio limits remain unchanged.
- The CSS layer may receive limited chapter/HUD treatment only when it reflects scene state. It will not introduce a new overlay component or a separate scroll animation engine.

## Scroll Behavior

- **Form to signal:** rings softly precess and markers circulate. Opacity rises as the model begins dissolving, but stays behind the model and copy.
- **Particle stage:** rings widen and become more irregular. Pointer proximity adds a localized pulse; moving away decays smoothly with the existing interaction response behavior.
- **Release stage:** a narrow pre-collapse window begins before the burst. Particles converge modestly toward the field center, then release outward under the existing burst logic. Reversing scroll cancels expansion immediately and restores the prior form without a jump.
- **Mobile:** no hover dependency. The mobile composition retains readable text clearance and uses subtle automatic field movement. Pixel ratio and particle sample caps are not increased.

## Failure Handling And Performance

- If the model or particles are unavailable, the page keeps the existing loading/error behavior and does not attempt field animation.
- Ring and marker updates reuse existing geometry and material instances. No per-frame allocations, textures, extra raycasts, or new post-processing passes are introduced.
- The release collapse is shader-side; the CPU does not rewrite particle buffers while scrolling.
- The visual field is hidden or strongly reduced while the solid model needs readable form shadows.

## Testing And Verification

- Add failing unit tests first for the new pure field-state and collapse progress helpers, including clamping, mobile-safe values, and reverse-scroll behavior.
- Verify the full suite with `npm test` and production output with `npm run build`.
- Check the page in a desktop viewport and at 390 px wide: initial form, particle interaction, and release. Confirm no console errors, loading state resolves, text remains within the viewport, and reverse scrolling does not keep the burst expanding.

## Scope Boundaries

- This work enhances the existing Three.js scene. It does not import Originkit source code, add a new animation dependency, change the content structure, or redesign navigation.
- The reference components are used as art-direction inputs only: morphing rings, gravitational vortex, and cursor ring field.
