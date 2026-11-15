import { useEffect } from 'react';
import { say } from '../system/speech';
import { Menu, LAYER } from './ui';

interface Props {
  text: string;
  yes?: string;
  no?: string;
  onAnswer: (yes: boolean) => void;
  layer?: number;
}

/** A yes/no question. "No" is selected first so nothing happens by accident. */
export function ConfirmDialog({ text, yes = 'Sí', no = 'No', onAnswer, layer = LAYER.dialog + 5 }: Props) {
  useEffect(() => {
    say(text);
  }, [text]);
  return (
    <div className="dialog-backdrop">
      <div className="panel dialog">
        <p className="dialog-title">{text}</p>
        <Menu options={[{ label: no }, { label: yes }]} layer={layer} onSelect={(i) => onAnswer(i === 1)} onBack={() => onAnswer(false)} />
      </div>
    </div>
  );
}
