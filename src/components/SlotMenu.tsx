import { useState } from 'react';
import type { SaveSlot } from '../game/save';
import { TOTAL } from '../game/creatures';
import { avatarURL } from '../art/assets';
import { MAP_NAMES } from '../world/tiles';
import { sfx } from '../system/audio';
import { Menu, LAYER, BallIcon, EyeIcon, KeyHint, A, Bb } from './ui';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  slots: SaveSlot[];
  onPlay: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onSettings: () => void;
  onBack: () => void;
  active: boolean;
}

export function SlotMenu({ slots, onPlay, onNew, onDelete, onSettings, onBack, active }: Props) {
  const [chosen, setChosen] = useState<SaveSlot | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SaveSlot | null>(null);

  const options = [
    ...slots.map((s) => ({
      label: s.name,
      className: 'slot-opt',
    })),
    { label: '+ Nueva partida', className: 'new-opt' },
    { label: 'Ajustes', className: 'settings-opt' },
  ];

  const select = (i: number) => {
    if (i < slots.length) {
      setChosen(slots[i]);
    } else if (i === slots.length) onNew();
    else onSettings();
  };

  return (
    <div className="screen slot-screen">
      <h2 className="screen-title">¿Con qué partida jugamos?</h2>
      <div className="panel slot-panel">
        <Menu
          options={options}
          onSelect={select}
          onBack={onBack}
          layer={LAYER.screen}
          active={active && !chosen && !confirmDelete}
          className="slot-list"
          render={(o, i, sel) => {
            const s = slots[i];
            if (!s) {
              return (
                <>
                  <span className="cursor">{sel ? '▶' : ''}</span>
                  <span className="opt-label">{o.label}</span>
                </>
              );
            }
            return (
              <>
                <span className="cursor">{sel ? '▶' : ''}</span>
                <img className="pix slot-avatar" src={avatarURL(s.avatar)} alt="" draggable={false} />
                <span className="slot-info">
                  <span className="slot-name">{s.name}</span>
                  <span className="slot-stats">
                    <span className={'mode-badge ' + s.mode}>{s.mode === 'easy' ? 'Fácil' : 'Normal'}</span>
                    <span className="map-badge">{MAP_NAMES[s.map]}</span>
                    <BallIcon size={22} /> {s.caught.length}/{TOTAL}
                    <EyeIcon size={22} /> {s.seen.length}
                  </span>
                </span>
              </>
            );
          }}
        />
      </div>
      <KeyHint>
        <A /> Elegir &nbsp; <Bb /> Volver
      </KeyHint>

      {chosen && (
        <div className="dialog-backdrop">
          <div className="panel dialog">
            <p className="dialog-title">Partida de {chosen.name}</p>
            <Menu
              options={[{ label: '¡A jugar!' }, { label: 'Borrar partida' }, { label: 'Volver' }]}
              layer={LAYER.dialog}
              active={!confirmDelete}
              onSelect={(i) => {
                if (i === 0) onPlay(chosen.id);
                else if (i === 1) {
                  setConfirmDelete(chosen);
                } else setChosen(null);
              }}
              onBack={() => setChosen(null)}
            />
          </div>
        </div>
      )}
      {confirmDelete && (
        <ConfirmDialog
          text={`¿Seguro que quieres borrar la partida de ${confirmDelete.name}? ¡No se puede deshacer!`}
          yes="Sí, borrar"
          no="No"
          onAnswer={(yes) => {
            if (yes) {
              sfx('back');
              onDelete(confirmDelete.id);
              setChosen(null);
            }
            setConfirmDelete(null);
          }}
        />
      )}
    </div>
  );
}
