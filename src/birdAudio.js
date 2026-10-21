const calls = {
  budgie: [1200, 1500, 1320], cockatiel: [880, 1174, 988], lorikeet: [720, 940, 760, 1020],
  morning: [784, 988, 1175, 1568, 1175, 988], forest: [1047, 784, 880, 1319, 1047, 784],
  lullaby: [659, 784, 988, 784, 659, 587, 523], bell: [1046, 1568], water: [900, 650, 1100],
};

// Original synthesized phrases inspired by songbird sweeps and alternating trills.
// Each syllable: offset, duration, starting pitch, turning pitch, ending pitch.
const songs = {
  amazon: [
    [0, .15, 1250, 1660, 1560], [.2, .14, 1560, 1940, 1800],
    [.4, .21, 1660, 2100, 1860],
    ...Array.from({ length: 6 }, (_, i) => [.78 + i * .085, .07, i % 2 ? 1660 : 1480, i % 2 ? 1980 : 1800, i % 2 ? 1800 : 1660]),
    [1.42, .18, 1560, 2100, 1980], [1.67, .24, 1860, 2240, 2100],
  ],
  macaw: [
    [0, .21, 740, 1040, 980], [.29, .2, 980, 1280, 1170],
    [.57, .24, 880, 1200, 1100],
    ...Array.from({ length: 4 }, (_, i) => [1.02 + i * .115, .095, i % 2 ? 1040 : 880, i % 2 ? 1320 : 1170, i % 2 ? 1170 : 1040]),
    [1.6, .22, 980, 1320, 1240], [1.9, .28, 1100, 1480, 1320],
  ],
  morning: [
    [0, .14, 1800, 2600, 2200], [.18, .12, 2100, 3000, 2400],
    [.36, .16, 2300, 3200, 2700],
    ...Array.from({ length: 9 }, (_, i) => [.65 + i * .065, .055, i % 2 ? 2600 : 2100, 3200, i % 2 ? 2200 : 2800]),
    [1.32, .19, 2300, 3100, 2500], [1.57, .16, 2500, 3500, 2900],
  ],
  forest: [
    [0, .18, 1700, 2400, 1900], [.24, .13, 2200, 2800, 2300],
    [.42, .18, 1800, 2600, 2100], [.78, .1, 2600, 3400, 2700],
    [.93, .1, 2400, 3200, 2600],
    ...Array.from({ length: 7 }, (_, i) => [1.13 + i * .075, .06, 2300 + i * 70, 3100 + i * 60, 2500]),
    [1.76, .21, 2100, 2900, 2300],
  ],
  lullaby: [
    [0, .22, 1500, 2100, 1800], [.3, .19, 1800, 2500, 2100],
    [.57, .23, 1700, 2300, 1900],
    ...Array.from({ length: 5 }, (_, i) => [.98 + i * .095, .08, 1900, 2600, 2100]),
    [1.57, .26, 1800, 2400, 2000], [1.92, .24, 1600, 2200, 1800],
  ],
};

export async function playBirdSound(soundId = 'budgie') {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  try {
    // Mobile browsers may create the context suspended even after a tap.
    if (context.state === 'suspended') await context.resume();
    const song = songs[soundId];
    const notes = calls[soundId] ?? calls.budgie;
    const step = 0.09;
    const duration = 0.17;
    const startTime = context.currentTime + 0.02;
    if (song) {
      song.forEach(([offset, length, low, high, end], index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = startTime + offset;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(low, start);
        oscillator.frequency.exponentialRampToValueAtTime(high, start + length * .45);
        oscillator.frequency.exponentialRampToValueAtTime(end, start + length);
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(index % 3 === 0 ? .10 : .075, start + Math.min(.014, length * .2));
        gain.gain.exponentialRampToValueAtTime(.0001, start + length);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + length + .01);
      });
    } else notes.forEach((frequency, index) => {
      const harmonics = [[1, 0.12]];
      harmonics.forEach(([multiple, volume]) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = startTime + index * step;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency * multiple, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration - 0.02);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + duration);
      });
    });
    const endTime = startTime + (song ? Math.max(...song.map(([offset, length]) => offset + length + .01)) : (notes.length - 1) * step + duration);
    window.setTimeout(() => { void context.close().catch(() => {}); }, Math.ceil((endTime - context.currentTime) * 1000) + 200);
  } catch {
    await context.close().catch(() => {});
  }
}
