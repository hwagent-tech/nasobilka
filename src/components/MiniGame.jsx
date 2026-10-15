import { useEffect, useMemo, useRef, useState } from 'react';

function createChallenge() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const answer = a * b;
  const choices = new Set([answer]);

  while (choices.size < 4) {
    choices.add(Math.max(1, answer + (Math.floor(Math.random() * 9) - 4)));
  }

  return { a, b, answer, choices: [...choices].sort(() => Math.random() - 0.5) };
}

export default function MiniGame() {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAt = useRef(0);
  const challenge = useMemo(() => createChallenge(), [round]);

  useEffect(() => {
    if (!playing) return undefined;

    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt.current);
    }, 100);

    return () => window.clearInterval(timer);
  }, [playing]);

  const formattedTime = `${(elapsedMs / 1000).toFixed(1)} s`;

  function start() {
    setScore(0);
    setRound(1);
    setElapsedMs(0);
    startedAt.current = Date.now();
    setPlaying(true);
  }

  function answer(value) {
    const nextScore = score + (value === challenge.answer ? 1 : 0);
    setScore(nextScore);

    if (round >= 10) {
      const finalTime = Date.now() - startedAt.current;
      setElapsedMs(finalTime);
      setBest((current) => {
        if (!current || nextScore > current.score) return { score: nextScore, time: finalTime };
        if (nextScore === current.score && finalTime < current.time) {
          return { score: nextScore, time: finalTime };
        }
        return current;
      });
      setPlaying(false);
    } else {
      setRound((current) => current + 1);
    }
  }

  return (
    <main className="game-screen">
      <section className="game-card">
        <div className="game-emoji" aria-hidden="true">⚡</div>
        <p className="game-kicker">Blesková výzva</p>
        {!playing ? (
          <>
            <h2>{round ? `Skóre ${score} / 10` : 'Deset rychlých příkladů'}</h2>
            <p>Odpověz správně a potom zkus zlepšit svůj čas.</p>
            {round > 0 && <div className="result-time">Čas: {formattedTime}</div>}
            {best && (
              <div className="best-score">
                Rekord: {best.score} / 10 za {(best.time / 1000).toFixed(1)} s
              </div>
            )}
            <button type="button" className="game-start" onClick={start}>
              {round ? 'Hrát znovu' : 'Spustit hru'}
            </button>
          </>
        ) : (
          <>
            <div className="game-progress"><span style={{ width: `${round * 10}%` }} /></div>
            <div className="game-meta">
              <span>{round} / 10</span>
              <span className="game-timer">⏱ {formattedTime}</span>
              <span>{score} bodů</span>
            </div>
            <div className="game-question">{challenge.a} × {challenge.b}</div>
            <div className="game-answers">
              {challenge.choices.map((choice) => (
                <button key={choice} type="button" onClick={() => answer(choice)}>{choice}</button>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
