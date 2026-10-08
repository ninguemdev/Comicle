import { MIN_PLAYERS, type Ack, type MemberView, type PlayerView } from '@comicle/shared';
import { useCallback, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { env } from '../../config/env';
import { useRoomStore } from '../../stores/room-store';
import { errorMessages, strings } from '../../strings/pt-BR';
import { Button, buttonClassName } from '../../ui/button';
import { Card } from '../../ui/card';
import { Dialog } from '../../ui/dialog';
import { PlayerChip } from '../../ui/player-chip';
import { Toast, type ToastTone } from '../../ui/toast';
import { copyText, inviteUrl } from './invite';
import { SettingsPanel } from './settings-panel';

const texts = strings.room;

interface Notice {
  message: string;
  tone: ToastTone;
}

function InvitePanel({ code, onNotice }: { code: string; onNotice: (notice: Notice) => void }) {
  const link = inviteUrl(window.location.origin, env.routerBasename, code);
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();

  async function handleCopy() {
    if (await copyText(link)) {
      onNotice({ message: texts.inviteCopied, tone: 'success' });
      return;
    }
    // Fallback: the link stays visible and selected for a manual copy.
    input.current?.select();
    onNotice({ message: texts.copyFailed, tone: 'info' });
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-semibold text-muted">
        {texts.inviteLabel}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={input}
          id={inputId}
          readOnly
          value={link}
          onFocus={(event) => {
            event.target.select();
          }}
          className="min-h-11 min-w-0 flex-1 rounded-lg border-comic bg-paper px-3 text-sm font-semibold"
        />
        <Button variant="secondary" onClick={() => void handleCopy()}>
          {texts.copyInvite}
        </Button>
      </div>
    </div>
  );
}

/** R22 in the interface: the host sees why starting is not possible yet. */
function startBlockedReason(view: PlayerView): string | null {
  const connected = view.room.members.filter((member) => member.connected).length;
  return connected < MIN_PLAYERS ? errorMessages.NOT_ENOUGH_PLAYERS : null;
}

/** Lobby (interface.md §2): invite, players, settings and the host's controls. */
export function Lobby({ view }: { view: PlayerView }) {
  const actions = useRoomStore((state) => state.actions);
  const navigate = useNavigate();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [kickTarget, setKickTarget] = useState<MemberView | null>(null);
  const reasonId = useId();
  const { room, me } = view;
  const blockedReason = startBlockedReason(view);
  const dismissNotice = useCallback(() => {
    setNotice(null);
  }, []);

  function reportFailure(ack: Ack<unknown>): void {
    if (!ack.ok) {
      setNotice({ message: errorMessages[ack.error.code], tone: 'error' });
    }
  }

  async function handleLeave() {
    const ack = await actions.leaveRoom();
    if (ack.ok) {
      void navigate('/');
    } else {
      reportFailure(ack);
    }
  }

  async function confirmKick() {
    if (kickTarget === null) {
      return;
    }
    setKickTarget(null);
    reportFailure(await actions.kick(kickTarget.playerId));
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-5xl tracking-wide break-all">{texts.title(room.code)}</h1>
        <InvitePanel code={room.code} onNotice={setNotice} />
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-3xl tracking-wide">
          {texts.players(room.members.length)}
        </h2>
        <ul className="flex flex-wrap gap-3">
          {room.members.map((member) => (
            <li key={member.playerId} className="max-w-full">
              <PlayerChip
                nickname={member.nickname}
                avatar={member.avatar}
                isHost={member.isHost}
                isSelf={member.playerId === me.playerId}
                connected={member.connected}
                action={
                  me.isHost && member.playerId !== me.playerId ? (
                    <Button
                      variant="ghost"
                      className="min-h-9 px-2 py-0 text-sm"
                      aria-label={texts.kick(member.nickname)}
                      onClick={() => {
                        setKickTarget(member);
                      }}
                    >
                      {texts.kickConfirm}
                    </Button>
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <SettingsPanel
        settings={room.settings}
        editable={me.isHost}
        onChange={(settings) => {
          void actions.updateSettings(settings).then(reportFailure);
        }}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/perfil?next=${encodeURIComponent(`/sala/${room.code}`)}`}
            className={buttonClassName('secondary')}
          >
            {texts.editProfile}
          </Link>
          <Button variant="ghost" onClick={() => void handleLeave()}>
            {texts.leave}
          </Button>
        </div>
        {me.isHost && (
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Button
              disabled={blockedReason !== null}
              aria-describedby={blockedReason === null ? undefined : reasonId}
              onClick={() => {
                void actions.startMatch().then(reportFailure);
              }}
            >
              {texts.start}
            </Button>
            {blockedReason !== null && (
              <p id={reasonId} className="text-sm font-semibold text-muted">
                {blockedReason}
              </p>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={kickTarget !== null}
        title={texts.kickTitle}
        onClose={() => {
          setKickTarget(null);
        }}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setKickTarget(null);
              }}
            >
              {texts.cancel}
            </Button>
            <Button variant="danger" onClick={() => void confirmKick()}>
              {texts.kickConfirm}
            </Button>
          </>
        }
      >
        <p>{kickTarget === null ? null : texts.kickBody(kickTarget.nickname)}</p>
      </Dialog>

      {notice !== null && (
        <Toast message={notice.message} tone={notice.tone} onDismiss={dismissNotice} />
      )}
    </div>
  );
}

/** R10: a simple waiting screen while a match is running (the full one comes in T15). */
export function SpectatorScreen({ view }: { view: PlayerView }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-5xl tracking-wide break-all">
        {texts.title(view.room.code)}
      </h1>
      <Card>
        <p className="text-lg font-semibold">{texts.spectating}</p>
      </Card>
      <ul className="flex flex-wrap gap-3">
        {view.room.members.map((member) => (
          <li key={member.playerId} className="max-w-full">
            <PlayerChip
              nickname={member.nickname}
              avatar={member.avatar}
              isHost={member.isHost}
              isSelf={member.playerId === view.me.playerId}
              connected={member.connected}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
