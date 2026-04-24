export default function AnswerButtons({
  options,
  correctAnswer,
  wrongAnswers,
  questionResolved,
  onAnswer,
}) {
  return (
    <div className="answers-grid">
      {options.map((option) => {
        const isWrong = wrongAnswers.includes(option);
        const isCorrect = option === correctAnswer;
        const className = [
          'answer-button',
          isWrong ? 'wrong' : '',
          questionResolved && isCorrect ? 'correct' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={option}
            type="button"
            className={className}
            disabled={questionResolved || isWrong}
            onClick={() => onAnswer(option)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
