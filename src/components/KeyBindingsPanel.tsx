import { useEffect, useState } from 'react';
import { BTN_NAMES, BTN_ORDER, DEFAULT_KEYS, keyLabel, normalizeKey, rebind, type Btn, type KeyBindings } from '../system/keys';
import { cancelCapture, captureNextKey } from '../system/input';
import { sfx } from '../system/audio';
import { Menu, LAYER } from './ui';

interface Props {
  keys: KeyBindings;
  onChange: (k: KeyBindings) => void;
  onClose: () => void;
}

/** Choose which keyboard key does what. */
export function KeyBindingsPanel({ keys, onChange, onClose }: Props) {
  const [waiting, setWaiting] = useState<Btn | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => () => cancelCapture(), []);

  const listen = (btn: Btn) => {
    setWaiting(btn);
    setMsg('');
    captureNextKey((key) => {
      setWaiting(null);
      if (!key) {
        sfx('back');
        setMsg('');
        return;
      }
      const k = normalizeKey(key);
      const swapped = BTN_ORDER.find((o) => o !== btn && keys[o] === k);
      onChange(rebind(keys, btn, k));
      sfx('ok');
      const text = swapped
        ? `${BTN_NAMES[btn]}: ${keyLabel(k)}. ${BTN_NAMES[swapped]} ahora usa ${keyLabel(keys[btn])}.`
        : `${BTN_NAMES[btn]}: ${keyLabel(k)}.`;
      setMsg(text);
    });
  };

  const options = [
    ...BTN_ORDER.map((b) => ({ label: BTN_NAMES[b] })),
    { label: 'Teclas de siempre' },
    { label: 'Volver' },
  ];

  return (
    <div className="dialog-backdrop">
      <div className="panel dialog keys-panel">
        <p className="dialog-title">Teclas</p>
        <Menu
          scroll
          options={options}
          layer={LAYER.dialog + 10}
          active={waiting === null}
          onBack={onClose}
          onSelect={(i) => {
            if (i < BTN_ORDER.length) listen(BTN_ORDER[i]);
            else if (i === BTN_ORDER.length) {
              onChange({ ...DEFAULT_KEYS });
              setMsg('Las teclas vuelven a ser las de siempre.');
            } else onClose();
          }}
          render={(o, i, sel) => {
            const btn = BTN_ORDER[i];
            return (
              <>
                <span className="cursor">{sel ? '▶' : ''}</span>
                <span className="opt-label">{o.label}</span>
                {btn && (
                  <span className={'keycap big' + (waiting === btn ? ' waiting blink' : '')}>{waiting === btn ? '?' : keyLabel(keys[btn])}</span>
                )}
              </>
            );
          }}
        />
        <p className="keys-msg">{waiting ? `Pulsa la tecla nueva para «${BTN_NAMES[waiting]}»… (Esc cancela)` : msg || 'Elige una acción y pulsa la tecla que quieras.'}</p>
      </div>
    </div>
  );
}
