import { wgslVitePlugin } from 'vgpu/client';

export default {
  plugins: [wgslVitePlugin({ minify: true })],
  build: {
    target: 'esnext',
    rollupOptions: { input: { main: 'index.html', bio: 'bio.html' } },
  },
};
