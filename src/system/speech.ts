// Reads texts aloud in Spanish, so children who can't read yet can play too.

let enabled = true;
let voice: SpeechSynthesisVoice | null = null;
let lastText = '';
let lastTime = 0;

const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

function pickVoice() {
  const s = synth();
  if (!s) return;
  const voices = s.getVoices();
  voice =
    voices.find((v) => v.lang === 'es-ES' && /female|mujer|monica|lucia|elena|helena/i.test(v.name)) ??
    voices.find((v) => v.lang === 'es-ES') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('es')) ??
    null;
}

if (synth()) {
  pickVoice();
  synth()!.addEventListener?.('voiceschanged', pickVoice);
}

export function setVoiceEnabled(on: boolean) {
  enabled = on;
  if (!on) synth()?.cancel();
}

export function voiceAvailable(): boolean {
  const s = synth();
  return !!s && s.getVoices().length > 0;
}

/**
 * Speak a text (interrupting whatever was being said).
 * The promise resolves when the voice is done (or right away without voice).
 */
export function say(text: string): Promise<void> {
  const s = synth();
  // No installed voices (some Linux browsers): stay silent instead of waiting.
  if (!enabled || !s || !text || !s.getVoices().length) return Promise.resolve();
  const clean = text.replace(/[▶▼★•…]/g, ' ').replace(/\s+/g, ' ').trim();
  const now = Date.now();
  if (clean === lastText && now - lastTime < 600) return Promise.resolve();
  lastText = clean;
  lastTime = now;
  s.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = voice?.lang ?? 'es-ES';
  if (voice) u.voice = voice;
  u.rate = 0.95;
  u.pitch = 1.1;
  return new Promise<void>((resolve) => {
    // Some browsers never fire "end": don't wait longer than the text needs.
    const guard = setTimeout(resolve, 700 + clean.length * 75);
    const done = () => {
      clearTimeout(guard);
      resolve();
    };
    u.onend = done;
    u.onerror = done;
    s.speak(u);
  });
}

export function stopSpeaking() {
  synth()?.cancel();
}
