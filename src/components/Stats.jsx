import { formatMs, getMedianTime, isProgressMastered } from '../utils';

const SORTERS = {
  numbers: (left, right) => left.a - right.a || left.b - right.b,
  time: (left, right) => {
    const leftMedian = getMedianTime(left) ?? -1;
    const rightMedian = getMedianTime(right) ?? -1;
    return rightMedian - leftMedian || left.a - right.a || left.b - right.b;
  },
  mistakes: (left, right) =>
    right.mistakes - left.mistakes || left.a - right.a || left.b - right.b,
};

export default function Stats({
  rows,
  filterTable,
  maxFactor,
  progressMasteredCount,
  progressPercent,
  sortBy,
  totalExamples,
  onFilterChange,
  onSortChange,
}) {
  const filteredRows =
    filterTable === 'all'
      ? rows
      : rows.filter((row) => row.a === Number(filterTable) || row.b === Number(filterTable));

  const sortedRows = [...filteredRows].sort(SORTERS[sortBy]);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Statistiky</h2>
          <p>Prohlédni si rychlost, posledních 5 časů a počet chyb u každého příkladu.</p>
        </div>
        <div className="pill">
          Zvládnuto: {progressMasteredCount} / {totalExamples} ({progressPercent}%)
        </div>
      </div>

      <div className="stats-controls">
        <label>
          Filtr
          <select value={filterTable} onChange={(event) => onFilterChange(event.target.value)}>
            <option value="all">Všechny příklady</option>
            {Array.from({ length: maxFactor }, (_, index) => index + 1).map((table) => (
              <option key={table} value={table}>
                Obsahuje {table}
              </option>
            ))}
          </select>
        </label>

        <label>
          Řazení
          <select value={sortBy} onChange={(event) => onSortChange(event.target.value)}>
            <option value="numbers">Podle čísel</option>
            <option value="time">Podle mediánu času</option>
            <option value="mistakes">Podle chyb</option>
          </select>
        </label>
      </div>

      <div className="stats-table-wrap">
        <table className="stats-table">
          <thead>
            <tr>
              <th>Příklad</th>
              <th>Stav</th>
              <th>Medián času</th>
              <th>Posledních 5 časů</th>
              <th>Chyby</th>
              <th>Pokusy</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const mastered = isProgressMastered(row);

              return (
                <tr key={row.key}>
                <td>
                  {row.a} × {row.b}
                </td>
                <td>
                  <span className={`status-badge ${mastered ? 'mastered' : 'unmastered'}`}>
                    {mastered ? 'Zvládnuto' : 'Nezvládnuto'}
                  </span>
                </td>
                <td>{formatMs(getMedianTime(row))}</td>
                <td>{row.last5Times.length ? row.last5Times.map(formatMs).join(', ') : '—'}</td>
                <td>{row.mistakes}</td>
                <td>{row.totalAttempts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
