export const PARROT_STORAGE_KEY = 'multiplication-parrots-v1';
export const CAGE_CAPACITY = 10;
export const PARROT_SOUNDS = [
  { id: 'budgie', name: 'Švitoření andulky' },
  { id: 'cockatiel', name: 'Pískání korely' },
  { id: 'lorikeet', name: 'Volání loriho' },
  { id: 'amazon', name: 'Hlas amazoňana' },
  { id: 'macaw', name: 'Hluboké volání ary' },
  { id: 'morning', name: 'Ranní písnička' },
  { id: 'forest', name: 'Lesní melodie' },
  { id: 'lullaby', name: 'Ptačí ukolébavka' },
];

export const DECORATIONS = [
  { id: 'swing', name: 'Dřevěná houpačka', icon: '🪵' },
  { id: 'bath', name: 'Pítko pro ptáčky', icon: '💧' },
  { id: 'flowers', name: 'Barevné květiny', icon: '🌺' },
  { id: 'bell', name: 'Zlatý zvoneček', icon: '🔔' },
  { id: 'rainbow', name: 'Duha nad voliérou', icon: '🌈' },
];
export const PARROT_CATALOG = [
  { id: 'green-budgie', name: 'Zelená andulka', color: '#62bd68', unlockAt: 5, feedCost: 2, size: 'small' },
  { id: 'blue-budgie', name: 'Modrá andulka', color: '#52a8e8', unlockAt: 15, feedCost: 2, size: 'small' },
  { id: 'cockatiel', name: 'Korela', color: '#e8c75a', unlockAt: 30, feedCost: 3, size: 'medium' },
  { id: 'lorikeet', name: 'Lori duhový', color: '#ef6f75', unlockAt: 50, feedCost: 3, size: 'medium' },
  { id: 'amazon', name: 'Amazoňan', color: '#39a96b', unlockAt: 75, feedCost: 3, size: 'large' },
  { id: 'macaw', name: 'Ara arakanga', color: '#df4f50', unlockAt: 105, feedCost: 3, size: 'large' },
  { id: 'violet-budgie', name: 'Fialová andulka', color: '#9b70d9', unlockAt: 140, feedCost: 3, size: 'small' },
  { id: 'sun-conure', name: 'Aratinga sluneční', color: '#f3a83b', unlockAt: 180, feedCost: 3, size: 'medium' },
  { id: 'blue-macaw', name: 'Ara modrý', color: '#318ed1', unlockAt: 225, feedCost: 4, size: 'large' },
  { id: 'ruby-lorikeet', name: 'Lori rubínový', color: '#c83f66', unlockAt: 275, feedCost: 4, size: 'medium' },
  { id: 'mint-budgie', name: 'Mátová andulka', color: '#79d9bd', unlockAt: Infinity, feedCost: 2, size: 'small', rarity: 'vzácný' },
  { id: 'gold-cockatiel', name: 'Zlatá korela', color: '#f2c94c', unlockAt: Infinity, feedCost: 3, size: 'medium', rarity: 'vzácný' },
  { id: 'night-macaw', name: 'Noční ara', color: '#4053a9', unlockAt: Infinity, feedCost: 4, size: 'large', rarity: 'epický' },
  { id: 'pearl-lorikeet', name: 'Perlový lori', color: '#d8b9ef', unlockAt: Infinity, feedCost: 3, size: 'medium', rarity: 'epický' },
  { id: 'sunset-amazon', name: 'Amazoňan západu slunce', color: '#ef775d', unlockAt: Infinity, feedCost: 3, size: 'large', rarity: 'vzácný' },
];

export function todayKey() {
  return new Date().toLocaleDateString('sv-SE');
}

export function getDefaultParrotState() {
  return { grain: 0, totalCorrect: 0, dailyCorrect: 0, parrots: [], decorations: [], sounds: PARROT_SOUNDS.slice(0, 5).map((sound) => sound.id), selectedSound: 'budgie', careDays: 0, activitySinceHunger: 0, giftClaimedOn: null, lastGift: null, lastVisitDay: todayKey() };
}

export function normalizeParrotState(state) {
  const base = { ...getDefaultParrotState(), ...(state ?? {}) };
  const today = todayKey();
  const isSameDay = base.lastVisitDay === today;
  const parrots = (base.parrots ?? []).map((parrot, index) => ({
    ...parrot,
    active: parrot.active ?? index < CAGE_CAPACITY,
    hatched: parrot.hatched ?? true,
    fedToday: isSameDay ? Boolean(parrot.fedToday) : false,
  }));
  return { ...base, decorations: base.decorations ?? [], sounds: [...new Set([...PARROT_SOUNDS.slice(0, 5).map((sound) => sound.id), ...(base.sounds ?? [])])], selectedSound: base.selectedSound ?? 'budgie', dailyCorrect: isSameDay ? (base.dailyCorrect ?? 0) : 0, parrots, lastVisitDay: today };
}

export function loadParrotState() {
  try {
    return normalizeParrotState(JSON.parse(localStorage.getItem(PARROT_STORAGE_KEY)));
  } catch {
    return getDefaultParrotState();
  }
}

export function saveParrotState(state) {
  localStorage.setItem(PARROT_STORAGE_KEY, JSON.stringify(state));
}

export function rewardCorrectAnswer(state) {
  const current = normalizeParrotState(state);
  const totalCorrect = current.totalCorrect + 1;
  const ownedIds = new Set(current.parrots.map((parrot) => parrot.id));
  const unlocked = PARROT_CATALOG.filter(
    (parrot) => parrot.unlockAt <= totalCorrect && !ownedIds.has(parrot.id),
  );
  const activitySinceHunger = (current.activitySinceHunger ?? 0) + 1;
  let nextParrots = [
    ...current.parrots,
    ...unlocked.map((parrot, index) => ({
      id: parrot.id,
      fedToday: false,
      hatched: false,
      active: current.parrots.filter((item) => item.active).length + index < CAGE_CAPACITY,
    })),
  ];
  let nextActivity = activitySinceHunger;
  if (activitySinceHunger >= 4) {
    const fedIndex = nextParrots.findIndex((parrot) => parrot.active && parrot.hatched && parrot.fedToday);
    if (fedIndex >= 0) nextParrots = nextParrots.map((parrot, index) => index === fedIndex ? { ...parrot, fedToday: false } : parrot);
    nextActivity = 0;
  }
  return {
    ...current,
    grain: current.grain + 1,
    totalCorrect,
    dailyCorrect: current.dailyCorrect + 1,
    parrots: nextParrots,
    activitySinceHunger: nextActivity,
    newlyUnlocked: unlocked.map((parrot) => parrot.id),
  };
}

export function getParrotSound(state, parrot) {
  if (state.sounds.includes(parrot.soundId)) return parrot.soundId;
  if (parrot.id.includes('budgie')) return 'budgie';
  if (parrot.id.includes('cockatiel')) return 'cockatiel';
  if (parrot.id.includes('lorikeet')) return 'lorikeet';
  if (parrot.id.includes('amazon')) return 'amazon';
  if (parrot.id.includes('macaw')) return 'macaw';
  return PARROT_SOUNDS[parrot.id.length % 5].id;
}

export function selectParrotSound(state, soundId, parrotId) {
  if (!state.sounds.includes(soundId)) return state;
  return { ...state, parrots: state.parrots.map((parrot) => parrot.id === parrotId ? { ...parrot, soundId } : parrot) };
}

export function getParrotDefinition(owned) {
  return PARROT_CATALOG.find((item) => item.id === owned.id) ?? owned;
}

export function feedParrot(state, parrotId) {
  const current = normalizeParrotState(state);
  const owned = current.parrots.find((parrot) => parrot.id === parrotId);
  const catalogItem = owned ? getParrotDefinition(owned) : null;
  if (!catalogItem || !owned || owned.fedToday || current.grain < catalogItem.feedCost) return current;

  return {
    ...current,
    grain: current.grain - catalogItem.feedCost,
    parrots: current.parrots.map((parrot) =>
      parrot.id === parrotId ? { ...parrot, fedToday: true } : parrot,
    ),
    newlyUnlocked: [],
  };
}

export function renameParrot(state, parrotId, nickname) {
  const cleanName = nickname.trim().slice(0, 18);
  if (!cleanName) return state;
  return {
    ...state,
    parrots: state.parrots.map((parrot) =>
      parrot.id === parrotId ? { ...parrot, nickname: cleanName } : parrot,
    ),
  };
}

export function hatchParrot(state, parrotId) {
  return {
    ...state,
    parrots: state.parrots.map((parrot) =>
      parrot.id === parrotId ? { ...parrot, hatched: true } : parrot,
    ),
  };
}

export function toggleParrotInCage(state, parrotId) {
  const current = normalizeParrotState(state);
  const target = current.parrots.find((parrot) => parrot.id === parrotId);
  if (!target) return current;
  const activeCount = current.parrots.filter((parrot) => parrot.active).length;
  if (!target.active && activeCount >= CAGE_CAPACITY) return current;
  return {
    ...current,
    parrots: current.parrots.map((parrot) =>
      parrot.id === parrotId ? { ...parrot, active: !parrot.active } : parrot,
    ),
  };
}

export function claimDailyGift(state) {
  const current = normalizeParrotState(state);
  const summary = getParrotSummary(current);
  const today = todayKey();
  if (summary.hungryCount > 0 || !summary.activeCount || current.giftClaimedOn === today) return current;

  const nextCareDay = current.careDays + 1;
  const unownedSpecial = PARROT_CATALOG.find(
    (item) => !Number.isFinite(item.unlockAt) && !current.parrots.some((parrot) => parrot.id === item.id),
  );
  const undecorated = DECORATIONS.find((item) => !current.decorations.includes(item.id));
  const unheardSound = PARROT_SOUNDS.find((item) => !current.sounds.includes(item.id));
  let gift;
  let next = { ...current, careDays: nextCareDay, giftClaimedOn: today };

  if (nextCareDay % 4 === 0) {
    next.grain = current.grain + 10;
    gift = { type: 'grain', label: '10 bonusových zrní', icon: '🌾' };
  } else if (nextCareDay % 5 === 0 && unheardSound) {
    next.sounds = [...current.sounds, unheardSound.id];
    gift = { type: 'sound', id: unheardSound.id, label: unheardSound.name, icon: '🔊' };
  } else if (nextCareDay % 3 === 0 && unownedSpecial) {
    const activeCount = current.parrots.filter((parrot) => parrot.active).length;
    next.parrots = [...current.parrots, { id: unownedSpecial.id, fedToday: true, active: activeCount < CAGE_CAPACITY, hatched: false }];
    gift = { type: 'parrot', id: unownedSpecial.id, label: unownedSpecial.name, icon: '🥚' };
  } else if (undecorated) {
    next.decorations = [...current.decorations, undecorated.id];
    gift = { type: 'decoration', id: undecorated.id, label: undecorated.name, icon: undecorated.icon };
  } else if (unheardSound) {
    next.sounds = [...current.sounds, unheardSound.id];
    gift = { type: 'sound', id: unheardSound.id, label: unheardSound.name, icon: '🔊' };
  } else {
    const palette = ['#55c9a5', '#8d73df', '#ef7189', '#4aa8e8', '#f0b542', '#60b85c'];
    const variantNumber = current.parrots.filter((item) => item.id.startsWith('color-variant-')).length + 1;
    const generated = { id: `color-variant-${variantNumber}`, name: `Barevný papoušek ${variantNumber}`, color: palette[(variantNumber - 1) % palette.length], feedCost: 3, size: ['small', 'medium', 'large'][variantNumber % 3], rarity: 'barevná varianta' };
    const activeCount = current.parrots.filter((parrot) => parrot.active).length;
    next.parrots = [...current.parrots, { ...generated, fedToday: true, active: activeCount < CAGE_CAPACITY, hatched: false }];
    gift = { type: 'parrot', id: generated.id, label: generated.name, icon: '🥚' };
  }

  return { ...next, lastGift: gift };
}

export function getParrotSummary(state) {
  const current = normalizeParrotState(state);
  const active = current.parrots.filter((parrot) => parrot.active);
  const hungry = active.filter((parrot) => !parrot.fedToday);
  const grainNeeded = hungry.reduce((sum, parrot) => {
    return sum + (getParrotDefinition(parrot)?.feedCost ?? 0);
  }, 0);
  const nextParrot = PARROT_CATALOG.find(
    (item) => Number.isFinite(item.unlockAt) && item.unlockAt > current.totalCorrect,
  ) ?? null;
  return { hungryCount: hungry.length, grainNeeded, activeCount: active.length, nextParrot };
}
