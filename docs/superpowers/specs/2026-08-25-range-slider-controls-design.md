# Range Slider Controls Design

## Scope

Refresh only the draggable controls in the material and signal panels shown in the two reference screenshots. Keep the existing panel layout, labels, values, instrument state mapping, and scroll behavior unchanged.

## Approach

- Replace the six native range inputs with `range-slider-element` custom elements.
- Keep the existing `data-instrument-control`, `data-instrument-key`, and output selectors so the current state layer remains the source of truth.
- Forward `input` and `change` events from each custom element through the existing instrument-control binding.
- Use CSS-only styling: pale yellow filled track, dark green inactive track, compact thumb, subtle focus ring, and a pressed/dragging state. No GSAP or animation library changes.
- Keep the current desktop/mobile panel geometry and only scope new styles to `.instrument-range range-slider`.

## Acceptance Criteria

- Both panels keep their current positions and text.
- Every slider remains draggable with mouse, touch, and keyboard.
- Live numeric outputs and scene state updates continue to work.
- The controls visually share one treatment across material and signal panels.
- Existing tests and production build pass.
