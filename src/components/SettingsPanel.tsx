import { useState } from 'react';
import type { Settings } from '../game/save';
import { Menu, LAYER, KeyHint, A, Bb } from './ui';
import { KeyBindingsPanel } from './KeyBindingsPanel';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
  layer?: number;
}

const yesNo = (on: boolean) => (on ? 'Sí' : 'No');

function toggleFullscreen() {
  const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  if (document.fullscreenElement || doc.webkitFullscreenElement) {
    (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.()) as unknown;
  } else {
    (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.()) as unknown;
  }
}

export function SettingsPanel({ settings, onChange, onClose, layer = LAYER.dialog }: Props) {
  const [keysOpen, setKeysOpen] = useState(false);
  const options = [
    { label: `Sonidos: ${yesNo(settings.sound)}` },
    { label: `Música: ${yesNo(settings.music)}` },
    { label: 'Teclas', sub: 'Elige qué tecla hace cada cosa' },
    { label: 'Pantalla completa' },
    { label: 'Volver' },
  ];
  return (
    <div className="dialog-backdrop">
      <div className="panel dialog settings">
        <p className="dialog-title">Ajustes</p>
        <Menu
          options={options}
          layer={layer}
          active={!keysOpen}
          onBack={onClose}
          onSelect={(i) => {
            if (i === 0) onChange({ ...settings, sound: !settings.sound });
            else if (i === 1) onChange({ ...settings, music: !settings.music });
            else if (i === 2) setKeysOpen(true);
            else if (i === 3) toggleFullscreen();
            else onClose();
          }}
        />
        <KeyHint>
          <A /> Cambiar &nbsp; <Bb /> Volver
        </KeyHint>
      </div>
      {keysOpen && <KeyBindingsPanel keys={settings.keys} onChange={(keys) => onChange({ ...settings, keys })} onClose={() => setKeysOpen(false)} />}
    </div>
  );
}
