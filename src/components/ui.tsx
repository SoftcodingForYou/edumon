// Shared UI pieces: option lists, text boxes, badges and icons.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useBindings, useInput, useInputSource, type Btn, type InputEvt } from '../system/input';
import { keyLabel } from '../system/keys';
import { sfx } from '../system/audio';
import { ELEMS, type Elem } from '../game/elements';
import { ballURL } from '../art/assets';

export const LAYER = {
  world: 0,
  screen: 10,
  overlay: 20,
  dex: 30,
  battle: 40,
  picker: 50,
  dialog: 60,
} as const;

export interface Opt {
  label: string;
  icon?: ReactNode;
  sub?: string;
  disabled?: boolean;
  className?: string;
}

interface MenuProps {
  options: Opt[];
  onSelect: (i: number) => void;
  onBack?: () => void;
  layer: number;
  active?: boolean;
  initial?: number;
  columns?: number;
  className?: string;
  onFocus?: (i: number) => void;
  render?: (o: Opt, i: number, selected: boolean) => ReactNode;
}

/** A list (or grid) of options driven by arrows + A/B, mouse and touch. */
export function Menu({ options, onSelect, onBack, layer, active = true, initial = 0, columns = 1, className, onFocus, render }: MenuProps) {
  const [idx, setIdx] = useState(Math.min(initial, options.length - 1));
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (idx >= options.length) setIdx(Math.max(0, options.length - 1));
  }, [options.length, idx]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
    onFocus?.(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const move = (d: number) => {
    const n = options.length;
    if (!n) return;
    let ni = idx + d;
    if (columns > 1 && Math.abs(d) === columns) {
      if (ni < 0 || ni >= n) return;
    } else {
      ni = (ni + n) % n;
    }
    if (ni !== idx) {
      sfx('move');
      setIdx(ni);
    }
  };

  const choose = (i: number) => {
    const o = options[i];
    if (!o) return;
    if (o.disabled) {
      sfx('error');
      return;
    }
    sfx('ok');
    onSelect(i);
  };

  useInput(
    (e: InputEvt) => {
      if (e.btn === 'up') move(-columns);
      else if (e.btn === 'down') move(columns);
      else if (e.btn === 'left') move(columns > 1 ? -1 : 0);
      else if (e.btn === 'right') move(columns > 1 ? 1 : 0);
      else if (e.btn === 'a') choose(idx);
      else if (e.btn === 'b' && onBack) {
        sfx('back');
        onBack();
      }
    },
    layer,
    active,
  );

  return (
    <div ref={listRef} className={'menu ' + (className ?? '')} style={columns > 1 ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>
      {options.map((o, i) => (
        <div
          key={i}
          data-idx={i}
          className={'opt' + (i === idx ? ' sel' : '') + (o.disabled ? ' disabled' : '') + (o.className ? ' ' + o.className : '')}
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse' && i !== idx) setIdx(i);
          }}
          onClick={() => {
            setIdx(i);
            choose(i);
          }}
        >
          {render ? (
            render(o, i, i === idx)
          ) : (
            <>
              <span className="cursor">{i === idx ? '▶' : ''}</span>
              {o.icon && <span className="opt-icon">{o.icon}</span>}
              <span className="opt-label">
                {o.label}
                {o.sub && <small>{o.sub}</small>}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

interface TextBoxProps {
  text: string;
  onDone: () => void;
  layer: number;
  auto?: number; // ms to wait after typing before continuing by itself
  className?: string;
  children?: ReactNode;
}

/** Text that appears letter by letter; A (or a tap) continues. */
export function TextBox({ text, onDone, layer, auto, className, children }: TextBoxProps) {
  const [shown, setShown] = useState(0);
  const doneRef = useRef(false);
  const full = shown >= text.length;

  useEffect(() => {
    setShown(0);
    doneRef.current = false;
  }, [text]);

  useEffect(() => {
    if (full) return;
    const t = setTimeout(() => setShown((s) => Math.min(text.length, s + 2)), 28);
    return () => clearTimeout(t);
  }, [shown, full, text]);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  // Auto-continue a moment after the whole text is shown.
  useEffect(() => {
    if (!full || auto === undefined) return;
    const t = setTimeout(finish, auto);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, auto, text]);

  const advance = () => {
    if (!full) setShown(text.length);
    else {
      sfx('move');
      finish();
    }
  };

  useInput(
    (e) => {
      if (e.btn === 'a' || e.btn === 'b') advance();
    },
    layer,
  );

  return (
    <div className={'textbox ' + (className ?? '')} onClick={advance}>
      <p>{text.slice(0, shown)}</p>
      {children}
      {full && auto === undefined && <span className="next">▼</span>}
    </div>
  );
}

/**
 * One line that shrinks (never cuts) to fit its box: creature names are reading practice,
 * so they must always be shown whole, whatever letter style or capitals the player chose.
 */
export function FitText({ children, className }: { children: ReactNode; className?: string }) {
  const outer = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const fit = () => {
      const k = Math.min(1, o.clientWidth / Math.max(1, i.offsetWidth));
      i.style.transform = k < 0.995 ? `scale(${k})` : '';
    };
    fit();
    // Fires again when the font finishes loading or the letter style changes.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(i);
    ro?.observe(o);
    return () => ro?.disconnect();
  }, [children]);
  return (
    <span ref={outer} className={'fit ' + (className ?? '')}>
      <span ref={inner} className="fit-in">
        {children}
      </span>
    </span>
  );
}

// Little pictures for the types (fire, drop, leaf...) for children who can't read yet.
const TYPE_ICONS: Record<Elem, ReactNode> = {
  normal: <circle cx="8" cy="8" r="4.8" fill="currentColor" />,
  fuego: (
    <path
      fill="currentColor"
      d="M8 1 C9.5 4 13 6 12.5 10 C12 13.5 9.8 15 8 15 C5.6 15 3.5 13.2 3.5 10.5 C3.5 8 5.5 6.8 6 4.5 C7 6 7.5 7 7.2 8.6 C8.8 7 9 4 8 1 Z"
    />
  ),
  agua: <path fill="currentColor" d="M8 1.5 C10 5 13 7.8 13 10.8 C13 13.3 10.8 15 8 15 C5.2 15 3 13.3 3 10.8 C3 7.8 6 5 8 1.5 Z" />,
  planta: (
    <>
      <path fill="currentColor" d="M2.5 13.5 C2.5 6.5 7 2.5 13.8 2.2 C14 9 9.5 13.5 2.5 13.5 Z" />
      <path fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="1.2" d="M3.5 12.5 L10.5 5.5" />
    </>
  ),
  electrico: <path fill="currentColor" d="M9.5 1 L3.5 9 H7.5 L6 15 L12.5 6.5 H8.5 L10.5 1 Z" />,
  hielo: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      d="M8 1.5 V14.5 M2.4 4.75 L13.6 11.25 M2.4 11.25 L13.6 4.75 M6 2.5 L8 4.3 L10 2.5 M6 13.5 L8 11.7 L10 13.5"
    />
  ),
  roca: <path fill="currentColor" d="M2 12.5 L3.5 6.5 L7.5 3 L12.5 4.5 L14.5 10.5 L11 14 L5 14 Z" />,
  aire: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      d="M1.8 6 H10 A2.3 2.3 0 1 0 7.9 3.3 M1.8 10 H12.4 A2.1 2.1 0 1 1 10.6 12.8"
    />
  ),
  bicho: (
    <>
      <ellipse cx="8" cy="9.6" rx="4.3" ry="5" fill="currentColor" />
      <path fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" d="M6.3 4.8 L4.2 1.6 M9.7 4.8 L11.8 1.6" />
    </>
  ),
  fantasma: (
    <path fill="currentColor" d="M3 15 V7.5 C3 4.2 5.2 2 8 2 C10.8 2 13 4.2 13 7.5 V15 L11.3 13.3 L9.6 15 L8 13.3 L6.4 15 L4.7 13.3 Z" />
  ),
  lucha: (
    <>
      <path fill="currentColor" d="M2.8 7.2 C2.8 5.6 3.9 5 5 5 H11.4 C12.8 5 13.6 6 13.6 7.3 V11 C13.6 13.1 12 14.6 9.9 14.6 H6 C4.1 14.6 2.8 13.2 2.8 11.4 Z" />
      <path fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="1" d="M6.2 5 V8.4 M9 5 V8.4 M11.6 5.2 V8.4" />
    </>
  ),
  dragon: (
    <path fill="currentColor" d="M2 13.5 C3.5 8 7.5 3.2 14 2 C12.5 4.8 13.2 6.6 11.4 8.4 C12.6 9.6 11.6 11.6 9.6 11.6 C9.6 13 7.2 14.2 2 13.5 Z" />
  ),
  magia: <path fill="currentColor" d="M8 1.2 L9.9 5.6 L14.6 6 L11 9.1 L12.1 13.8 L8 11.3 L3.9 13.8 L5 9.1 L1.4 6 L6.1 5.6 Z" />,
};

export function TypeIcon({ type, size = 16 }: { type: Elem; size?: number }) {
  return (
    <svg className="type-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      {TYPE_ICONS[type]}
    </svg>
  );
}

export function TypeBadge({ type, small }: { type: Elem; small?: boolean }) {
  const t = ELEMS[type];
  return (
    <span className={'type-badge' + (small ? ' small' : '')} style={{ background: t.color, color: t.text }}>
      <TypeIcon type={type} size={small ? 13 : 17} />
      {t.name}
    </span>
  );
}

export function BallIcon({ size = 24, grey = false }: { size?: number; grey?: boolean }) {
  return <img className="pix" src={ballURL(grey)} width={size} height={size} alt={grey ? 'no atrapado' : 'atrapado'} draggable={false} />;
}

export function EyeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className="pix" aria-label="visto">
      <path d="M1 8 C4 3 12 3 15 8 C12 13 4 13 1 8 Z" fill="#ffffff" stroke="#2a2238" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="3" fill="#3a72e0" stroke="#2a2238" strokeWidth="1" />
      <circle cx="8" cy="8" r="1.3" fill="#1c1424" />
      <rect x="6.5" y="6" width="1.2" height="1.2" fill="#ffffff" />
    </svg>
  );
}

export function KeyHint({ children }: { children: ReactNode }) {
  return <div className="keyhint">{children}</div>;
}

/**
 * The key to press, as the player chose it ("Z", "Espacio"...). With a touch
 * screen or gamepad the round A / B / T buttons are shown instead.
 * `typing`: on the name screen letter keys write letters, so Intro / Retroceso act as A / B.
 */
export function KeyCap({ btn, typing = false }: { btn: Btn; typing?: boolean }) {
  const keys = useBindings();
  const source = useInputSource();
  if (source !== 'keyboard') {
    if (btn === 'a') return <span className="btn-a">A</span>;
    if (btn === 'b') return <span className="btn-b">B</span>;
    if (btn === 'types') return <span className="btn-t">T</span>;
    if (btn === 'map') return <span className="btn-t">M</span>;
    return <span className="keycap">{{ up: '▲', down: '▼', left: '◀', right: '▶' }[btn]}</span>;
  }
  let key = keys[btn];
  if (typing && key.length === 1) key = btn === 'a' ? 'Enter' : btn === 'b' ? 'Backspace' : key;
  return <span className="keycap">{keyLabel(key)}</span>;
}

export const A = () => <KeyCap btn="a" />;
export const Bb = () => <KeyCap btn="b" />;
export const Tt = () => <KeyCap btn="types" />;
export const Mm = () => <KeyCap btn="map" />;

/** The two keys of an axis, e.g. "← →" or "↑ ↓". */
export function DirKeys({ pair }: { pair: 'lr' | 'ud' }) {
  return pair === 'lr' ? (
    <>
      <KeyCap btn="left" />
      <KeyCap btn="right" />
    </>
  ) : (
    <>
      <KeyCap btn="up" />
      <KeyCap btn="down" />
    </>
  );
}

export function HpBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const color = pct > 0.5 ? 'hp-high' : pct > 0.2 ? 'hp-mid' : 'hp-low';
  return (
    <div className="hpbar">
      <span className="hp-label">PS</span>
      <div className="hp-track">
        <div className={'hp-fill ' + color} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
