import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import subsetFont from 'subset-font';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const title = "Factorio Achievement Restorer";
const subtitle = "Re-enable Steam achievements in Factorio saves";
const warning = "Running the game with mods will still disable the achievements";
const pathLabel = "Default saves directory (Windows):";
const copyBtn = "Copy path";
const pathCode = "%appdata%\\Factorio\\saves";
const dropTitle = "Drop your save .zip file here";
const dropSub = "or click to browse";

const allText = [title, subtitle, warning, pathLabel, copyBtn, pathCode, dropTitle, dropSub].join(' ');
const uniqueChars = Array.from(new Set(allText + ' \u00A0')).join('');

export async function generatePreviewSvg() {
  const interRegularPath = path.join(rootDir, 'website/assets/fonts/Inter-Regular.woff2');
  const interMediumPath = path.join(rootDir, 'website/assets/fonts/Inter-Medium.woff2');
  const interSemiBoldPath = path.join(rootDir, 'website/assets/fonts/Inter-SemiBold.woff2');
  const interBoldPath = path.join(rootDir, 'website/assets/fonts/Inter-Bold.woff2');
  const monoPath = path.join(rootDir, 'website/assets/fonts/JetBrainsMonoNL-Regular.woff2');

  const [regularBuf, mediumBuf, semiBoldBuf, boldBuf, monoBuf] = await Promise.all([
    subsetFont(fs.readFileSync(interRegularPath), uniqueChars, { targetFormat: 'woff2' }),
    subsetFont(fs.readFileSync(interMediumPath), uniqueChars, { targetFormat: 'woff2' }),
    subsetFont(fs.readFileSync(interSemiBoldPath), uniqueChars, { targetFormat: 'woff2' }),
    subsetFont(fs.readFileSync(interBoldPath), uniqueChars, { targetFormat: 'woff2' }),
    subsetFont(fs.readFileSync(monoPath), pathCode, { targetFormat: 'woff2' })
  ]);

  const regularB64 = regularBuf.toString('base64');
  const mediumB64 = mediumBuf.toString('base64');
  const semiBoldB64 = semiBoldBuf.toString('base64');
  const boldB64 = boldBuf.toString('base64');
  const monoB64 = monoBuf.toString('base64');

  // Container: 726 x 515, border-radius: 18px (compact top and bottom margins)
  const width = 726;
  const height = 515;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%">
  <a href="https://npanuhin.github.io/Factorio-Achievement-Restorer" target="_blank" rel="noopener noreferrer">
  <defs>
    <style>
      @font-face {
        font-family: 'Inter';
        font-weight: 400;
        font-style: normal;
        src: url('data:font/woff2;charset=utf-8;base64,${regularB64}') format('woff2');
      }
      @font-face {
        font-family: 'Inter';
        font-weight: 500;
        font-style: normal;
        src: url('data:font/woff2;charset=utf-8;base64,${mediumB64}') format('woff2');
      }
      @font-face {
        font-family: 'Inter';
        font-weight: 600;
        font-style: normal;
        src: url('data:font/woff2;charset=utf-8;base64,${semiBoldB64}') format('woff2');
      }
      @font-face {
        font-family: 'Inter';
        font-weight: 700;
        font-style: normal;
        src: url('data:font/woff2;charset=utf-8;base64,${boldB64}') format('woff2');
      }
      @font-face {
        font-family: 'JetBrains Mono';
        font-weight: 400;
        font-style: normal;
        src: url('data:font/woff2;charset=utf-8;base64,${monoB64}') format('woff2');
      }

      text {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
        text-rendering: geometricPrecision;
      }
      .mono {
        font-family: 'JetBrains Mono', Consolas, monospace;
      }
      .card-bg {
        fill: #181b22;
        stroke: #2a2e39;
        stroke-width: 1;
      }
      .title {
        fill: #ffffff;
        font-size: 26.5px;
        font-weight: 700;
        letter-spacing: -0.02em;
        text-anchor: middle;
      }
      .subtitle {
        fill: #8e9bb0;
        font-size: 15px;
        font-weight: 400;
        text-anchor: middle;
      }
      .badge-bg {
        fill: rgba(255, 159, 28, 0.05);
        stroke: rgba(255, 159, 28, 0.15);
        stroke-width: 1;
      }
      .badge-text {
        fill: #d1d5db;
        font-size: 14px;
        font-weight: 400;
      }
      .badge-icon {
        stroke: #c98020;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
      }
      .path-bg {
        fill: #12141a;
        stroke: #2a2e39;
        stroke-width: 1;
      }
      .path-label {
        fill: #8e9bb0;
        font-size: 12.5px;
        font-weight: 500;
      }
      .btn-copy-bg {
        fill: #252a36;
        stroke: #2a2e39;
        stroke-width: 1;
      }
      .btn-copy-text {
        fill: #e2e8f0;
        font-size: 13px;
        font-weight: 500;
        text-anchor: middle;
      }
      .path-code {
        fill: #ff9f1c;
        font-size: 14px;
      }
      .dropzone-bg {
        fill: rgba(255, 255, 255, 0.012);
        stroke: #384053;
        stroke-width: 1.5;
        stroke-dasharray: 4 3;
      }
      .dropzone-icon {
        stroke: #8e9bb0;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
      }
      .dropzone-title {
        fill: #ffffff;
        font-size: 16.5px;
        font-weight: 600;
        text-anchor: middle;
      }
      .dropzone-sub {
        fill: #8e9bb0;
        font-size: 14px;
        font-weight: 400;
        text-anchor: middle;
      }
      .icon-muted {
        stroke: #8e9bb0;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
      }
    </style>
  </defs>

  <!-- Main Card (726 x 515, border-radius: 18px) -->
  <rect x="0.5" y="0.5" width="725" height="514" rx="18" ry="18" class="card-bg" />

  <!-- Header Section (shifted up by 25px) -->
  <text x="363" y="61" class="title">${title}</text>
  <text x="363" y="94" class="subtitle">${subtitle}</text>

  <!-- Mods Warning Badge (Centered, y: 126) -->
  <g transform="translate(125.5, 126)">
    <rect width="475" height="36.5" rx="9" ry="9" class="badge-bg" />
    <text x="16" y="23" class="badge-text">${warning}</text>
    <!-- info icon badge (x: 440.5, y: 10) -->
    <g transform="translate(440.5, 10)">
      <svg width="16.5" height="16.5" viewBox="0 0 24 24" class="badge-icon">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </g>
  </g>

  <!-- Path Hint Box (y: 188.5) -->
  <g transform="translate(32, 188.5)">
    <rect width="662" height="78" rx="11" ry="11" class="path-bg" />
    
    <!-- Top Row: label at x=16, chevron at x=232 (gap: 6px) -->
    <text x="16" y="31" class="path-label">${pathLabel}</text>
    <polyline points="232 26 237.5 31.5 243 26" class="icon-muted" stroke-width="1.8" />
    
    <!-- Copy Path Button (x: 554, y: 12, w: 92, h: 32) -->
    <g transform="translate(554, 12)">
      <rect width="92" height="32" rx="7" ry="7" class="btn-copy-bg" />
      <text x="46" y="21" class="btn-copy-text">${copyBtn}</text>
    </g>

    <!-- Path Code Line (y: 61) -->
    <text x="16" y="61" class="mono path-code">${pathCode}</text>
  </g>

  <!-- Dropzone Box (y: 290.5) -->
  <g transform="translate(32, 290.5)">
    <rect width="662" height="189" rx="13" ry="13" class="dropzone-bg" />
    
    <!-- Upload Cloud / Tray Icon (x: 304.5, y: 38) -->
    <g transform="translate(304.5, 38) scale(2.2)">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" class="dropzone-icon" />
      <polyline points="17 8 12 3 7 8" class="dropzone-icon" />
      <line x1="12" y1="3" x2="12" y2="15" class="dropzone-icon" />
    </g>

    <!-- Dropzone Texts -->
    <text x="331" y="124" class="dropzone-title">${dropTitle}</text>
    <text x="331" y="148" class="dropzone-sub">${dropSub}</text>
  </g>
  </a>
</svg>
`;

  const outPath = path.join(rootDir, 'preview.svg');
  fs.writeFileSync(outPath, svg.trim() + '\n');
  console.log(`[preview.svg] Generated successfully (${fs.statSync(outPath).size} bytes)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generatePreviewSvg().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
