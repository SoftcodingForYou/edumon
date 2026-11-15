import { getSpecies, type Species } from '../game/creatures';
import { effectiveness } from '../game/elements';
import { portraitURL } from '../art/assets';
import { Menu, LAYER, TypeBadge, KeyHint, A, Bb, FitText } from './ui';

interface Props {
  team: number[];
  wild: Species;
  exclude: number[];
  current?: number | null;
  title: string;
  allowCancel: boolean;
  onDone: (id: number | null) => void;
}

/** Grid of all caught Edumon (name + picture) to choose a fighter. */
export function CreaturePicker({ team, wild, exclude, current, title, allowCancel, onDone }: Props) {
  const hint = (s: Species) => {
    const m = effectiveness(s.types[0], wild.types);
    return m > 1 ? 'strong' : m < 1 ? 'weak' : '';
  };
  return (
    <div className="picker">
      <h2 className="picker-title">{title}</h2>
      <Menu
        options={team.map((id) => {
          const s = getSpecies(id);
          return {
            label: s.name,
            disabled: exclude.includes(id),
          };
        })}
        columns={4}
        layer={LAYER.picker}
        onSelect={(i) => onDone(team[i])}
        onBack={allowCancel ? () => onDone(null) : undefined}
        className="picker-grid"
        render={(o, i, sel) => {
          const s = getSpecies(team[i]);
          const h = hint(s);
          return (
            <div className={'pick-card' + (sel ? ' sel' : '') + (o.disabled ? ' tired' : '')}>
              <img className="pix" src={portraitURL(s.id)} alt={s.name} draggable={false} />
              <FitText className="pick-name">{s.name}</FitText>
              <FitText className="pick-types">
                {s.types.map((t) => (
                  <TypeBadge key={t} type={t} small />
                ))}
              </FitText>
              {o.disabled ? (
                <span className="pick-tag tired">{team[i] === current ? 'Luchando' : 'Cansado'}</span>
              ) : h === 'strong' ? (
                <span className="pick-tag strong">¡Muy eficaz!</span>
              ) : null}
            </div>
          );
        }}
      />
      <KeyHint>
        <A /> Elegir {allowCancel && (<>&nbsp; <Bb /> Volver</>)}
      </KeyHint>
    </div>
  );
}
