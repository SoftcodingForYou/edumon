import { useEffect, useRef } from 'react';
import { avatarURL, ballURL, getMapCanvas } from '../art/assets';
import { HABITAT_NAMES } from '../game/creatures';
import { BIOME_HABITAT } from '../world/tiles';
import { biomeOfPlayer, type WorldState } from '../world/world';
import { useInput } from '../system/input';
import { sfx } from '../system/audio';
import { say } from '../system/speech';
import { LAYER, KeyHint, Bb } from './ui';

// Where the area names are written on the map (in tiles).
const AREAS: { name: string; x: number; y: number }[] = [
  { name: 'Gran volcán', x: 24, y: 6 },
  { name: 'Montaña', x: 80, y: 30 },
  { name: 'Cumbre nevada', x: 85, y: 15 },
  { name: 'Bosque', x: 108, y: 50 },
  { name: 'Lago', x: 28, y: 71 },
  { name: 'Río', x: 70, y: 66 },
  { name: 'Pradera', x: 44, y: 32 },
  { name: 'Playa', x: 34, y: 88 },
  { name: 'Isla volcánica', x: 104, y: 86 },
];

const MAP_H = 412; // on-screen height of the map in stage pixels

export function WorldMapView({ world, caught, avatar, onClose }: { world: WorldState; caught: number[]; avatar: number; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const m = world.map;
  const mapW = Math.round((MAP_H * m.w) / m.h);
  const px = (tx: number) => ((tx + 0.5) / m.w) * mapW;
  const py = (ty: number) => ((ty + 0.5) / m.h) * MAP_H;

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const src = getMapCanvas();
    ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, mapW, MAP_H);
    const here = HABITAT_NAMES[BIOME_HABITAT[biomeOfPlayer(world)]];
    void say(`El mapa. Estás en ${here}. Las estrellas marcan dónde viven los Edumon legendarios.`);
  }, [world, mapW]);

  useInput((e) => {
    if (e.btn === 'b' || e.btn === 'a' || e.btn === 'map') {
      sfx('back');
      onClose();
    }
  }, LAYER.dex);

  const p = world.player;
  return (
    <div className="worldmap">
      <div className="dex-header">
        <h2>MAPA</h2>
        <span className="tc-sub">Estás en {HABITAT_NAMES[BIOME_HABITAT[biomeOfPlayer(world)]]}</span>
      </div>
      <div className="wm-frame" style={{ width: mapW, height: MAP_H }}>
        <canvas ref={canvasRef} width={mapW} height={MAP_H} />
        {AREAS.map((a) => (
          <span key={a.name} className="wm-label" style={{ left: px(a.x), top: py(a.y) }}>
            {a.name}
          </span>
        ))}
        {m.spots.map((s) =>
          caught.includes(s.species) ? (
            <img key={s.species} className="wm-spot pix" src={ballURL()} alt="" style={{ left: px(s.x), top: py(s.y) }} />
          ) : (
            <span key={s.species} className="wm-spot wm-star" style={{ left: px(s.x), top: py(s.y) }}>
              ★
            </span>
          ),
        )}
        <span className="wm-player" style={{ left: px(p.x), top: py(p.y) }}>
          <img className="pix" src={avatarURL(avatar)} alt="Estás aquí" />
          <b>¡Aquí!</b>
        </span>
      </div>
      <div className="wm-legend">
        <span>
          <span className="wm-star small">★</span> Vive un legendario
        </span>
        <span>
          <img className="pix" src={ballURL()} alt="" width={20} height={20} /> Ya lo atrapaste
        </span>
      </div>
      <KeyHint>
        <Bb /> Volver
      </KeyHint>
    </div>
  );
}
