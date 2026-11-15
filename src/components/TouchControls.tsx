import { useEffect, useState, type PointerEvent } from 'react';
import { press, release, type Btn } from '../system/input';

function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function Pad({ btn, className, children }: { btn: Btn; className: string; children: React.ReactNode }) {
  const down = (e: PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    press(btn);
  };
  const up = (e: PointerEvent) => {
    e.preventDefault();
    release(btn);
  };
  return (
    <button className={'tpad ' + className} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} onContextMenu={(e) => e.preventDefault()}>
      {children}
    </button>
  );
}

/** On-screen D-pad and A/B buttons for tablets and phones. */
export function TouchControls() {
  const [show, setShow] = useState(isTouchDevice);
  useEffect(() => {
    const on = () => setShow(true);
    window.addEventListener('touchstart', on, { once: true });
    return () => window.removeEventListener('touchstart', on);
  }, []);
  if (!show) return null;
  return (
    <div className="touch-controls">
      <div className="dpad">
        <Pad btn="up" className="up">
          ▲
        </Pad>
        <Pad btn="left" className="left">
          ◀
        </Pad>
        <Pad btn="right" className="right">
          ▶
        </Pad>
        <Pad btn="down" className="down">
          ▼
        </Pad>
      </div>
      <div className="ab">
        <Pad btn="b" className="b">
          B
        </Pad>
        <Pad btn="a" className="a">
          A
        </Pad>
      </div>
    </div>
  );
}
