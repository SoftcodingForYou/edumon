import { useEffect, useRef, useState } from 'react';
import {
  createSlot,
  deleteSlot,
  loadSettings,
  loadSlots,
  saveSettings,
  saveSlot,
  storageIsPersistent,
  type SaveSlot,
  type Settings,
} from './game/save';
import { SPECIES, STARTERS } from './game/creatures';
import type { Encounter } from './world/world';
import { playMusic, setMusicEnabled, setSoundEnabled } from './system/audio';
import { setVoiceEnabled } from './system/speech';
import { setBindings } from './system/input';
import { TitleScreen } from './components/TitleScreen';
import { SlotMenu } from './components/SlotMenu';
import { NewGame, type NewGameResult } from './components/NewGame';
import { Play } from './components/Play';
import { SettingsPanel } from './components/SettingsPanel';
import { TouchControls } from './components/TouchControls';

type Screen = { k: 'title' } | { k: 'slots' } | { k: 'new' } | { k: 'play'; slotId: string };

interface Demo {
  slot: SaveSlot;
  screen: string;
  enc: Encounter | null;
}

/** Test/preview hook, e.g. ?demo=battle&sp=25&mode=easy&team=1,4,7 (never saved). */
function parseDemo(): Demo | null {
  if (typeof location === 'undefined') return null;
  const q = new URLSearchParams(location.search);
  const screen = q.get('demo');
  if (!screen) return null;
  const n = Math.max(1, Math.min(150, Number(q.get('caught') ?? 12)));
  const pool = SPECIES.filter((s) => !s.legendary && !s.mythical);
  const team = (q.get('team') ?? '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id >= 1 && id <= 151);
  const caught = team.length ? team : Array.from({ length: n }, (_, i) => pool[Math.floor((i * pool.length) / n)].id);
  const seen = [...new Set([...caught, ...pool.filter((_, i) => i % 3 === 0).map((s) => s.id)])].sort((a, b) => a - b);
  const slot: SaveSlot = {
    id: 'demo',
    name: 'DEMO',
    mode: q.get('mode') === 'easy' ? 'easy' : 'normal',
    avatar: Number(q.get('avatar') ?? 0),
    seen,
    caught,
    created: 0,
    updated: 0,
  };
  const sp = Number(q.get('sp') ?? 0);
  const enc = sp ? { sp, uid: null, spot: -1, biome: Number(q.get('biome') ?? 0) } : null;
  return { slot, screen, enc };
}

/** Fit the 768x576 stage into the window (leaving room for touch buttons in portrait). */
function useStageLayout() {
  const [layout, setLayout] = useState({ scale: 1, top: '50%' });
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const touch = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
      const reserve = touch && h > w * 1.2 ? 230 : 0;
      const scale = Math.min(w / 768, (h - reserve) / 576);
      setLayout({ scale, top: reserve ? `${(h - reserve) / 2}px` : '50%' });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return layout;
}

export function App() {
  const [demo] = useState(parseDemo);
  const [slots, setSlots] = useState<SaveSlot[]>(() => (demo ? [demo.slot] : loadSlots()));
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [screen, setScreen] = useState<Screen>(() => {
    if (!demo) return { k: 'title' };
    if (demo.screen === 'slots') return { k: 'slots' };
    if (demo.screen === 'new') return { k: 'new' };
    return { k: 'play', slotId: 'demo' };
  });
  const [showSettings, setShowSettings] = useState(false);
  const layout = useStageLayout();

  useEffect(() => {
    setSoundEnabled(settings.sound);
    setMusicEnabled(settings.music);
    setVoiceEnabled(settings.voice);
  }, [settings]);

  useEffect(() => {
    setBindings(settings.keys);
  }, [settings.keys]);

  useEffect(() => {
    if (screen.k === 'slots' || screen.k === 'new') playMusic('title');
  }, [screen.k]);

  const changeSettings = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
  };

  /** Every change of the Edudex is written to storage right away. */
  const updateSlot = (id: string, fn: (s: SaveSlot) => SaveSlot) => {
    const cur = slotsRef.current.find((s) => s.id === id);
    if (!cur) return;
    const next = fn(cur);
    if (next === cur) return;
    const stored = demo ? next : saveSlot(next);
    const list = [stored, ...slotsRef.current.filter((s) => s.id !== id)];
    slotsRef.current = list;
    setSlots(list);
  };

  const create = (r: NewGameResult) => {
    try {
      const slot = createSlot(r.name, r.mode, r.avatar, r.starter ? { caught: [r.starter], seen: STARTERS } : {});
      const list = loadSlots();
      slotsRef.current = list;
      setSlots(list);
      setScreen({ k: 'play', slotId: slot.id });
    } catch (err) {
      // e.g. the same name was created meanwhile in another tab
      console.error(err);
      setSlots(loadSlots());
      setScreen({ k: 'slots' });
    }
  };

  const playing = screen.k === 'play' ? slots.find((s) => s.id === screen.slotId) : undefined;

  return (
    <div className="viewport">
      <div className="stage" style={{ top: layout.top, transform: `translate(-50%, -50%) scale(${layout.scale})` }}>
        {screen.k === 'title' && <TitleScreen onStart={() => setScreen({ k: 'slots' })} />}
        {screen.k === 'slots' && (
          <>
            <SlotMenu
              slots={slots}
              active={!showSettings}
              onBack={() => setScreen({ k: 'title' })}
              onNew={() => setScreen({ k: 'new' })}
              onPlay={(id) => setScreen({ k: 'play', slotId: id })}
              onDelete={(id) => {
                deleteSlot(id);
                const list = loadSlots();
                slotsRef.current = list;
                setSlots(list);
              }}
              onSettings={() => setShowSettings(true)}
            />
            {!storageIsPersistent() && <p className="storage-warning">Este navegador no deja guardar partidas (¿modo privado?).</p>}
            {showSettings && <SettingsPanel settings={settings} onChange={changeSettings} onClose={() => setShowSettings(false)} />}
          </>
        )}
        {screen.k === 'new' && <NewGame slots={slots} onCancel={() => setScreen({ k: 'slots' })} onCreate={create} />}
        {screen.k === 'play' && playing && (
          <Play
            key={playing.id}
            slot={playing}
            updateSlot={(fn) => updateSlot(playing.id, fn)}
            settings={settings}
            onSettings={changeSettings}
            onExit={() => setScreen({ k: 'slots' })}
            persist={!demo}
            initialEncounter={demo?.enc ?? null}
            initialOverlay={
              demo?.screen === 'dex' || demo?.screen === 'types' || demo?.screen === 'map' ? demo.screen : demo ? 'none' : undefined
            }
          />
        )}
      </div>
      <TouchControls />
    </div>
  );
}
