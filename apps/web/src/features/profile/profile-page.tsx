import {
  codePointLength,
  NICKNAME_MAX_LENGTH,
  nicknameSchema,
  normalizeText,
} from '@comicle/shared';
import { useId, useRef, useState, type SubmitEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { cryptoRng } from '../../lib/random';
import { useProfileStore } from '../../stores/profile-store';
import { strings } from '../../strings/pt-BR';
import { Button, buttonClassName } from '../../ui/button';
import { Card } from '../../ui/card';
import { AvatarEditor } from '../avatar/avatar-editor';
import { ThemeSwitch } from '../theme/theme-switch';
import { safeNextPath } from './next-path';

type NicknameProblem = 'empty' | 'tooLong';

/** R1: the shared schema decides; the length only picks the message. */
function nicknameProblem(nickname: string): NicknameProblem | null {
  if (nicknameSchema.safeParse(nickname).success) {
    return null;
  }
  return codePointLength(normalizeText(nickname)) === 0 ? 'empty' : 'tooLong';
}

function problemMessage(problem: NicknameProblem): string {
  switch (problem) {
    case 'empty':
      return strings.profile.nicknameEmpty;
    case 'tooLong':
      return strings.profile.nicknameTooLong(NICKNAME_MAX_LENGTH);
    default:
      return problem satisfies never;
  }
}

/** Avatar editor and nickname (interface.md §2); saving returns to `?next=` (R4). */
export function ProfilePage() {
  const profile = useProfileStore((state) => state.profile);
  const actions = useProfileStore((state) => state.actions);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));

  const [avatar, setAvatar] = useState(profile.avatar);
  const [nickname, setNickname] = useState(profile.nickname);
  // Empty is only an error once the player left the field or tried to save.
  const [touched, setTouched] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const counterId = useId();
  const errorId = useId();

  const length = codePointLength(normalizeText(nickname));
  const problem = nicknameProblem(nickname);
  const visibleProblem = problem === 'tooLong' || touched ? problem : null;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = nicknameSchema.safeParse(nickname);
    if (!parsed.success) {
      setTouched(true);
      input.current?.focus();
      return;
    }
    actions.save({ nickname: parsed.data, avatar });
    void navigate(nextPath);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-5xl tracking-wide">{strings.profile.title}</h1>
      <Card>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <label htmlFor={inputId} className="font-display text-2xl tracking-wide">
                {strings.profile.nicknameLabel}
              </label>
              <span
                id={counterId}
                className={`text-sm ${length > NICKNAME_MAX_LENGTH ? 'font-extrabold' : 'text-muted'}`}
              >
                {strings.profile.nicknameCounter(length, NICKNAME_MAX_LENGTH)}
              </span>
            </div>
            <input
              ref={input}
              id={inputId}
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value);
              }}
              onBlur={() => {
                setTouched(true);
              }}
              placeholder={strings.profile.nicknamePlaceholder}
              autoComplete="nickname"
              aria-invalid={visibleProblem !== null}
              aria-describedby={visibleProblem ? `${counterId} ${errorId}` : counterId}
              className="min-h-11 rounded-lg border-comic bg-paper px-3 py-2 text-lg font-bold placeholder:font-semibold placeholder:text-muted"
            />
            {visibleProblem && (
              <p id={errorId} role="alert" className="border-l-4 border-pop-red pl-2 font-bold">
                {problemMessage(visibleProblem)}
              </p>
            )}
          </div>

          <AvatarEditor value={avatar} onChange={setAvatar} rng={cryptoRng} />

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link to={nextPath} className={buttonClassName('ghost')}>
              {strings.profile.cancel}
            </Link>
            <Button type="submit">{strings.profile.save}</Button>
          </div>
        </form>
      </Card>
      <ThemeSwitch />
    </div>
  );
}
