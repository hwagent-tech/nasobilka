const calls = {
  budgie: [1200, 1500, 1320], cockatiel: [880, 1174, 988], lorikeet: [720, 940, 760, 1020],
  amazon: [620, 780, 520, 830, 690], macaw: [330, 440, 280, 390],
  morning: [784, 988, 1175, 1568, 1175, 988], forest: [1047, 784, 880, 1319, 1047, 784],
  lullaby: [659, 784, 988, 784, 659, 587, 523], bell: [1046, 1568], water: [900, 650, 1100],
};

export async function playBirdSound(soundId = 'budgie') {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  try {
    // Mobile browsers may create the context suspended even after a tap.
    if (context.state === 'suspended') await context.resume();
    const deepVoice = soundId === 'amazon' || soundId === 'macaw';
    const notes = calls[soundId] ?? calls.budgie;
    const step = deepVoice ? 0.18 : 0.09;
    const duration = deepVoice ? 0.25 : 0.17;
    const startTime = context.currentTime + 0.02;
    notes.forEach((frequency, index) => {
      // Harmonics keep the deeper voices audible on small phone speakers.
      const harmonics = deepVoice ? [[1, 0.12], [2, 0.07], [3, 0.035]] : [[1, 0.12]];
      harmonics.forEach(([multiple, volume]) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = startTime + index * step;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency * multiple, start);
        if (deepVoice) oscillator.frequency.exponentialRampToValueAtTime(frequency * multiple * 0.85, start + duration);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration - 0.02);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + duration);
      });
    });
    const endTime = startTime + (notes.length - 1) * step + duration;
    window.setTimeout(() => { void context.close().catch(() => {}); }, Math.ceil((endTime - context.currentTime) * 1000) + 200);
  } catch {
    await context.close().catch(() => {});
  }
}
