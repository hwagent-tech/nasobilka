import { useRef, useState } from 'react';
import { CAGE_CAPACITY, DECORATIONS, PARROT_SOUNDS, getParrotDefinition, getParrotSummary, todayKey } from '../parrots';

function chirp(soundId = 'budgie') {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const calls = {
    budgie: [1200, 1500, 1320], cockatiel: [880, 1174, 988], lorikeet: [720, 940, 760, 1020],
    amazon: [620, 520, 690], macaw: [330, 280, 390], bell: [1046, 1568], water: [900, 650, 1100],
  };
  (calls[soundId] ?? calls.budgie).forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * 0.09;
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.17);
  });
  window.setTimeout(() => context.close(), 700);
}

function ParrotAvatar({ color, size }) {
  return (
    <span className={`parrot-avatar ${size}`} aria-hidden="true">
      <svg viewBox="0 0 100 110">
        <path className="parrot-tail" d="M46 76 38 108 56 80 64 106 66 72Z" />
        <ellipse className="parrot-body" cx="52" cy="65" rx="29" ry="34" style={{ fill: color }} />
        <circle className="parrot-head" cx="59" cy="32" r="25" style={{ fill: color }} />
        <path className="parrot-wing left" d="M32 50Q8 60 31 82Q43 73 47 53Z" />
        <path className="parrot-wing right" d="M70 48Q93 58 70 80Q58 69 56 51Z" />
        <path className="parrot-face" d="M61 15Q82 17 77 42Q67 48 56 38Q51 25 61 15Z" />
        <circle cx="69" cy="27" r="4" fill="#15283b" />
        <circle cx="70" cy="26" r="1.3" fill="white" />
        <path className="parrot-beak" d="M78 31Q96 35 79 45Q84 38 78 31Z" />
        <path className="parrot-feet" d="M41 94v8m18-8v8M35 102h12m6 0h12" />
      </svg>
    </span>
  );
}

function SpeckledEgg({ accent, variant }) {
  const shift = variant.length % 7;
  return (
    <svg className="speckled-egg" viewBox="0 0 80 100" style={{ '--egg-accent': accent }} aria-hidden="true">
      <defs>
        <radialGradient id={`egg-shade-${variant}`} cx="35%" cy="28%" r="70%">
          <stop offset="0" stopColor="#fffdf4" />
          <stop offset=".72" stopColor="#e7e4cf" />
          <stop offset="1" stopColor="#c9c7b6" />
        </radialGradient>
      </defs>
      <path className="egg-shell" fill={`url(#egg-shade-${variant})`} d="M40 4C24 4 8 35 8 65c0 20 14 31 32 31s32-11 32-31C72 35 56 4 40 4Z" />
      <g className="egg-spots">
        <circle cx={22 + shift} cy="55" r="5" />
        <circle cx="51" cy={34 + shift} r="3.5" />
        <circle cx={45 - shift} cy="72" r="6" />
        <circle cx="30" cy={27 + shift} r="2.8" />
        <circle cx="61" cy="62" r="2.5" />
        <path d={`M16 ${67 - shift}q8-6 13 2t-8 9q-7-2-5-11Z`} />
        <path d={`M46 ${48 + shift}q7-5 12 1t-7 8q-7-1-5-9Z`} />
      </g>
      <ellipse cx="29" cy="25" rx="8" ry="13" fill="white" opacity=".42" transform="rotate(25 29 25)" />
    </svg>
  );
}

export default function ParrotCage({ state, onFeed, onRename, onToggleCage, onClaimGift, onHatch, onSelectSound, onMove }) {
  const [celebrating, setCelebrating] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [name, setName] = useState('');
  const [section, setSection] = useState('cage');
  const [showGift, setShowGift] = useState(false);
  const [hatching, setHatching] = useState(null);
  const [activeDecoration, setActiveDecoration] = useState(null);
  const holdTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const drag = useRef(null);
  const [moving, setMoving] = useState(null);
  const summary = getParrotSummary(state);

  function position(id) {
    const point = moving?.id === id ? moving : state.positions?.[id];
    return point ? { left: `${point.x}%`, top: `${point.y}%`, right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' } : {};
  }

  function moveHandlers(id, parrot) {
    return {
      'data-moving': moving?.id === id ? 'true' : undefined,
      onPointerDown(event) {
        if (!event.isPrimary || event.button !== 0) return;
        const item = event.currentTarget.getBoundingClientRect();
        const area = event.currentTarget.closest('.parrot-habitat').getBoundingClientRect();
        drag.current = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, centerX: item.left + item.width / 2, centerY: item.top + item.height / 2, width: item.width, height: item.height, area, moved: false };
        longPressTriggered.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
        if (parrot) startHold(parrot);
      },
      onPointerMove(event) {
        const current = drag.current;
        if (!current || current.id !== id || current.pointerId !== event.pointerId) return;
        const dx = event.clientX - current.startX;
        const dy = event.clientY - current.startY;
        if (!current.moved && Math.hypot(dx, dy) < 8) return;
        if (longPressTriggered.current && !current.moved) return;
        current.moved = true;
        endHold();
        const { area } = current;
        const halfWidth = Math.min(current.width / 2, area.width / 2);
        const halfHeight = Math.min(current.height / 2, area.height / 2);
        current.position = {
          x: Math.max(halfWidth, Math.min(area.width - halfWidth, current.centerX + dx - area.left)) / area.width * 100,
          y: Math.max(halfHeight, Math.min(area.height - halfHeight, current.centerY + dy - area.top)) / area.height * 100,
        };
        setMoving({ id, ...current.position });
      },
      onPointerUp(event) {
        endHold();
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        if (current.moved) {
          longPressTriggered.current = true;
          onMove(id, current.position);
        }
        drag.current = null;
        setMoving(null);
      },
      onPointerCancel() {
        endHold();
        drag.current = null;
        setMoving(null);
        longPressTriggered.current = true;
      },
      onKeyDown() { longPressTriggered.current = false; },
    };
  }

  function feed(parrot) {
    if (!parrot.fedToday && state.grain < parrot.feedCost) return;
    if (!parrot.fedToday) onFeed(parrot.id);
    setCelebrating(parrot.id);
    chirp(state.selectedSound);
    window.setTimeout(() => setCelebrating(null), 1200);
  }

  function startHold(parrot) {
    longPressTriggered.current = false;
    holdTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      setRenaming(parrot);
      setName(parrot.nickname || parrot.name);
    }, 2000);
  }

  function endHold() {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
  }

  return (
    <main className="cage-screen">
      <section className="cage-header">
        <div><span>🌾</span><strong>{state.grain}</strong><small>zrní</small></div>
        <div><span>🦜</span><strong>{summary.hungryCount}</strong><small>hladoví</small></div>
        <div><span>🥣</span><strong>{summary.grainNeeded}</strong><small>potřeba</small></div>
      </section>

      <div className="cage-intro">
        <h2>Moje papouščí klec</h2>
        <p>Klepnutím nakrmíš papouška nebo rozezníš dárek. Papoušky i dárky můžeš přesouvat prstem.</p>
        <small>Podržením papouška ho přejmenuješ. Po každých 4 správných odpovědích dostane jeden papoušek hlad.</small>
        <small>{summary.hungryCount ? `Dnešní cíl: nakrmit ještě ${summary.hungryCount}` : 'Dnešní péče je hotová!'}</small>
      </div>

      <div className="cage-tabs">
        <button type="button" className={section === 'cage' ? 'active' : ''} onClick={() => setSection('cage')}>Voliéra {summary.activeCount}/{CAGE_CAPACITY}</button>
        <button type="button" className={section === 'collection' ? 'active' : ''} onClick={() => setSection('collection')}>Sbírka {state.parrots.length}</button>
      </div>

      {section === 'cage' && state.parrots.length ? (
        <section className="parrot-habitat" aria-label="Papouščí voliéra">
          <div className="habitat-sun" aria-hidden="true">☀</div>
          <div className="habitat-branch branch-one" aria-hidden="true" />
          <div className="habitat-branch branch-two" aria-hidden="true" />
          {state.decorations.map((decorationId, index) => {
            const decoration = DECORATIONS.find((item) => item.id === decorationId);
            return decoration ? <button type="button" aria-label={decoration.name} key={decoration.id} {...moveHandlers(`gift-${decoration.id}`)} style={position(`gift-${decoration.id}`)} className={`habitat-decoration decoration-${index} gift-${decoration.id} ${activeDecoration === decoration.id ? 'active' : ''}`} onClick={() => { if (longPressTriggered.current) return; setActiveDecoration(decoration.id); chirp(decoration.id === 'bell' ? 'bell' : decoration.id === 'bath' ? 'water' : state.selectedSound); window.setTimeout(() => setActiveDecoration(null), 900); }}>{decoration.icon}</button> : null;
          })}
          {state.parrots.filter((item) => item.active).map((owned, index) => {
            const parrot = getParrotDefinition(owned);
            if (!parrot) return null;
            const canFeed = !owned.fedToday && state.grain >= parrot.feedCost;
            const positionStyle = {
              '--parrot-color': parrot.color,
              '--parrot-left': `${8 + ((index * 29) % 76)}%`,
              '--parrot-top': `${18 + ((index * 37) % 58)}%`,
              '--hop-delay': `${(index % 5) * -0.7}s`,
              ...position(`parrot-${parrot.id}`),
            };

            if (!owned.hatched) {
              return (
                <button
                  key={parrot.id}
                  type="button"
                  className={`parrot-egg ${hatching === parrot.id ? 'hatching' : ''}`}
                  style={positionStyle}
                  {...moveHandlers(`parrot-${parrot.id}`)}
                  onClick={() => {
                    if (longPressTriggered.current) return;
                    if (hatching) return;
                    setHatching(parrot.id);
                    window.setTimeout(() => {
                      onHatch(parrot.id);
                      setHatching(null);
                    }, 1100);
                  }}
                  aria-label={`Vylíhnout nového papouška: ${parrot.name}`}
                >
                  <SpeckledEgg accent={parrot.color} variant={parrot.id} />
                  <small>{hatching === parrot.id ? 'Praská…' : 'Klepni na vajíčko'}</small>
                </button>
              );
            }
            return (
              <button
                key={parrot.id}
                type="button"
                className={`free-parrot ${owned.fedToday ? 'fed' : 'hungry'} ${celebrating === parrot.id ? 'celebrating' : ''}`}
                style={positionStyle}
                {...moveHandlers(`parrot-${parrot.id}`, { ...parrot, ...owned })}
                onClick={() => {
                  if (longPressTriggered.current) return;
                  feed({ ...parrot, ...owned });
                }}
                aria-label={`${parrot.name}. ${owned.fedToday ? 'Nakrmený' : canFeed ? `Nasypat ${parrot.feedCost} zrní` : 'Hladový, chybí zrní'}`}
              >
                <span className="grain-pour" aria-hidden="true">•••</span>
                <ParrotAvatar color={parrot.color} size={parrot.size} />
                <span className="parrot-name">{owned.nickname || parrot.name}</span>
                {!owned.fedToday && <span className="feed-price">🌾 {parrot.feedCost}</span>}
              </button>
            );
          })}
        </section>
      ) : section === 'cage' ? (
        <section className="empty-cage"><span>🥚</span><h3>První papoušek už čeká</h3><p>Odpověz správně na 5 příkladů.</p></section>
      ) : (
        <section className="parrot-collection">
          {state.parrots.map((owned) => {
            const parrot = getParrotDefinition(owned);
            if (!parrot) return null;
            return (
              <article key={owned.id}>
                <ParrotAvatar color={parrot.color} size={parrot.size} />
                <div><strong>{owned.nickname || parrot.name}</strong><small>{parrot.rarity || 'běžný'} · {parrot.size === 'large' ? 'velký' : parrot.size === 'small' ? 'malý' : 'střední'}</small></div>
                <button type="button" onClick={() => onToggleCage(owned.id)} disabled={!owned.active && summary.activeCount >= CAGE_CAPACITY}>{owned.active ? 'Do sbírky' : 'Do voliéry'}</button>
              </article>
            );
          })}
        </section>
      )}

      {section === 'collection' && (
        <section className="sound-collection">
          <h3>Hlasy papoušků</h3>
          <p>Vyber zvuk, kterým budou papoušci odpovídat.</p>
          <div>{PARROT_SOUNDS.map((sound) => {
            const unlocked = state.sounds.includes(sound.id);
            return <button key={sound.id} type="button" disabled={!unlocked} className={state.selectedSound === sound.id ? 'active' : ''} onClick={() => { onSelectSound(sound.id); chirp(sound.id); }}><span>{unlocked ? '🔊' : '🔒'}</span>{sound.name}</button>;
          })}</div>
        </section>
      )}

      {summary.activeCount > 0 && summary.hungryCount === 0 && state.giftClaimedOn !== todayKey() && (
        <button type="button" className="daily-gift-button" onClick={() => { onClaimGift(); setShowGift(true); }}><span>🎁</span><strong>Všichni jsou nakrmení!</strong><small>Otevřít dnešní dárek</small></button>
      )}

      {showGift && state.giftClaimedOn === todayKey() && state.lastGift && (
        <div className="gift-reveal"><span>{state.lastGift.icon}</span><strong>{state.lastGift.label}</strong><small>Denní péče splněna · den {state.careDays}</small><button type="button" onClick={() => setShowGift(false)}>Paráda!</button></div>
      )}

      {summary.nextParrot && (
        <div className="next-parrot">Další papoušek za <strong>{summary.nextParrot.unlockAt - state.totalCorrect}</strong> správných odpovědí.</div>
      )}

      {renaming && (
        <div className="rename-backdrop" role="presentation" onClick={() => setRenaming(null)}>
          <form
            className="rename-dialog"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              onRename(renaming.id, name);
              setRenaming(null);
            }}
          >
            <div className="rename-bird"><ParrotAvatar color={renaming.color} size={renaming.size} /></div>
            <h3>Přejmenuj papouška</h3>
            <input value={name} maxLength="18" autoFocus onChange={(event) => setName(event.target.value)} aria-label="Jméno papouška" />
            <div><button type="button" onClick={() => setRenaming(null)}>Zrušit</button><button type="submit">Uložit</button></div>
          </form>
        </div>
      )}
    </main>
  );
}
