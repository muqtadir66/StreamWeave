let crashPool = null;
let crashIndex = 0;

let audioCtx = null;
let crashBuffer = null;
let crashDecodePromise = null;
let crashPrimed = false;
let crashBytes = null;
let crashFetchPromise = null;

const isIOS = () => {
  const ua = globalThis?.navigator?.userAgent || '';
  const isiPhoneIpadIpod = /iPad|iPhone|iPod/.test(ua);
  const isiPadOS = /Mac/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document;
  return isiPhoneIpadIpod || isiPadOS;
};

const makeAudio = (src, volume) => {
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.volume = volume;
  try {
    audio.load();
  } catch {}
  return audio;
};

const ensureAudioContext = () => {
  if (audioCtx) return audioCtx;
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  return audioCtx;
};

export const unlockAudio = async () => {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  if (ctx.state === 'running') return;
  try {
    await ctx.resume();
  } catch {}

  // iOS WebViews can require an actual "start()" call during a gesture to fully unlock audio.
  // Play a 1-sample silent buffer; this is inaudible but helps ensure the context is usable later.
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
    source.stop(ctx.currentTime + 0.01);
  } catch {}
};

const fetchCrashBytes = async () => {
  if (crashBytes) return crashBytes;
  if (crashFetchPromise) return crashFetchPromise;
  crashFetchPromise = (async () => {
    try {
      const res = await fetch('/audio/crash.mp3', { cache: 'force-cache' });
      const ab = await res.arrayBuffer();
      crashBytes = ab;
      return ab;
    } catch {
      return null;
    } finally {
      crashFetchPromise = null;
    }
  })();
  return crashFetchPromise;
};

// iOS/Phantom WebViews can behave unpredictably if we "prime" SFX by actually playing it.
// Instead, we treat "priming" as: (1) unlocking AudioContext, (2) decoding the buffer.
// This avoids the first-round "random crash sound at start" while still preparing WebAudio playback.
export const primeCrashSfx = async ({ volume = 0.5 } = {}) => {
  if (crashPrimed) return;
  preloadCrashSfx({ volume });
  if (isIOS()) {
    await unlockAudio();
    await decodeCrashBuffer();
  }
  crashPrimed = true;
};

const decodeCrashBuffer = async () => {
  if (crashBuffer) return crashBuffer;
  if (crashDecodePromise) return crashDecodePromise;

  const ctx = ensureAudioContext();
  if (!ctx) return null;

  crashDecodePromise = (async () => {
    try {
      // Ensure context is running before decoding on iOS.
      await unlockAudio();
      const ab = crashBytes || (await fetchCrashBytes());
      if (!ab) return null;
      const buf = await ctx.decodeAudioData(ab.slice(0));
      crashBuffer = buf;
      return buf;
    } catch {
      return null;
    } finally {
      crashDecodePromise = null;
    }
  })();

  return crashDecodePromise;
};

export const preloadCrashSfx = ({ volume = 0.5 } = {}) => {
  if (crashPool) return;
  crashPool = [makeAudio('/audio/crash.mp3', volume), makeAudio('/audio/crash.mp3', volume)];

  // iOS WebViews frequently drop HTMLAudio SFX (even when music is playing).
  // Pre-decode the crash buffer for WebAudio playback.
  if (isIOS()) {
    void fetchCrashBytes();
    void unlockAudio();
    void decodeCrashBuffer();
  }
};

const playViaWebAudio = async ({ volume = 0.5 } = {}) => {
  const ctx = ensureAudioContext();
  if (!ctx) return false;
  try {
    await unlockAudio();
    const buf = crashBuffer || (await decodeCrashBuffer());
    if (!buf) return false;

    const source = ctx.createBufferSource();
    source.buffer = buf;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
    return true;
  } catch {
    return false;
  }
};

const playViaHtmlAudio = ({ volume = 0.5 } = {}) => {
  preloadCrashSfx({ volume });
  if (!crashPool) return;

  const audio = crashPool[crashIndex++ % crashPool.length];
  audio.volume = volume;

  try {
    audio.pause();
  } catch {}
  try {
    audio.currentTime = 0;
  } catch {}

  try {
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        setTimeout(() => {
          try {
            audio.play().catch(() => {});
          } catch {}
        }, 0);
      });
    }
  } catch {}
};

export const playCrashSfx = async ({ volume = 0.5 } = {}) => {
  // Prefer WebAudio on iOS for reliability.
  if (isIOS()) {
    const ok = await playViaWebAudio({ volume });
    if (ok) return;
  }
  playViaHtmlAudio({ volume });
};
