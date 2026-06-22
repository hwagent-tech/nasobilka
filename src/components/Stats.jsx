import { formatMs, getStatsTimeMetric, isProgressMastered } from '../utils';

const SORTERS = {
  numbers: (left, right) => left.a - right.a || left.b - right.b,
  time: (left, right) => {
    const leftTime = getStatsTimeMetric(left).value ?? -1;
    const rightTime = getStatsTimeMetric(right).value ?? -1;
    return rightTime - leftTime || left.a - right.a || left.b - right.b;
  },
  mistakes: (left, right) =>
    right.mistakes - left.mistakes || left.a - right.a || left.b - right.b,
};

export default function Stats({
  masteryTimeLimitSeconds,
  rows,
  filterTable,
  filterMastery,
  maxFactor,
  progressMasteredCount,
  progressPercent,
  sortBy,
  totalExamples,
  onFilterChange,
  onMasteryFilterChange,
  onSortChange,
}) {
  const filteredRows = rows.filter((row) => {
    const mastered = isProgressMastered(row, masteryTimeLimitSeconds);
    const matchesTable =
      filterTable === 'all' ||
      row.a === Number(filterTable) ||
      row.b === Number(filterTable);
    const matchesMastery =
      filterMastery === 'all' ||
      (filterMastery === 'mastered' && mastered) ||
      (filterMastery === 'unmastered' && !mastered);

    return matchesTable && matchesMastery;
  });

  const sortedRows = [...filteredRows].sort(SORTERS[sortBy]);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Statistiky</h2>
          <p>Prohlédni si průměr z posledních 3 správných odpovědí v řadě a počet chyb.</p>
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
          Stav
          <select
            value={filterMastery}
            onChange={(event) => onMasteryFilterChange(event.target.value)}
          >
            <option value="all">Vše</option>
            <option value="mastered">Zvládnuto</option>
            <option value="unmastered">Nezvládnuto</option>
          </select>
        </label>

        <label>
          Řazení
          <select value={sortBy} onChange={(event) => onSortChange(event.target.value)}>
            <option value="numbers">Podle čísel</option>
            <option value="time">Podle času</option>
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
              <th>Průměr času</th>
              <th>Chyby</th>
              <th>Pokusy</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const mastered = isProgressMastered(row, masteryTimeLimitSeconds);
              const statsTime = getStatsTimeMetric(row);

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
                  <td>
                    {formatMs(statsTime.value)}
                  </td>
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
