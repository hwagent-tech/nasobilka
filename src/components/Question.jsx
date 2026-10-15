export default function Question({ a, b, feedback }) {
  return (
    <section className="question-card">
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
