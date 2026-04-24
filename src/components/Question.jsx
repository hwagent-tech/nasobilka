export default function Question({ a, b, feedback }) {
  return (
    <section className="question-card">
      <div className="question-label">Aktuální otázka</div>
      <div className="question-text">
        {a} × {b}
      </div>
      <div className={`feedback ${feedback.status || ''}`}>
        {feedback.message || 'Vyber správnou odpověď.'}
      </div>
    </section>
  );
}
