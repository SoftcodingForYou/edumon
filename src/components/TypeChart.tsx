import { useEffect, useRef, useState } from 'react';
import { TYPE_ORDER, strongAgainst, weakAgainst } from '../game/elements';
import { useInput } from '../system/input';
import { sfx } from '../system/audio';
import { LAYER, KeyHint, Bb, DirKeys, TypeBadge } from './ui';

/** "¿Quién gana a quién?": which attack type is very effective against which. */
export function TypeChart({ onClose }: { onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${idx}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [idx]);

  const select = (i: number) => {
    if (i < 0 || i >= TYPE_ORDER.length || i === idx) return;
    sfx('move');
    setIdx(i);
  };

  useInput((e) => {
    if (e.btn === 'up') select(idx - 1);
    else if (e.btn === 'down') select(idx + 1);
    else if (e.btn === 'b' || e.btn === 'a' || e.btn === 'types') {
      sfx('back');
      onClose();
    }
  }, LAYER.dex);

  const sel = TYPE_ORDER[idx];
  return (
    <div className="typechart">
      <div className="dex-header">
        <h2>TIPOS</h2>
        <span className="tc-sub">¿Quién gana a quién?</span>
      </div>
      <div className="tc-legend">
        <span>Un ataque de tipo…</span>
        <span>…es muy eficaz contra:</span>
      </div>
      <div className="tc-list" ref={listRef}>
        {TYPE_ORDER.map((t, i) => {
          const strong = strongAgainst(t);
          return (
            <div key={t} data-i={i} className={'tc-row' + (i === idx ? ' sel' : '')} onClick={() => select(i)}>
              <span className="tc-att">
                <TypeBadge type={t} />
              </span>
              <span className="tc-arrow">▶</span>
              <span className="tc-good">
                {strong.length ? strong.map((d) => <TypeBadge key={d} type={d} />) : <em>nada especial</em>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="tc-weak">
        <TypeBadge type={sel} small /> <span>no es muy eficaz contra:</span>
        {weakAgainst(sel).map((d) => (
          <TypeBadge key={d} type={d} small />
        ))}
      </div>
      <KeyHint>
        <DirKeys pair="ud" /> Elegir &nbsp; <Bb /> Volver
      </KeyHint>
    </div>
  );
}
