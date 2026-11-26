import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// dist/sw.js 의 __BUILD_ID__ 를 배포마다 고유값으로 교체 (서비스워커 캐시 갱신)
function swBuildId(): Plugin {
  let outDir = 'dist';
  return {
    name: 'sw-build-id',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const file = path.resolve(outDir, 'sw.js');
      if (!fs.existsSync(file)) return;
      const id = (process.env.CF_PAGES_COMMIT_SHA || '').slice(0, 8) || Date.now().toString(36);
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/__BUILD_ID__/g, id));
    }
  };
}

export default defineConfig({
  plugins: [react(), swBuildId()],
  server: {
    host: true,
    port: 5173,
    proxy: { '/api': 'http://localhost:8787' }
  },
  build: { target: ['es2019', 'safari14'] }
});
