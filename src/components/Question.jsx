export default function Question({ a, b, feedback, problemKey, timeLimitSeconds }) {
  return (
    <section className="question-card">
      <div className="mastery-timer-label">
        <span>Čas pro zvládnutí</span>
        <strong>{timeLimitSeconds} s</strong>
      </div>
      <div
        className="mastery-timer"
        role="progressbar"
        aria-label={`Časový limit ${timeLimitSeconds} sekund`}
      >
        <span
          key={`${problemKey}-${timeLimitSeconds}`}
          style={{ animationDuration: `${timeLimitSeconds}s` }}
        />
      </div>
      <div className="question-label">Kolik je?</div>
      <div className="question-text">
        {a} <span>×</span> {b}
      </div>
      <div className={`feedback ${feedback.status || ''}`}>
        {feedback.message || 'Vyber správnou odpověď.'}
      </div>
    </section>
  );
}
