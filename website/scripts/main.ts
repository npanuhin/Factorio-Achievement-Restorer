import { t, initI18n, setLanguage, Language } from './i18n';
import { CustomSelect } from './custom-select';

// Elements
const dropZone = document.getElementById('dropZone') as HTMLElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const copyPathBtn = document.getElementById('copyPathBtn') as HTMLButtonElement;
const savePathText = document.getElementById('savePathText') as HTMLElement;
const statusCard = document.getElementById('statusCard') as HTMLElement;
const statusTitle = document.getElementById('statusTitle') as HTMLElement;
const progressPercent = document.getElementById('progressPercent') as HTMLElement;
const progressFill = document.getElementById('progressFill') as HTMLElement;
const statusStepText = document.getElementById('statusStepText') as HTMLElement;
const toggleLogBtn = document.getElementById('toggleLogBtn') as HTMLButtonElement;
const toggleLogLabel = document.getElementById('toggleLogLabel') as HTMLElement;
const statusLog = document.getElementById('statusLog') as HTMLElement;
const statusLogInner = document.getElementById('statusLogInner') as HTMLElement;
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
const langWrap = document.getElementById('langSelectWrap') as HTMLElement;
const modsWarningWrapper = document.getElementById('modsWarningWrapper') as HTMLElement;
const pathHintToggle = document.getElementById('pathHintToggle') as HTMLButtonElement;
const pathHintExpanded = document.getElementById('pathHintExpanded') as HTMLElement;
const pathHintLabel = document.getElementById('pathHintLabel') as HTMLElement;
const pathHintItems = Array.from(document.querySelectorAll('.path-hint-item')) as HTMLElement[];

// Detect OS
type OS = 'win' | 'mac' | 'linux';
function detectOS(): OS {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = (navigator as any).userAgentData?.platform?.toLowerCase() || navigator.platform.toLowerCase();

  if (platform.includes('win') || userAgent.includes('windows')) return 'win';
  if (platform.includes('mac') || userAgent.includes('macintosh') || userAgent.includes('mac os')) return 'mac';
  return 'linux';
}

const currentOS = detectOS();
const OS_PATHS: Record<OS, { name: string; path: string }> = {
  win: { name: 'Windows', path: '%appdata%\\Factorio\\saves' },
  mac: { name: 'macOS', path: '~/Library/Application Support/factorio/saves' },
  linux: { name: 'Linux', path: '~/.factorio/saves' },
};

function setSavePathForOS(os: OS): void {
  savePathText.textContent = OS_PATHS[os].path;
  pathHintLabel.textContent = `${t('savePathLabel')} (${OS_PATHS[os].name}):`;
  for (const item of pathHintItems) {
    item.classList.toggle('active', item.getAttribute('data-os') === os);
  }
}

// Initial OS path setup
setSavePathForOS(currentOS);

// Toggle expanded paths view
let isPathExpanded = false;
if (pathHintToggle) {
  pathHintToggle.addEventListener('click', () => {
    isPathExpanded = !isPathExpanded;
    pathHintToggle.setAttribute('aria-expanded', isPathExpanded ? 'true' : 'false');
    pathHintExpanded.classList.toggle('open', isPathExpanded);
  });
}

// Click on specific OS item in expanded list
for (const item of pathHintItems) {
  item.addEventListener('click', () => {
    const os = item.getAttribute('data-os') as OS;
    if (os && OS_PATHS[os]) {
      setSavePathForOS(os);
    }
  });
}

let patchedZipBlob: Blob | null = null;
let patchedFileName = '';
let isLogOpen = false;

// Touch & Click handler for tooltip (accessible on mobile & touchscreens)
if (modsWarningWrapper) {
  modsWarningWrapper.addEventListener('click', (e) => {
    e.stopPropagation();
    const isActive = modsWarningWrapper.classList.toggle('active');
    modsWarningWrapper.setAttribute('aria-expanded', isActive ? 'true' : 'false');
  });

  document.addEventListener('click', (e) => {
    if (!modsWarningWrapper.contains(e.target as Node)) {
      modsWarningWrapper.classList.remove('active');
      modsWarningWrapper.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modsWarningWrapper.classList.remove('active');
      modsWarningWrapper.setAttribute('aria-expanded', 'false');
    }
  });
}

// Initialize i18n
initI18n();

// Initial OS path setup (must run after initI18n so it doesn't get overwritten)
setSavePathForOS(currentOS);

// Initialize custom select
const langSelect = new CustomSelect({
  wrap: langWrap,
  onChange: (val: string) => {
    setLanguage(val as Language);
    langSelect.updateLabels();
    setSavePathForOS(currentOS);
    updateToggleLogLabel();
  }
});

// Toggle log view
function updateToggleLogLabel(): void {
  toggleLogLabel.textContent = isLogOpen ? t('hideLog') : t('showLog');
}

toggleLogBtn.addEventListener('click', () => {
  isLogOpen = !isLogOpen;
  toggleLogBtn.setAttribute('aria-expanded', isLogOpen ? 'true' : 'false');
  statusLog.classList.toggle('open', isLogOpen);
  updateToggleLogLabel();
});

// Copy path button handler
copyPathBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(savePathText.innerText).then(() => {
    copyPathBtn.innerText = t('copiedBtn');
    setTimeout(() => {
      copyPathBtn.innerText = t('copyPathBtn');
    }, 2000);
  });
});

// Drag and drop handlers
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer && e.dataTransfer.files.length > 0) {
    processFile(e.dataTransfer.files[0]);
  }
});
fileInput.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    processFile(target.files[0]);
  }
});

function log(msg: string): void {
  const target = statusLogInner || statusLog;
  target.textContent += msg + '\n';
  target.scrollTop = target.scrollHeight;
}

function clearLog(): void {
  const target = statusLogInner || statusLog;
  target.textContent = '';
}

// 60/120 FPS continuous interpolation engine in UI thread
let currentVisualWidthPct = 0;
let displayedIntegerPct = 0;
let physicalTargetPct = 0;
let isAnimating = false;
let lastFrameTime = performance.now();

function tickProgress(now: number): void {
  if (!isAnimating) return;

  const dt = Math.min(100, Math.max(1, now - lastFrameTime)) / 1000;
  lastFrameTime = now;

  const diff = physicalTargetPct - currentVisualWidthPct;

  if (diff > 0.001) {
    // Smooth kinematic approach: fast glide with snappy deceleration
    const speed = Math.max(2.0, diff * 7.0);
    currentVisualWidthPct += Math.min(diff, speed * dt);
  } else if (diff < 0) {
    currentVisualWidthPct = physicalTargetPct;
  }

  currentVisualWidthPct = Math.min(100, Math.max(0, currentVisualWidthPct));
  progressFill.style.width = `${currentVisualWidthPct.toFixed(2)}%`;

  const targetInt = Math.floor(currentVisualWidthPct);
  if (targetInt > displayedIntegerPct) {
    displayedIntegerPct++;
    progressPercent.textContent = `${displayedIntegerPct}%`;
  }

  if (Math.abs(physicalTargetPct - currentVisualWidthPct) < 0.01 && physicalTargetPct >= 100) {
    currentVisualWidthPct = 100;
    progressFill.style.width = '100%';
    progressPercent.textContent = '100%';
    isAnimating = false;
  } else {
    requestAnimationFrame(tickProgress);
  }
}

function updateTargetPct(pct: number, stepText?: string): void {
  physicalTargetPct = Math.min(100, Math.max(0, pct));

  if (stepText) {
    statusStepText.textContent = stepText;
  }

  if (!isAnimating) {
    isAnimating = true;
    lastFrameTime = performance.now();
    requestAnimationFrame(tickProgress);
  }
}

// Background Worker instantiation
let worker: Worker | null = null;

async function processFile(file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    alert(t('alertZipOnly'));
    return;
  }

  if (worker) {
    worker.terminate();
    worker = null;
  }

  statusCard.style.display = 'block';
  downloadBtn.style.display = 'none';
  statusTitle.innerText = t('statusProcessing', { name: file.name });
  clearLog();

  currentVisualWidthPct = 0;
  displayedIntegerPct = 0;
  physicalTargetPct = 0;
  isAnimating = false;
  progressPercent.textContent = '0%';
  progressFill.style.width = '0%';

  worker = new Worker(new URL('./patcher.worker.ts', import.meta.url), { type: 'module' });

  worker.onmessage = (e: MessageEvent<any>) => {
    const data = e.data;

    switch (data.type) {
      case 'log': {
        const text = (data.rawText || '') + (data.messageKey ? t(data.messageKey, data.params) : '');
        log(text);
        break;
      }
      case 'progress': {
        const stepText = data.stepKey ? t(data.stepKey, data.stepParams) : undefined;
        updateTargetPct(data.pct, stepText);
        break;
      }
      case 'done': {
        updateTargetPct(100, t('stageComplete'));
        statusTitle.innerText = t('statusReady');

        patchedZipBlob = data.blob;
        const baseName = file.name.replace(/\.zip$/i, '');
        patchedFileName = `${baseName}_achievements_restored.zip`;

        downloadBtn.style.display = 'inline-flex';
        break;
      }
      case 'clean': {
        updateTargetPct(100, t('stageComplete'));
        statusTitle.innerText = t('statusNoCheats');
        break;
      }
      case 'error': {
        log(t('logErr', { msg: data.message }));
        statusTitle.innerText = t('statusError');
        updateTargetPct(100, data.message);
        break;
      }
    }
  };

  worker.onerror = (err) => {
    console.error(err);
    const msg = err.message || 'Worker thread error';
    log(t('logErr', { msg }));
    statusTitle.innerText = t('statusError');
    updateTargetPct(100, msg);
  };

  worker.postMessage({ file });
}

downloadBtn.addEventListener('click', () => {
  if (!patchedZipBlob) return;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(patchedZipBlob);
  link.download = patchedFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});
