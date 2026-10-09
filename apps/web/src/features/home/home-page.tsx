import { useCallback, useId, useState, type SubmitEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { useProfileStore } from '../../stores/profile-store';
import { useRoomStore } from '../../stores/room-store';
import { errorMessages, strings } from '../../strings/pt-BR';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Logo } from '../../ui/logo';
import { Toast } from '../../ui/toast';
import { AvatarRenderer } from '../avatar/avatar-renderer';
import { ThemeSwitch } from '../theme/theme-switch';
import { isCompleteRoomCode, sanitizeRoomCodeInput } from './room-code-input';

const texts = strings.home;
const PROFILE_FROM_HOME = `/perfil?next=${encodeURIComponent('/')}`;

function ProfileSummary() {
  const profile = useProfileStore((state) => state.profile);
  const saved = useProfileStore((state) => state.saved);
  const label = saved ? strings.avatar.of(profile.nickname) : strings.avatar.preview;
  return (
    <Card className="flex w-full items-center gap-4">
      <AvatarRenderer avatar={profile.avatar} size={64} label={label} />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="max-w-full truncate text-xl font-extrabold">
          {saved ? profile.nickname : texts.noNickname}
        </span>
        <Link to={PROFILE_FROM_HOME} className="font-bold underline underline-offset-4">
          {texts.editProfile}
        </Link>
      </div>
    </Card>
  );
}

function JoinForm() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const inputId = useId();

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCompleteRoomCode(code)) {
      void navigate(`/sala/${code}`);
    }
  }

  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <h2 className="font-display text-3xl tracking-wide">{texts.joinTitle}</h2>
        <label htmlFor={inputId} className="sr-only">
          {texts.codeLabel}
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id={inputId}
            value={code}
            onChange={(event) => {
              setCode(sanitizeRoomCodeInput(event.target.value));
            }}
            placeholder={texts.codePlaceholder}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="min-h-11 min-w-0 flex-1 rounded-lg border-comic bg-paper px-3 font-display text-2xl tracking-[0.3em] placeholder:text-base placeholder:tracking-normal placeholder:text-muted"
          />
          <Button type="submit" variant="secondary" disabled={!isCompleteRoomCode(code)}>
            {texts.join}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Start screen (interface.md §2): profile, create a room, join by code. */
export function HomePage() {
  const saved = useProfileStore((state) => state.saved);
  const profile = useProfileStore((state) => state.profile);
  const actions = useRoomStore((state) => state.actions);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  async function handleCreate() {
    // R4: a room needs a saved nickname; the profile screen returns here afterwards.
    if (!saved) {
      void navigate(PROFILE_FROM_HOME);
      return;
    }
    setCreating(true);
    const ack = await actions.createRoom(profile);
    setCreating(false);
    if (ack.ok) {
      void navigate(`/sala/${ack.data.roomCode}`);
    } else {
      setError(errorMessages[ack.error.code]);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-2 text-center">
      <h1>
        <Logo />
      </h1>
      <p className="text-lg font-semibold text-muted">{strings.app.tagline}</p>
      <div className="flex w-full max-w-md flex-col gap-4 text-left">
        <ProfileSummary />
        <Button className="w-full" disabled={creating} onClick={() => void handleCreate()}>
          {creating ? texts.creating : texts.createRoom}
        </Button>
        <JoinForm />
        <ThemeSwitch />
      </div>
      {error !== null && <Toast message={error} tone="error" onDismiss={dismissError} />}
    </div>
  );
}
