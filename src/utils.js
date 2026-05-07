export const MIN_TABLE = 1;
export const MAX_TABLE = 12;
export const STORAGE_KEY = 'multiplication-trainer-state-v1';
export const MAX_RECENT_TIMES = 5;
export const ANSWER_OPTIONS_COUNT = 4;
export const REVIEW_DELAY_STEPS = 3;
export const RECENT_PROBLEM_WINDOW = 4;
export const PROGRESS_MASTERED_MEDIAN_MS = 3000;
export const MASTERED_RETRY_CORRECT_COUNT = 3;
export const MASTERED_EXTRA_TIME_MS = 1000;

export function hasExtendedRange(settings) {
  return settings.selectedTables.includes(11) || settings.selectedTables.includes(12);
}

export function getPracticeMaxFactor(settings) {
  return hasExtendedRange(settings) ? 12 : 10;
}

export function createProblemKey(a, b) {
  return `${a}x${b}`;
}

export function generateAllProblems() {
  const problems = [];

  for (let a = MIN_TABLE; a <= MAX_TABLE; a += 1) {
    for (let b = MIN_TABLE; b <= MAX_TABLE; b += 1) {
      problems.push({
        key: createProblemKey(a, b),
        a,
        b,
        answer: a * b,
      });
    }
  }

  return problems;
}

export function getDefaultSettings() {
  return {
    selectedTables: [1, 2, 3, 4, 5],
    progressiveLearning: true,
  };
}

export function getDefaultProgress(problem) {
  return {
    key: problem.key,
    a: problem.a,
    b: problem.b,
    answer: problem.answer,
    last5Times: [],
    responseTimes: [],
    recentCorrectTimes: [],
    mistakes: 0,
    correctCount: 0,
    totalAttempts: 0,
    firstCorrectTime: null,
    mastered: false,
    masteryMode: null,
  };
}

export function median(values) {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }

  return sorted[middle];
}

export function formatMs(ms) {
  if (ms === null || ms === undefined) {
    return '—';
  }

  return `${(ms / 1000).toFixed(2)}s`;
}

export function clampHistory(times) {
  return times.slice(-MAX_RECENT_TIMES);
}

export function clampRecentCorrectTimes(times) {
  return times.slice(-MASTERED_RETRY_CORRECT_COUNT);
}

export function getMedianTime(progressItem) {
  return median(progressItem.last5Times);
}

export function getRecentCorrectMedianTime(progressItem) {
  return median(progressItem.recentCorrectTimes ?? []);
}

export function getRetryCorrectTimes(progressItem) {
  if (progressItem.mistakes > 0) {
    return progressItem.recentCorrectTimes ?? [];
  }

  return (progressItem.last5Times ?? []).slice(1).slice(-MASTERED_RETRY_CORRECT_COUNT);
}

export function getEffectiveMasteryTimeLimit(masteryTimeLimit = null) {
  return masteryTimeLimit ?? PROGRESS_MASTERED_MEDIAN_MS;
}

export function evaluateMastery(progressItem, masteryTimeLimit = null) {
  const timeLimit = getEffectiveMasteryTimeLimit(masteryTimeLimit);

  if (progressItem.mistakes === 0) {
    const firstCorrectTime = progressItem.firstCorrectTime ?? progressItem.last5Times?.[0] ?? null;
    const mastered =
      progressItem.correctCount > 0 &&
      firstCorrectTime !== null &&
      firstCorrectTime < timeLimit;

    if (mastered) {
      return {
        mastered: true,
        masteryMode: 'first-fast',
      };
    }
  }

  const retryCorrectTimes = getRetryCorrectTimes(progressItem);
  const medianTime = median(retryCorrectTimes);
  const mastered =
    retryCorrectTimes.length >= MASTERED_RETRY_CORRECT_COUNT &&
    medianTime !== null &&
    medianTime < timeLimit;

  return {
    mastered,
    masteryMode: mastered ? 'retry-median' : null,
  };
}

export function isProgressMastered(
  progressItem,
  thresholdMs = PROGRESS_MASTERED_MEDIAN_MS,
) {
  return evaluateMastery(progressItem, thresholdMs).mastered;
}

export function getAverageMedianTime(progressItems) {
  const medians = progressItems
    .map((item) => getMedianTime(item))
    .filter((value) => value !== null);

  if (!medians.length) {
    return null;
  }

  return Math.round(medians.reduce((sum, value) => sum + value, 0) / medians.length);
}

export function getMasteryTimeLimit(progressItems) {
  const averageMedian = getAverageMedianTime(progressItems);
  if (averageMedian === null) {
    return null;
  }

  return averageMedian + MASTERED_EXTRA_TIME_MS;
}

export function isMastered(progressItem, masteryTimeLimit = null) {
  return evaluateMastery(progressItem, masteryTimeLimit).mastered;
}

export function recordWrongAnswer(progressItem, elapsedMs) {
  return {
    ...progressItem,
    totalAttempts: progressItem.totalAttempts + 1,
    mistakes: progressItem.mistakes + 1,
    responseTimes: [...(progressItem.responseTimes ?? []), elapsedMs],
    recentCorrectTimes: [],
    mastered: false,
    masteryMode: null,
  };
}

export function recordCorrectAnswer(progressItem, elapsedMs, masteryTimeLimit = null) {
  const last5Times = clampHistory([...progressItem.last5Times, elapsedMs]);
  const responseTimes = [
    ...(progressItem.responseTimes ?? progressItem.last5Times),
    elapsedMs,
  ];
  const recentCorrectTimes = clampRecentCorrectTimes([
    ...(progressItem.recentCorrectTimes ?? []),
    elapsedMs,
  ]);
  const nextProgressItem = {
    ...progressItem,
    totalAttempts: progressItem.totalAttempts + 1,
    correctCount: progressItem.correctCount + 1,
    last5Times,
    responseTimes,
    recentCorrectTimes,
    firstCorrectTime: progressItem.firstCorrectTime ?? elapsedMs,
  };
  const mastery = evaluateMastery(nextProgressItem, masteryTimeLimit);

  return {
    ...nextProgressItem,
    ...mastery,
  };
}

export function mergeProgress(allProblems, savedProgress = {}) {
  const merged = {};

  allProblems.forEach((problem) => {
    const existing = savedProgress[problem.key];
    const last5Times = clampHistory(existing?.last5Times || []);
    const responseTimes = existing?.responseTimes || last5Times;
    const recentCorrectTimes = clampRecentCorrectTimes(existing?.recentCorrectTimes || []);
    const hydrated = {
      ...getDefaultProgress(problem),
      ...existing,
      last5Times,
      responseTimes,
      recentCorrectTimes,
      firstCorrectTime: existing?.firstCorrectTime ?? responseTimes[0] ?? null,
    };
    const mastery = evaluateMastery(hydrated);

    merged[problem.key] = {
      ...hydrated,
      ...mastery,
    };
  });

  return merged;
}

export function loadState(allProblems) {
  const fallback = {
    settings: getDefaultSettings(),
    progress: mergeProgress(allProblems),
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    const selectedTables = parsed.settings?.selectedTables?.filter(
      (value) => value >= MIN_TABLE && value <= MAX_TABLE,
    );

    return {
      settings: {
        ...getDefaultSettings(),
        ...parsed.settings,
        selectedTables: selectedTables?.length
          ? selectedTables
          : getDefaultSettings().selectedTables,
      },
      progress: mergeProgress(allProblems, parsed.progress),
    };
  } catch {
    return fallback;
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function shuffle(array) {
  const next = [...array];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export function getAvailableProblems(allProblems, settings, progressMap) {
  const selected = new Set(settings.selectedTables);
  if (!selected.size) {
    return [];
  }

  const maxFactor = getPracticeMaxFactor(settings);
  let base = allProblems.filter(
    (problem) => selected.has(problem.a) && problem.b <= maxFactor,
  );

  if (!settings.progressiveLearning) {
    return base;
  }

  const masteryTimeLimit = getMasteryTimeLimit(
    base.map((problem) => progressMap[problem.key]),
  );

  const sortedTables = [...selected].sort((left, right) => left - right);
  const unlockedTables = sortedTables.filter((table) => {
    if (table === sortedTables[0]) {
      return true;
    }

    const previousTable = table - 1;
    if (!selected.has(previousTable)) {
      return false;
    }

    const previousProblems = allProblems.filter(
      (problem) => problem.a === previousTable && problem.b <= maxFactor,
    );
    const masteredCount = previousProblems.filter((problem) =>
      isMastered(progressMap[problem.key], masteryTimeLimit),
    ).length;

    return masteredCount >= Math.ceil(previousProblems.length * 0.7);
  });

  const unlockedSet = new Set(unlockedTables);
  base = base.filter((problem) => unlockedSet.has(problem.a));

  return base.length
    ? base
    : allProblems.filter(
        (problem) => problem.a === sortedTables[0] && problem.b <= maxFactor,
      );
}

export function getVisibleProblems(allProblems, settings, progressMap) {
  const selected = new Set(settings.selectedTables);
  const maxFactor = getPracticeMaxFactor(settings);

  return allProblems.filter(
    (problem) => selected.has(problem.a) && problem.b <= maxFactor,
  );
}

function getProblemBucket(progressItem) {
  const hasMistakes = progressItem.mistakes > 0;
  const hasWrongHistory = progressItem.totalAttempts > progressItem.correctCount;
  const isNew = progressItem.totalAttempts === 0;

  if (hasMistakes || hasWrongHistory) {
    return 'high';
  }

  if (isNew) {
    return 'medium';
  }

  return 'medium';
}

function getProblemWeight(problem, progressItem, reviewQueue, masteryTimeLimit) {
  const medianTime = getMedianTime(progressItem);
  const queuedReview = reviewQueue[problem.key] ?? null;
  let weight = 1;

  if (queuedReview && queuedReview.remaining <= 0) {
    weight += 14;
  }

  switch (getProblemBucket(progressItem)) {
    case 'high':
      weight += 10;
      break;
    case 'medium':
      weight += 5;
      break;
    case 'low':
      weight += 1;
      break;
    default:
      break;
  }

  if (medianTime !== null) {
    weight += Math.min(6, medianTime / 1000);
  } else {
    weight += 3;
  }

  if (isMastered(progressItem, masteryTimeLimit)) {
    weight = Math.max(1, weight - 6);
  }

  return weight;
}

function weightedRandomPick(problems, progressMap, reviewQueue) {
  const masteryTimeLimit = getMasteryTimeLimit(
    problems.map((problem) => progressMap[problem.key]),
  );
  const weighted = problems.map((problem) => ({
    problem,
    weight: getProblemWeight(
      problem,
      progressMap[problem.key],
      reviewQueue,
      masteryTimeLimit,
    ),
  }));
  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    return shuffle(problems)[0] ?? null;
  }

  let threshold = Math.random() * totalWeight;

  for (const entry of weighted) {
    threshold -= entry.weight;
    if (threshold <= 0) {
      return entry.problem;
    }
  }

  return weighted[weighted.length - 1]?.problem ?? null;
}

export function pickAdaptiveProblem(availableProblems, progressMap, reviewQueue, recentProblemKeys) {
  if (!availableProblems.length) {
    return null;
  }

  const recentSet = new Set(recentProblemKeys);
  const nonRecentProblems = availableProblems.filter((problem) => !recentSet.has(problem.key));
  const selectionPool = nonRecentProblems.length ? nonRecentProblems : availableProblems;
  const readyReviews = selectionPool.filter(
    (problem) => (reviewQueue[problem.key]?.remaining ?? Infinity) <= 0,
  );

  if (readyReviews.length) {
    return weightedRandomPick(readyReviews, progressMap, reviewQueue);
  }

  return weightedRandomPick(selectionPool, progressMap, reviewQueue);
}

function addCandidateAnswer(candidates, value, correctAnswer) {
  if (value > 0 && value !== correctAnswer) {
    candidates.add(value);
  }
}

function getPlausibleWrongAnswers(problem, availableProblems) {
  const { a, b, answer } = problem;
  const candidates = new Set();
  const nearbyFactors = new Set([
    b - 2,
    b - 1,
    b + 1,
    b + 2,
    a - 2,
    a - 1,
    a + 1,
    a + 2,
  ]);

  nearbyFactors.forEach((factor) => {
    if (factor >= MIN_TABLE && factor <= MAX_TABLE) {
      addCandidateAnswer(candidates, a * factor, answer);
      addCandidateAnswer(candidates, b * factor, answer);
    }
  });

  addCandidateAnswer(candidates, answer - a, answer);
  addCandidateAnswer(candidates, answer + a, answer);
  addCandidateAnswer(candidates, answer - b, answer);
  addCandidateAnswer(candidates, answer + b, answer);
  addCandidateAnswer(candidates, answer - 1, answer);
  addCandidateAnswer(candidates, answer + 1, answer);
  addCandidateAnswer(candidates, answer - 2, answer);
  addCandidateAnswer(candidates, answer + 2, answer);
  addCandidateAnswer(candidates, (a + 1) * (b + 1), answer);
  addCandidateAnswer(candidates, (a - 1) * (b + 1), answer);
  addCandidateAnswer(candidates, (a + 1) * (b - 1), answer);

  const sameTableNeighbors = availableProblems.filter(
    (candidate) =>
      candidate.key !== problem.key &&
      (candidate.a === a || candidate.b === b || candidate.a === b || candidate.b === a),
  );

  shuffle(sameTableNeighbors)
    .slice(0, 8)
    .forEach((candidate) => {
      if (Math.abs(candidate.answer - answer) <= Math.max(12, a + b)) {
        addCandidateAnswer(candidates, candidate.answer, answer);
      }
    });

  const closeGlobalAnswers = availableProblems
    .filter(
      (candidate) =>
        candidate.key !== problem.key &&
        Math.abs(candidate.answer - answer) <= Math.max(10, Math.ceil(answer * 0.2)),
    )
    .sort((left, right) => Math.abs(left.answer - answer) - Math.abs(right.answer - answer));

  closeGlobalAnswers.slice(0, 10).forEach((candidate) => {
    addCandidateAnswer(candidates, candidate.answer, answer);
  });

  return shuffle([...candidates]);
}

export function createAnswerOptions(problem, availableProblems) {
  const answers = new Set([problem.answer]);
  const plausibleWrongAnswers = getPlausibleWrongAnswers(problem, availableProblems);

  for (const candidateAnswer of plausibleWrongAnswers) {
    if (answers.size >= ANSWER_OPTIONS_COUNT) {
      break;
    }

    answers.add(candidateAnswer);
  }

  let offset = 1;
  while (answers.size < ANSWER_OPTIONS_COUNT) {
    addCandidateAnswer(answers, problem.answer + offset, problem.answer);
    addCandidateAnswer(answers, problem.answer - offset, problem.answer);
    addCandidateAnswer(answers, problem.answer + offset * 2, problem.answer);
    offset += 1;
  }

  return shuffle([...answers].slice(0, ANSWER_OPTIONS_COUNT));
}
