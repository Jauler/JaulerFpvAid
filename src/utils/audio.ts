let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playDing(): void {
  try {
    const ctx = getAudioContext();
    void ctx.resume().then(() => {
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.value = 880; // A5
      osc2.type = "sine";
      osc2.frequency.value = 1318.5; // E6

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
    });
  } catch {
    // graceful degradation
  }
}

export function speak(text: string, voiceName: string, rate: number): void {
  try {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    if (voiceName) {
      const voice = speechSynthesis.getVoices().find((v) => v.name === voiceName);
      if (voice) utter.voice = voice;
    }
    utter.rate = rate;
    speechSynthesis.speak(utter);
  } catch {
    // graceful degradation
  }
}

export function announceLevel(level: number, voiceName: string, rate: number, rangeText?: string): void {
  let text: string;
  if (level === 0) {
    text = "Level 0";
  } else if (level > 0) {
    text = `Level plus ${level}`;
  } else {
    text = `Level minus ${Math.abs(level)}`;
  }
  if (rangeText) text += `, ${rangeText}`;
  speak(text, voiceName, rate);
}
