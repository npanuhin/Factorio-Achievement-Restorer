import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

function inlineSvgPlugin() {
  return {
    name: 'inline-svg',
    transformIndexHtml(html) {
      return html.replace(/<inline-svg([^>]*)><\/inline-svg>/g, (match, attrs) => {
        const srcMatch = attrs.match(/src="([^"]+)"/);
        if (!srcMatch) return match;
        const src = srcMatch[1];
        const otherAttrs = attrs.replace(srcMatch[0], '');

        const svgPath = path.resolve(import.meta.dirname, 'website', src);
        if (fs.existsSync(svgPath)) {
          const svgContent = fs.readFileSync(svgPath, 'utf-8').trim();
          return svgContent.replace(/^<svg/, `<svg ${otherAttrs}`);
        }
        console.warn(`SVG not found: ${svgPath}`);
        return match;
      });
    },
  };
}

import { generatePreviewSvg } from './scripts/generate-preview.js';

function previewSvgPlugin() {
  return {
    name: 'generate-preview-svg',
    async buildStart() {
      await generatePreviewSvg();
    }
  };
}

export default defineConfig({
  base: './',
  root: 'website',
  plugins: [inlineSvgPlugin(), previewSvgPlugin()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'esnext'
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './website')
    }
  }
});
