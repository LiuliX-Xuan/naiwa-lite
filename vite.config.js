import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['gsap', 'three', 'three-mesh-bvh', 'ogl']
  }
});
