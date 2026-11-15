import { useEffect, useRef } from 'react';
import { clearTaps, frameDir, isHeld, useInput } from '../system/input';
import { sfx } from '../system/audio';
import { updateWorld, type Encounter, type WorldState } from '../world/world';
import { renderWorld, VIEW_H, VIEW_W } from '../world/renderer';
import { LAYER } from './ui';

interface Props {
  world: WorldState;
  avatar: number;
  paused: boolean;
  onEncounter: (e: Encounter) => void;
  onMenu: () => void;
  onDex: () => void;
  onTypes: () => void;
  onMap: () => void;
  onAutosave: () => void;
}

/** The overworld canvas with its game loop. */
export function WorldView({ world, avatar, paused, onEncounter, onMenu, onDex, onTypes, onMap, onAutosave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const cb = useRef({ onEncounter, onMenu, onDex, onTypes, onMap, onAutosave });
  cb.current = { onEncounter, onMenu, onDex, onTypes, onMap, onAutosave };
  pausedRef.current = paused;

  useInput(
    (e) => {
      if (e.btn === 'menu') {
        sfx('ok');
        cb.current.onMenu();
      } else if (e.btn === 'dex') {
        sfx('ok');
        cb.current.onDex();
      } else if (e.btn === 'types') {
        sfx('ok');
        cb.current.onTypes();
      } else if (e.btn === 'map') {
        sfx('ok');
        cb.current.onMap();
      }
    },
    LAYER.world,
    !paused,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (pausedRef.current) {
        clearTaps();
      } else {
        const ev = updateWorld(world, dt, { dir: frameDir(), run: isHeld('b') });
        if (ev.bump) sfx('bump');
        if (ev.rustle) sfx('rustle');
        if (ev.autosave) cb.current.onAutosave(); // every 5th step
        if (ev.encounter) {
          pausedRef.current = true; // stop right away, before React re-renders
          cb.current.onEncounter(ev.encounter);
        }
      }
      renderWorld(ctx, world, avatar);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [world, avatar]);

  return <canvas ref={canvasRef} width={VIEW_W} height={VIEW_H} className="world-canvas" />;
}
