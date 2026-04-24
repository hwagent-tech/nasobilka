import { MAX_TABLE, MIN_TABLE } from '../utils';

export default function Settings({
  settings,
  availableCount,
  onToggleTable,
  onSelectAll,
  onSelectNone,
  onProgressiveChange,
  onResetProgress,
}) {
  const tables = Array.from(
    { length: MAX_TABLE - MIN_TABLE + 1 },
    (_, index) => index + MIN_TABLE,
  );

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Nastavení</h2>
          <p>Vyber násobilky k procvičování a způsob jejich postupného odemykání.</p>
        </div>
        <div className="pill">{availableCount} aktivních příkladů</div>
      </div>

      <div className="settings-actions">
        <button type="button" className="secondary-button" onClick={onSelectAll}>
          Vybrat vše
        </button>
        <button type="button" className="secondary-button" onClick={onSelectNone}>
          Vymazat výběr
        </button>
      </div>

      <div className="table-grid">
        {tables.map((table) => {
          const checked = settings.selectedTables.includes(table);

          return (
            <label key={table} className={`table-chip ${checked ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleTable(table)}
              />
              <span>{table}× násobilka</span>
            </label>
          );
        })}
      </div>

      <label className="toggle-row">
        <input
          type="checkbox"
          checked={settings.progressiveLearning}
          onChange={(event) => onProgressiveChange(event.target.checked)}
        />
        <span>
          Postupné učení
          <small>Pozdější násobilky se odemknou po zvládnutí většiny dřívějších.</small>
        </span>
      </label>

      <button type="button" className="danger-button" onClick={onResetProgress}>
        Resetovat postup
      </button>
    </section>
  );
}
