import { useEffect, useMemo, useRef, useState } from 'react';
import AnswerButtons from './components/AnswerButtons';
import Question from './components/Question';
import Settings from './components/Settings';
import Stats from './components/Stats';
import {
  MAX_TABLE,
  RECENT_PROBLEM_WINDOW,
  REVIEW_DELAY_STEPS,
  createAnswerOptions,
  generateAllProblems,
  getAvailableProblems,
  getDefaultProgress,
  getMasteryTimeLimit,
  getPracticeMaxFactor,
  getVisibleProblems,
  isProgressMastered,
  isMastered,
  loadState,
  mergeProgress,
  pickAdaptiveProblem,
  recordCorrectAnswer,
  recordWrongAnswer,
  saveState,
} from './utils';

const allProblems = generateAllProblems();

function buildNextRound(settings, progress, reviewQueue, recentProblemKeys) {
  const availableProblems = getAvailableProblems(allProblems, settings, progress);
  const nextProblem = pickAdaptiveProblem(
    availableProblems,
    progress,
    reviewQueue,
    recentProblemKeys,
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
  const [view, setView] = useState('practice');
  const [sortBy, setSortBy] = useState('numbers');
  const [filterTable, setFilterTable] = useState('all');
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

  useEffect(() => {
    saveState({ settings, progress });
  }, [settings, progress]);

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
  const masteryTimeLimit = useMemo(() => getMasteryTimeLimit(statsRows), [statsRows]);
  const totalExamples = statsRows.length;
  const progressMasteredCount = useMemo(
    () => statsRows.filter((row) => isProgressMastered(row)).length,
    [statsRows],
  );
  const progressPercent = totalExamples
    ? Math.round((progressMasteredCount / totalExamples) * 100)
    : 0;

  function advanceToNextRound(nextProgress, nextReviewQueue, nextRecentProblemKeys) {
    const nextRound = buildNextRound(settings, nextProgress, nextReviewQueue, nextRecentProblemKeys);
    setRound(nextRound);
    setWrongAnswers([]);
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
      setWrongAnswers((currentWrongAnswers) =>
        currentWrongAnswers.includes(answer)
          ? currentWrongAnswers
          : [...currentWrongAnswers, answer],
      );
      setFeedback({
        status: 'wrong',
        message: 'Špatně. Zkus najít správnou odpověď.',
      });

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

    setQuestionResolved(true);
    setFeedback({
      status: 'correct',
      message: 'Správně',
    });

    const currentItem = progressRef.current[currentProblem.key];
    const nextProgress = {
      ...progressRef.current,
      [currentProblem.key]: recordCorrectAnswer(currentItem, elapsed, masteryTimeLimit),
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
    const cleanProgress = mergeProgress(allProblems);
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

  const practicedCount = statsRows.filter((row) => row.totalAttempts > 0).length;
  const masteredCount = statsRows.filter((row) => isMastered(row, masteryTimeLimit)).length;

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <div className="eyebrow">Adaptivní trenér násobilky</div>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <span>Procvičeno</span>
            <strong>{practicedCount}</strong>
          </div>
          <div className="stat-card">
            <span>Zvládnuto</span>
            <strong>
              {progressMasteredCount} / {totalExamples}
            </strong>
            <small>{progressPercent}% hotovo</small>
          </div>
          <div className="stat-card">
            <span>Násobilky</span>
            <strong>{settings.selectedTables.length}/{MAX_TABLE}</strong>
            <small>Adaptivně: {masteredCount}</small>
          </div>
        </div>
      </header>

      <nav className="view-switch">
        <button
          type="button"
          className={view === 'practice' ? 'active' : ''}
          onClick={() => setView('practice')}
        >
          Procvičování
        </button>
        <button
          type="button"
          className={view === 'stats' ? 'active' : ''}
          onClick={() => setView('stats')}
        >
          Statistiky
        </button>
        <button
          type="button"
          className={view === 'settings' ? 'active' : ''}
          onClick={() => setView('settings')}
        >
          Nastavení
        </button>
      </nav>

      {view === 'practice' ? (
        <main className="content-single">
          <div className="practice-panel">
            {currentProblem ? (
              <>
                <Question a={currentProblem.a} b={currentProblem.b} feedback={feedback} />
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
            rows={statsRows}
            filterTable={filterTable}
            maxFactor={statsMaxFactor}
            progressMasteredCount={progressMasteredCount}
            progressPercent={progressPercent}
            totalExamples={totalExamples}
            sortBy={sortBy}
            onFilterChange={setFilterTable}
            onSortChange={setSortBy}
          />
        </main>
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
            onResetProgress={resetProgress}
          />
        </main>
      )}
    </div>
  );
}
