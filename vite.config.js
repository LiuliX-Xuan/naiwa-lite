import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    // These packages expose deep module graphs that Vite's Windows optimizer
    // can reject before the app has a chance to transform them on demand.
    exclude: ['gsap', 'three', 'three-mesh-bvh', 'ogl']
  }
});
