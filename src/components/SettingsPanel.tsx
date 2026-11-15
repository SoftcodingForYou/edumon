import { useState } from 'react';
import type { Settings } from '../game/save';
import { say, voiceAvailable } from '../system/speech';
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
    { label: `Sonidos: ${yesNo(settings.sound)}`, speak: `Sonidos: ${yesNo(settings.sound)}` },
    { label: `Música: ${yesNo(settings.music)}`, speak: `Música: ${yesNo(settings.music)}` },
    {
      label: `Voz: ${yesNo(settings.voice)}`,
      speak: `Voz: ${yesNo(settings.voice)}`,
      sub: voiceAvailable() ? 'Lee los textos en voz alta' : 'Este navegador no tiene voz',
    },
    { label: 'Teclas', speak: 'Cambiar las teclas', sub: 'Elige qué tecla hace cada cosa' },
    { label: 'Pantalla completa', speak: 'Pantalla completa' },
    { label: 'Volver', speak: 'Volver' },
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
            if (i === 0) {
              onChange({ ...settings, sound: !settings.sound });
              void say(`Sonidos: ${yesNo(!settings.sound)}`);
            } else if (i === 1) {
              onChange({ ...settings, music: !settings.music });
              void say(`Música: ${yesNo(!settings.music)}`);
            } else if (i === 2) {
              onChange({ ...settings, voice: !settings.voice });
              if (!settings.voice) setTimeout(() => void say('Voz: Sí'), 50);
            } else if (i === 3) setKeysOpen(true);
            else if (i === 4) toggleFullscreen();
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
