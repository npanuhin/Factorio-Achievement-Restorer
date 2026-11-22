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

function seoAssetsPlugin() {
  return {
    name: 'seo-assets',
    async generateBundle() {
      // preview.svg
      const previewPath = path.resolve(import.meta.dirname, 'preview.svg');
      if (fs.existsSync(previewPath)) {
        this.emitFile({
          type: 'asset',
          fileName: 'preview.svg',
          source: fs.readFileSync(previewPath)
        });
      }

      // robots.txt
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: https://npanuhin.github.io/Factorio-Achievement-Restorer/sitemap.xml\n`
      });

      // sitemap.xml
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://npanuhin.github.io/Factorio-Achievement-Restorer/</loc>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n`
      });
    }
  };
}

export default defineConfig({
  base: './',
  root: 'website',
  plugins: [inlineSvgPlugin(), previewSvgPlugin(), seoAssetsPlugin()],
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
