import JSZip from 'jszip';
import { inflate, inflateRaw, deflate, deflateRaw } from 'pako';

// Baseline reference constants
const BASE_LOAD_TIME = 204.0;
const BASE_UNIT_SCAN = 38.13;
const BASE_UNIT_COMPRESS = 124.10;
const BASE_FIXED_GENERATE = 164.60;
const BASE_TOTAL_TIME = 8495.97;
const UNPACK_X_PCT = (BASE_LOAD_TIME / BASE_TOTAL_TIME) * 100; // 2.4011%

export type WorkerMessage =
  | { type: 'log'; messageKey: string; params?: Record<string, any>; rawText?: string }
  | { type: 'progress'; pct: number; stepKey?: string; stepParams?: Record<string, any> }
  | { type: 'done'; blob: Blob; patchedCount: number }
  | { type: 'clean' }
  | { type: 'error'; message: string };

self.onmessage = async (e: MessageEvent<{ file: File }>) => {
  const { file } = e.data;

  function postLog(messageKey: string, params?: Record<string, any>, rawText?: string): void {
    self.postMessage({ type: 'log', messageKey, params, rawText } as WorkerMessage);
  }

  function postProgress(pct: number, stepKey?: string, stepParams?: Record<string, any>): void {
    self.postMessage({ type: 'progress', pct, stepKey, stepParams } as WorkerMessage);
  }

  const fileSizeMB = file.size / (1024 * 1024);
  postLog('logOpen', { name: file.name, size: fileSizeMB.toFixed(2) });
  postProgress(UNPACK_X_PCT, 'stageUnpacking');

  const unpackStartTime = performance.now();

  try {
    const zip = await JSZip.loadAsync(file);
    const measuredUnpackA = Math.max(1, performance.now() - unpackStartTime);
    const hwScaleFactor = measuredUnpackA / BASE_LOAD_TIME;

    // Find all level.dat* files (supports single level.dat in 0.17/1.0/1.1 and segmented level.dat0..datN in 2.0+)
    const levelDatFiles: JSZip.JSZipObject[] = [];
    let levelInitEntry: JSZip.JSZipObject | null = null;

    zip.forEach((_, zipEntry) => {
      if (zipEntry.name.match(/level-init\.dat$/i)) {
        levelInitEntry = zipEntry;
      }
      if (zipEntry.name.match(/level\.dat\d*$/i)) {
        levelDatFiles.push(zipEntry);
      }
    });

    // Detect Factorio version from level-init.dat or primary level.dat
    try {
      const headerSource = levelInitEntry || levelDatFiles[0];
      if (headerSource) {
        const rawHeader = await headerSource.async('uint8array');
        let uncompressedHeader = rawHeader;
        if (rawHeader[0] === 0x78) {
          try { uncompressedHeader = inflate(rawHeader); } catch {}
        }
        if (uncompressedHeader.length >= 8) {
          const view = new DataView(uncompressedHeader.buffer, uncompressedHeader.byteOffset, 8);
          const major = view.getUint16(0, true);
          const minor = view.getUint16(2, true);
          const patch = view.getUint16(4, true);
          const build = view.getUint16(6, true);
          if (major < 100) {
            postLog('logDetectedVersion', { version: `${major}.${minor}.${patch} (build ${build})` });
          }
        }
      }
    } catch {
      // Non-fatal if header parsing fails
    }

    postLog('logFoundDat', { count: levelDatFiles.length });
    if (levelDatFiles.length === 0) {
      postLog('logNoDat');
      self.postMessage({ type: 'error', message: 'No level.dat files found' } as WorkerMessage);
      return;
    }

    const totalFiles = levelDatFiles.length;
    const remainingPct = 100 - UNPACK_X_PCT;

    const calScanUnit = BASE_UNIT_SCAN * hwScaleFactor;
    const calCompressUnit = BASE_UNIT_COMPRESS * hwScaleFactor;
    const calGenerateFixed = BASE_FIXED_GENERATE * hwScaleFactor;

    let estModCount = Math.max(1, Math.round(totalFiles * 0.25));
    let estRemainingWorkMs = (totalFiles * calScanUnit) + (estModCount * calCompressUnit) + calGenerateFixed;

    postProgress(UNPACK_X_PCT);

    let totalPatched = 0;
    const modifiedEntries: { entry: JSZip.JSZipObject; buffer: Uint8Array; compressionType: 'zlib' | 'raw' | 'none' }[] = [];

    // Stage 1: Scanning & decompressing
    for (let idx = 0; idx < totalFiles; idx++) {
      const entry = levelDatFiles[idx];
      const targetScanMs = (idx + 1) * calScanUnit;
      const toScanPct = UNPACK_X_PCT + ((targetScanMs / estRemainingWorkMs) * remainingPct);

      postProgress(toScanPct, 'stageScanning', { current: idx + 1, total: totalFiles });

      const compressedData = await entry.async('uint8array');
      let decompressed: Uint8Array | null = null;
      let compressionType: 'zlib' | 'raw' | 'none' = 'zlib';

      try {
        decompressed = inflate(compressedData);
      } catch {
        try {
          decompressed = inflateRaw(compressedData);
          compressionType = 'raw';
        } catch {
          decompressed = compressedData;
          compressionType = 'none';
        }
      }

      let modified = false;
      const buffer = decompressed;

      // 1. Search pattern: 0xFF 0xFF 0x00 0x01 0x00
      const targetPattern = [0xff, 0xff, 0x00, 0x01, 0x00];
      for (let i = 0; i <= buffer.length - targetPattern.length; i++) {
        let match = true;
        for (let j = 0; j < targetPattern.length; j++) {
          if (buffer[i + j] !== targetPattern[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          buffer[i + 3] = 0x00; // Flip 01 -> 00
          modified = true;
          totalPatched++;
        }
      }

      // 2. Check for "command-ran" string
      const strView = new TextDecoder('latin1').decode(buffer);
      if (strView.includes('command-ran')) {
        postLog('logFoundCommand', { file: entry.name });
        const cmdOffset = strView.indexOf('command-ran');

        let ffIndex = -1;
        for (let k = cmdOffset; k >= 16; k--) {
          let allFF = true;
          for (let m = 0; m < 16; m++) {
            if (buffer[k - 16 + m] !== 0xff) {
              allFF = false;
              break;
            }
          }
          if (allFF) {
            ffIndex = k - 16;
            break;
          }
        }

        if (ffIndex !== -1 && ffIndex >= 11) {
          const flagOffset = ffIndex - 11;
          if (buffer[flagOffset] === 0x01) {
            buffer[flagOffset] = 0x00;
            postLog('logClearedFF', { offset: flagOffset });
            modified = true;
            totalPatched++;
          }
        }
      }

      if (modified) {
        modifiedEntries.push({ entry, buffer, compressionType });
      }
    }

    if (totalPatched > 0) {
      postLog('logSuccess', { count: totalPatched }, '\n');

      const actualModCount = modifiedEntries.length;
      const exactRemainingWorkMs = (totalFiles * calScanUnit) + (actualModCount * calCompressUnit) + calGenerateFixed;
      let completedMs = totalFiles * calScanUnit;

      // Stage 2: Recompressing modified files
      for (let mIdx = 0; mIdx < actualModCount; mIdx++) {
        const item = modifiedEntries[mIdx];
        completedMs += calCompressUnit;
        const repackingPct = UNPACK_X_PCT + ((completedMs / exactRemainingWorkMs) * remainingPct);

        postProgress(repackingPct, 'stageRepacking', { current: mIdx + 1, total: actualModCount });
        postLog('logCompressing', { file: item.entry.name });

        let recompressed: Uint8Array | null = null;
        if (item.compressionType === 'zlib') {
          recompressed = deflate(item.buffer, { level: 6 });
        } else if (item.compressionType === 'raw') {
          recompressed = deflateRaw(item.buffer, { level: 6 });
        } else {
          recompressed = item.buffer;
        }

        zip.file(item.entry.name, recompressed, {
          compression: 'STORE'
        });
      }

      // Stage 3: Generating final output zip
      postLog('logGenerating');
      postProgress(98, 'stageFinalizing', { percent: 98 });

      const newBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE'
      });

      postProgress(100, 'stageComplete');
      self.postMessage({ type: 'done', blob: newBlob, patchedCount: totalPatched } as WorkerMessage);
    } else {
      postProgress(100, 'stageComplete');
      postLog('logClean', {}, '\n');
      self.postMessage({ type: 'clean' } as WorkerMessage);
    }
  } catch (err: any) {
    self.postMessage({ type: 'error', message: err.message || String(err) } as WorkerMessage);
  }
};
