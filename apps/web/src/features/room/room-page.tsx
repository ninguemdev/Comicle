import { normalizeRoomCode, roomCodeSchema, type ErrorCode } from '@comicle/shared';
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';

import { useProfileStore } from '../../stores/profile-store';
import { useRoomStore, type RoomExit } from '../../stores/room-store';
import { strings } from '../../strings/pt-BR';
import { Button, buttonClassName } from '../../ui/button';
import { SpeechBubble } from '../../ui/speech-bubble';
import { Toast } from '../../ui/toast';
import { MatchScreen } from '../match/match-screen';
import { Lobby } from './lobby';

type Problem = keyof typeof strings.room.problems;

function problemForError(code: ErrorCode): Problem {
  switch (code) {
    case 'ROOM_NOT_FOUND':
    case 'INVALID_PAYLOAD':
      return 'notFound';
    case 'ROOM_FULL':
      return 'full';
    case 'KICKED':
      return 'kicked';
    case 'ROOM_CLOSED':
      return 'closed';
    default:
      return 'failed';
  }
}

function problemForExit(exit: RoomExit): Problem {
  switch (exit) {
    case 'kicked':
      return 'kicked';
    case 'closed':
      return 'closed';
    case 'replaced':
      return 'replaced';
    default:
      return exit satisfies never;
  }
}

function ProblemScreen({
  problem,
  onRetry,
}: {
  problem: Problem;
  onRetry?: (() => void) | undefined;
}) {
  const { title, message } = strings.room.problems[problem];
  return (
    <div className="flex flex-col items-start gap-6">
      <h1 className="font-display text-5xl tracking-wide">{title}</h1>
      <SpeechBubble>{message}</SpeechBubble>
      <div className="flex flex-wrap gap-3">
        {onRetry !== undefined && (
          <Button variant="secondary" onClick={onRetry}>
            {strings.room.retry}
          </Button>
        )}
        <Link to="/" className={buttonClassName('primary')}>
          {strings.navigation.backHome}
        </Link>
      </div>
    </div>
  );
}

/** R57: why the match just ended, once per abort that happens while the room is open. */
function MatchAbortedToast() {
  const aborted = useRoomStore((state) => state.matchAborted);
  const [seen, setSeen] = useState(() => aborted?.seq ?? 0);
  const dismiss = useCallback(() => {
    setSeen(aborted?.seq ?? 0);
  }, [aborted]);
  if (aborted === null || aborted.seq <= seen) {
    return null;
  }
  return (
    <Toast
      message={strings.match.aborted[aborted.payload.reason]}
      tone={aborted.payload.reason === 'host' ? 'info' : 'error'}
      onDismiss={dismiss}
    />
  );
}

/** Joins when connected (again after a reconnection) and picks the screen for the room state. */
function RoomSession({ code }: { code: string }) {
  const connection = useRoomStore((state) => state.connection);
  const view = useRoomStore((state) => state.view);
  const exit = useRoomStore((state) => state.exit);
  const actions = useRoomStore((state) => state.actions);
  const profile = useProfileStore((state) => state.profile);
  const [joinError, setJoinError] = useState<ErrorCode | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (connection !== 'connected') {
      return;
    }
    let current = true;
    void actions.joinRoom(code, profile).then((ack) => {
      if (current) {
        setJoinError(ack.ok ? null : ack.error.code);
      }
    });
    return () => {
      current = false;
    };
  }, [actions, code, connection, profile, attempt]);

  if (exit !== null) {
    return <ProblemScreen problem={problemForExit(exit)} />;
  }
  if (joinError !== null) {
    const problem = problemForError(joinError);
    return (
      <ProblemScreen
        problem={problem}
        onRetry={
          problem === 'failed'
            ? () => {
                setJoinError(null);
                setAttempt((count) => count + 1);
              }
            : undefined
        }
      />
    );
  }
  if (view?.room.code !== code) {
    return <SpeechBubble>{strings.room.joining}</SpeechBubble>;
  }
  return (
    <>
      {view.match === null ? <Lobby view={view} /> : <MatchScreen view={view} match={view.match} />}
      <MatchAbortedToast />
    </>
  );
}

/** `/sala/:code`: lobby, match and presentation are states of this route (arquitetura §5). */
export function RoomPage() {
  const { code: rawCode = '' } = useParams();
  const code = normalizeRoomCode(rawCode);
  const saved = useProfileStore((state) => state.saved);

  if (!roomCodeSchema.safeParse(code).success) {
    return <ProblemScreen problem="notFound" />;
  }
  // R7: an invite opened without a profile goes through the profile screen first.
  if (!saved) {
    return <Navigate to={`/perfil?next=${encodeURIComponent(`/sala/${code}`)}`} replace />;
  }
  return <RoomSession key={code} code={code} />;
}
