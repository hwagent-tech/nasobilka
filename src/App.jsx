import { useEffect, useMemo, useRef, useState } from 'react';
import AnswerButtons from './components/AnswerButtons';
import Question from './components/Question';
import Settings from './components/Settings';
import Stats from './components/Stats';
import ParrotCage from './components/ParrotCage';
import { claimDailyGift, feedParrot, getParrotSummary, hatchParrot, loadParrotState, renameParrot, rewardCorrectAnswer, saveParrotState, selectParrotSound, toggleParrotInCage } from './parrots';
import {
  DEFAULT_MASTERY_TIME_LIMIT_SECONDS,
  MAX_TABLE,
  RECENT_PROBLEM_WINDOW,
  REVIEW_DELAY_STEPS,
  createAnswerOptions,
  generateAllProblems,
  getAvailableProblems,
  getDefaultProgress,
  getPracticeMaxFactor,
  getVisibleProblems,
  isProgressMastered,
  loadState,
  mergeProgress,
  normalizeMasteryTimeLimitSeconds,
  pickAdaptiveProblem,
  recordCorrectAnswer,
  recordWrongAnswer,
  saveState,
} from './utils';

const allProblems = generateAllProblems();

const STREAK_MILESTONES = [
  { count: 5, label: 'První plamínek!', icon: '🔥' },
  { count: 10, label: 'Stříbrná hvězda!', icon: '🌟' },
  { count: 15, label: 'Zlatá koruna!', icon: '👑' },
  { count: 20, label: 'Duhový mistr!', icon: '🏆' },
  { count: 25, label: 'Super série!', icon: '⭐' },
  { count: 30, label: 'Mistr násobilky!', icon: '🥇' },
  { count: 40, label: 'Matematická legenda!', icon: '🚀' },
  { count: 50, label: 'Nepřekonatelná série!', icon: '💎' },
];

function getMilestone(streak) {
  return STREAK_MILESTONES.find((milestone) => milestone.count === streak) ?? null;
}

function getStreakIcon(streak) {
  return [...STREAK_MILESTONES]
    .reverse()
    .find((milestone) => streak >= milestone.count)?.icon ?? '○';
}

function playCelebrationTone(streak) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const notes = streak >= 10 ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25, 783.99];
  const start = context.currentTime;

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = start + index * 0.11;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.16, noteStart + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.32);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 0.34);
  });

  window.setTimeout(() => context.close(), 1000);
}

function Celebration({ milestone }) {
  if (!milestone) return null;

  return (
    <div className="celebration" aria-live="polite">
      <div className="celebration-message">
        <span>{milestone.icon}</span>
        <strong>{milestone.label}</strong>
      </div>
      {Array.from({ length: 32 }, (_, index) => (
        <i
          key={index}
          className="confetti"
          style={{
            '--x': `${8 + ((index * 37) % 84)}vw`,
            '--delay': `${(index % 8) * 0.035}s`,
            '--spin': `${360 + (index % 5) * 120}deg`,
            '--color': ['#ffb23f', '#4aa8ff', '#ff5e78', '#55c98b', '#a77cf4'][index % 5],
          }}
        />
      ))}
    </div>
  );
}

function buildNextRound(settings, progress, reviewQueue, recentProblemKeys) {
  const availableProblems = getAvailableProblems(allProblems, settings, progress);
  const nextProblem = pickAdaptiveProblem(
    availableProblems,
    progress,
    reviewQueue,
    recentProblemKeys,
    settings.masteryTimeLimitSeconds,
  );

  if (!nextProblem) {
    return {
      availableProblems,
      currentProblem: null,
      answerOptions: [],
    };
  }

  return {
    availableProblems,
    currentProblem: nextProblem,
    answerOptions: createAnswerOptions(nextProblem, availableProblems),
  };
}

export default function App() {
  const initialState = useMemo(() => loadState(allProblems), []);
  const [settings, setSettings] = useState(initialState.settings);
  const [progress, setProgress] = useState(initialState.progress);
  const [parrotState, setParrotState] = useState(() => loadParrotState());
  const [view, setView] = useState('practice');
  const [seriesCorrect, setSeriesCorrect] = useState(0);
  const [seriesTotal, setSeriesTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [heartAvailable, setHeartAvailable] = useState(true);
  const [celebration, setCelebration] = useState(null);
  const [sortBy, setSortBy] = useState('numbers');
  const [filterTable, setFilterTable] = useState('all');
  const [filterMastery, setFilterMastery] = useState('all');
  const [feedback, setFeedback] = useState({
    status: '',
    message: '',
  });
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [questionResolved, setQuestionResolved] = useState(false);
  const [reviewQueue, setReviewQueue] = useState({});
  const [recentProblemKeys, setRecentProblemKeys] = useState([]);
  const [{ availableProblems, currentProblem, answerOptions }, setRound] = useState(() =>
    buildNextRound(initialState.settings, initialState.progress, {}, []),
  );
  const questionStartedAt = useRef(Date.now());
  const nextRoundTimeout = useRef(null);
  const progressRef = useRef(initialState.progress);
  const reviewQueueRef = useRef({});
  const recentProblemKeysRef = useRef([]);
  const currentRoundHadMistake = useRef(false);
  const currentRoundProtected = useRef(false);
  const streakRef = useRef(0);
  const heartAvailableRef = useRef(true);
  const celebrationTimeout = useRef(null);

  useEffect(() => {
    saveState({ settings, progress });
  }, [settings, progress]);

  useEffect(() => {
    saveParrotState(parrotState);
  }, [parrotState]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    reviewQueueRef.current = reviewQueue;
  }, [reviewQueue]);

  useEffect(() => {
    recentProblemKeysRef.current = recentProblemKeys;
  }, [recentProblemKeys]);

  useEffect(
    () => () => {
      if (nextRoundTimeout.current) {
        window.clearTimeout(nextRoundTimeout.current);
      }
      if (celebrationTimeout.current) {
        window.clearTimeout(celebrationTimeout.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (nextRoundTimeout.current) {
      window.clearTimeout(nextRoundTimeout.current);
    }

    const nextRound = buildNextRound(
      settings,
      progressRef.current,
      reviewQueueRef.current,
      recentProblemKeysRef.current,
    );
    setRound(nextRound);
    setWrongAnswers([]);
    currentRoundHadMistake.current = false;
    currentRoundProtected.current = false;
    setQuestionResolved(false);
    setFeedback({
      status: '',
      message: nextRound.currentProblem
        ? ''
        : 'Nejsou dostupné žádné příklady. Vyber alespoň jednu násobilku.',
    });
    questionStartedAt.current = Date.now();
  }, [settings]);

  useEffect(() => {
    if (filterTable !== 'all' && Number(filterTable) > getPracticeMaxFactor(settings)) {
      setFilterTable('all');
    }
  }, [filterTable, settings]);

  const statsRows = useMemo(
    () =>
      getVisibleProblems(allProblems, settings, progress).map(
        (problem) => progress[problem.key] ?? getDefaultProgress(problem),
      ),
    [progress, settings],
  );
  const statsMaxFactor = getPracticeMaxFactor(settings);
  const masteryTimeLimitSeconds = normalizeMasteryTimeLimitSeconds(
    settings.masteryTimeLimitSeconds ?? DEFAULT_MASTERY_TIME_LIMIT_SECONDS,
  );
  const totalExamples = statsRows.length;
  const progressMasteredCount = useMemo(
    () => statsRows.filter((row) => isProgressMastered(row, masteryTimeLimitSeconds)).length,
    [masteryTimeLimitSeconds, statsRows],
  );
  const progressPercent = totalExamples
    ? Math.round((progressMasteredCount / totalExamples) * 100)
    : 0;
  const parrotSummary = getParrotSummary(parrotState);

  function advanceToNextRound(nextProgress, nextReviewQueue, nextRecentProblemKeys) {
    const nextRound = buildNextRound(settings, nextProgress, nextReviewQueue, nextRecentProblemKeys);
    setRound(nextRound);
    setWrongAnswers([]);
    currentRoundHadMistake.current = false;
    currentRoundProtected.current = false;
    setQuestionResolved(false);
    setFeedback({
      status: '',
      message: '',
    });
    questionStartedAt.current = Date.now();
  }

  function handleAnswer(answer) {
    if (!currentProblem || questionResolved) {
      return;
    }

    const isCorrect = answer === currentProblem.answer;
    const elapsed = Date.now() - questionStartedAt.current;

    if (!isCorrect) {
      if (!currentRoundHadMistake.current) {
        if (heartAvailableRef.current && streakRef.current > 0) {
          heartAvailableRef.current = false;
          currentRoundProtected.current = true;
          setHeartAvailable(false);
          setFeedback({
            status: 'wrong',
            message: 'Zkus to znovu',
          });
        } else {
          streakRef.current = 0;
          setStreak(0);
          heartAvailableRef.current = true;
          setHeartAvailable(true);
        }
      }
      currentRoundHadMistake.current = true;
      setWrongAnswers((currentWrongAnswers) =>
        currentWrongAnswers.includes(answer)
          ? currentWrongAnswers
          : [...currentWrongAnswers, answer],
      );
      if (!currentRoundProtected.current) {
        setFeedback({
          status: 'wrong',
          message: 'Zkus to znovu',
        });
      }

      const nextProgress = {
        ...progressRef.current,
        [currentProblem.key]: recordWrongAnswer(
          progressRef.current[currentProblem.key],
          elapsed,
        ),
      };
      const nextReviewQueue = {
        ...reviewQueueRef.current,
        [currentProblem.key]: {
          remaining: REVIEW_DELAY_STEPS,
        },
      };

      progressRef.current = nextProgress;
      reviewQueueRef.current = nextReviewQueue;
      setProgress(nextProgress);
      setReviewQueue(nextReviewQueue);

      return;
    }

    const earnedGrain = elapsed < masteryTimeLimitSeconds * 1000;
    setQuestionResolved(true);
    if (earnedGrain) {
      setParrotState((current) => rewardCorrectAnswer(current));
    }
    setSeriesTotal((count) => count + 1);
    if (currentRoundHadMistake.current) {
      if (!currentRoundProtected.current) {
        setStreak(0);
        streakRef.current = 0;
      }
    } else {
      setSeriesCorrect((count) => count + 1);
      const nextStreak = streakRef.current + 1;
      streakRef.current = nextStreak;
      setStreak(nextStreak);
    }
    setFeedback({
      status: 'correct',
      message: 'Správně',
    });

    const currentItem = progressRef.current[currentProblem.key];
    const nextProgress = {
      ...progressRef.current,
      [currentProblem.key]: recordCorrectAnswer(
        currentItem,
        elapsed,
        masteryTimeLimitSeconds,
      ),
    };

    const nextRecentProblemKeys = [...recentProblemKeysRef.current, currentProblem.key].slice(
      -RECENT_PROBLEM_WINDOW,
    );
    const nextReviewQueue = Object.entries(reviewQueueRef.current).reduce((queue, [key, value]) => {
      if (key === currentProblem.key) {
        return queue;
      }

      queue[key] = {
        remaining: Math.max(-1, value.remaining - 1),
      };

      return queue;
    }, {});

    progressRef.current = nextProgress;
    reviewQueueRef.current = nextReviewQueue;
    recentProblemKeysRef.current = nextRecentProblemKeys;
    setProgress(nextProgress);
    setRecentProblemKeys(nextRecentProblemKeys);
    setReviewQueue(nextReviewQueue);

    nextRoundTimeout.current = window.setTimeout(() => {
      advanceToNextRound(nextProgress, nextReviewQueue, nextRecentProblemKeys);
    }, 650);
  }

  function updateSettings(nextSettings) {
    const safeTables = nextSettings.selectedTables.length ? nextSettings.selectedTables : [1];

    setSettings({
      ...nextSettings,
      selectedTables: safeTables,
      masteryTimeLimitSeconds: normalizeMasteryTimeLimitSeconds(
        nextSettings.masteryTimeLimitSeconds,
      ),
    });
  }

  function toggleTable(table) {
    updateSettings({
      ...settings,
      selectedTables: settings.selectedTables.includes(table)
        ? settings.selectedTables.filter((value) => value !== table)
        : [...settings.selectedTables, table].sort((left, right) => left - right),
    });
  }

  function resetProgress() {
    const cleanProgress = mergeProgress(
      allProblems,
      {},
      settings.masteryTimeLimitSeconds,
    );
    progressRef.current = cleanProgress;
    reviewQueueRef.current = {};
    recentProblemKeysRef.current = [];
    setProgress(cleanProgress);
    setReviewQueue({});
    setRecentProblemKeys([]);
    setWrongAnswers([]);
    setQuestionResolved(false);
    setFeedback({
      status: '',
      message: 'Postup byl resetován.',
    });
    const nextRound = buildNextRound(settings, cleanProgress, {}, []);
    setRound(nextRound);
    questionStartedAt.current = Date.now();
  }

  return (
    <div className={`app-shell ${view === 'practice' ? 'practice-view' : ''}`}>
      {view === 'practice' && (
        <header className="session-header">
          <div className="session-score">
            <strong>{seriesCorrect} / {seriesTotal}</strong>
            <span>správně</span>
          </div>
          <div className="session-title">Nakrmit {parrotSummary.hungryCount}</div>
          <div className="streak-score">
            <span className="parrot-header-stat"><b>🌾</b><strong>{parrotState.grain}</strong></span>
            <span className="parrot-header-stat"><b>🦜</b><strong>{parrotSummary.hungryCount}</strong></span>
          </div>
        </header>
      )}

      {view === 'practice' ? (
        <main className="content-single">
          <div className="practice-panel">
            {currentProblem ? (
              <>
                <Question
                  a={currentProblem.a}
                  b={currentProblem.b}
                  feedback={feedback}
                  problemKey={currentProblem.key}
                  timeLimitSeconds={masteryTimeLimitSeconds}
                />
                <AnswerButtons
                  options={answerOptions}
                  correctAnswer={currentProblem.answer}
                  wrongAnswers={wrongAnswers}
                  questionResolved={questionResolved}
                  onAnswer={handleAnswer}
                />
              </>
            ) : (
              <section className="question-card empty-state">
                <div className="question-text">Žádné otázky</div>
                <div className="feedback">{feedback.message}</div>
              </section>
            )}
          </div>
        </main>
      ) : view === 'stats' ? (
        <main className="content-single">
          <Stats
            masteryTimeLimitSeconds={masteryTimeLimitSeconds}
            rows={statsRows}
            filterTable={filterTable}
            filterMastery={filterMastery}
            maxFactor={statsMaxFactor}
            progressMasteredCount={progressMasteredCount}
            progressPercent={progressPercent}
            totalExamples={totalExamples}
            sortBy={sortBy}
            onFilterChange={setFilterTable}
            onMasteryFilterChange={setFilterMastery}
            onSortChange={setSortBy}
          />
        </main>
      ) : view === 'cage' ? (
        <ParrotCage
          onMove={(id, position) => setParrotState((current) => ({ ...current, positions: { ...current.positions, [id]: position } }))}
          state={parrotState}
          onFeed={(parrotId) => setParrotState((current) => feedParrot(current, parrotId))}
          onRename={(parrotId, name) => setParrotState((current) => renameParrot(current, parrotId, name))}
          onToggleCage={(parrotId) => setParrotState((current) => toggleParrotInCage(current, parrotId))}
          onClaimGift={() => setParrotState((current) => claimDailyGift(current))}
          onHatch={(parrotId) => setParrotState((current) => hatchParrot(current, parrotId))}
          onSelectSound={(soundId, parrotId) => setParrotState((current) => selectParrotSound(current, soundId, parrotId))}
        />
      ) : (
        <main className="content-single">
          <Settings
            settings={settings}
            availableCount={availableProblems.length}
            onToggleTable={toggleTable}
            onSelectAll={() =>
              updateSettings({
                ...settings,
                selectedTables: Array.from({ length: MAX_TABLE }, (_, index) => index + 1),
              })
            }
            onSelectNone={() =>
              updateSettings({
                ...settings,
                selectedTables: [1],
              })
            }
            onProgressiveChange={(checked) =>
              updateSettings({
                ...settings,
                progressiveLearning: checked,
              })
            }
            onMasteryTimeLimitChange={(value) =>
              updateSettings({
                ...settings,
                masteryTimeLimitSeconds: Number(value),
              })
            }
            onResetProgress={resetProgress}
          />
        </main>
      )}

      <nav className="bottom-nav" aria-label="Hlavní navigace">
        {[
          ['practice', '⌂', 'Počítání'],
          ['stats', '▥', 'Statistiky'],
          ['cage', '🦜', 'Klec'],
          ['settings', '⚙', 'Nastavení'],
        ].map(([target, icon, label]) => (
          <button
            key={target}
            type="button"
            className={view === target ? 'active' : ''}
            onClick={() => setView(target)}
            aria-current={view === target ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
