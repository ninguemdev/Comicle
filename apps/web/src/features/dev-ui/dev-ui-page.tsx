import { useState, type ReactNode } from 'react';

import { strings } from '../../strings/pt-BR';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { ConnectionBanner } from '../../ui/connection-banner';
import { Dialog } from '../../ui/dialog';
import { PlayerChip } from '../../ui/player-chip';
import { ProgressPill } from '../../ui/progress-pill';
import { SpeechBubble } from '../../ui/speech-bubble';
import { Timer } from '../../ui/timer';
import { Toast, type ToastTone } from '../../ui/toast';

const LONG_TIMER_MS = 90_000;
const SHORT_TIMER_MS = 12_000;
const PLACEHOLDER_AVATAR_COLORS = ['bg-pop-yellow', 'bg-pop-blue', 'bg-pop-green', 'bg-pop-red'];

const texts = strings.devUi;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-3xl tracking-wide">{title}</h2>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
    </section>
  );
}

function PlaceholderAvatar({ nickname, index }: { nickname: string; index: number }) {
  const color = PLACEHOLDER_AVATAR_COLORS[index % PLACEHOLDER_AVATAR_COLORS.length] ?? '';
  return (
    <span className={`flex size-full items-center justify-center font-display text-xl ${color}`}>
      {nickname.slice(0, 1)}
    </span>
  );
}

/** Design system showcase, routed only in development (`/dev/ui`). */
export function DevUiPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toastTone, setToastTone] = useState<ToastTone | null>(null);
  const [deadlineAt, setDeadlineAt] = useState(() => Date.now() + LONG_TIMER_MS);
  const closeDialog = () => {
    setDialogOpen(false);
  };
  const dismissToast = () => {
    setToastTone(null);
  };

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-5xl tracking-wide">{texts.title}</h1>
        <p className="text-muted">{texts.intro}</p>
      </header>

      <Section title={texts.sections.buttons}>
        <Button>{texts.buttons.primary}</Button>
        <Button variant="secondary">{texts.buttons.secondary}</Button>
        <Button variant="danger">{texts.buttons.danger}</Button>
        <Button variant="ghost">{texts.buttons.ghost}</Button>
        <Button disabled>{texts.buttons.disabled}</Button>
      </Section>

      <Section title={texts.sections.card}>
        <Card className="w-full">
          <h3 className="font-display text-2xl tracking-wide">{texts.card.title}</h3>
          <p>{texts.card.body}</p>
        </Card>
      </Section>

      <Section title={texts.sections.dialog}>
        <Button
          variant="secondary"
          onClick={() => {
            setDialogOpen(true);
          }}
        >
          {texts.dialog.open}
        </Button>
        <Dialog
          open={dialogOpen}
          title={texts.dialog.title}
          onClose={closeDialog}
          actions={
            <>
              <Button variant="secondary" onClick={closeDialog}>
                {texts.dialog.cancel}
              </Button>
              <Button variant="danger" onClick={closeDialog}>
                {texts.dialog.confirm}
              </Button>
            </>
          }
        >
          <p>{texts.dialog.body}</p>
        </Dialog>
      </Section>

      <Section title={texts.sections.timer}>
        <Timer deadlineAt={deadlineAt} offsetMs={0} />
        <Button
          variant="ghost"
          onClick={() => {
            setDeadlineAt(Date.now() + LONG_TIMER_MS);
          }}
        >
          {texts.timer.restartLong}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setDeadlineAt(Date.now() + SHORT_TIMER_MS);
          }}
        >
          {texts.timer.restartShort}
        </Button>
      </Section>

      <Section title={texts.sections.progress}>
        <ProgressPill done={3} total={5} />
        <ProgressPill done={5} total={5} />
      </Section>

      <Section title={texts.sections.speechBubble}>
        <SpeechBubble>{texts.speechBubble}</SpeechBubble>
      </Section>

      <Section title={texts.sections.players}>
        {texts.players.map((nickname, index) => (
          <PlayerChip
            key={nickname}
            nickname={nickname}
            avatar={<PlaceholderAvatar nickname={nickname} index={index} />}
            isHost={index === 0}
            isSelf={index === 1}
            connected={index !== 3}
            progress={index === 0 ? 'done' : index === 1 ? 'working' : 'idle'}
          />
        ))}
      </Section>

      <Section title={texts.sections.toast}>
        <Button
          variant="secondary"
          onClick={() => {
            setToastTone('success');
          }}
        >
          {texts.toast.show}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setToastTone('error');
          }}
        >
          {texts.toast.showError}
        </Button>
        {toastTone !== null && (
          <Toast
            message={toastTone === 'error' ? strings.connection.ackTimeout : texts.toast.message}
            tone={toastTone}
            onDismiss={dismissToast}
          />
        )}
      </Section>

      <Section title={texts.sections.connection}>
        <div className="flex w-full flex-col gap-3">
          <ConnectionBanner status="reconnecting" />
          <ConnectionBanner status="offline" onRetry={() => undefined} />
        </div>
      </Section>
    </div>
  );
}
