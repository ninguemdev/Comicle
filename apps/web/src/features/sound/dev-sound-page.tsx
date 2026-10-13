import { strings } from '../../strings/pt-BR';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { SOUND_IDS } from './sound-catalog';
import { soundEngine } from './sound-engine';
import { VolumeControl } from './volume-control';

const texts = strings.devSounds;

/** Every sound of the catalog, to tune them by ear; routed only in development (`/dev/sons`). */
export function DevSoundPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-5xl tracking-wide">{texts.title}</h1>
        <p className="text-muted">{texts.description}</p>
      </div>
      <Card>
        <VolumeControl />
      </Card>
      <section aria-label={texts.sounds} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SOUND_IDS.map((id) => (
          <Button
            key={id}
            variant="secondary"
            onClick={() => {
              soundEngine.play(id);
            }}
          >
            {strings.sound.names[id]}
          </Button>
        ))}
      </section>
    </div>
  );
}
