import type { MemberProgress } from '@comicle/shared';
import type { ReactNode } from 'react';

import { strings } from '../strings/pt-BR';
import { CheckIcon, CrownIcon } from './icons';

export interface PlayerChipProps {
  nickname: string;
  /** Avatar slot; `AvatarRenderer` arrives in T07. */
  avatar: ReactNode;
  isHost?: boolean;
  isSelf?: boolean;
  connected?: boolean;
  progress?: MemberProgress;
}

function ProgressBadge({ progress }: { progress: MemberProgress }) {
  switch (progress) {
    case 'idle':
      return null;
    case 'working':
      return (
        <span className="rounded-full border-2 border-ink bg-pop-yellow px-2 text-xs font-bold">
          {strings.ui.player.working}
        </span>
      );
    case 'done':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-pop-green px-2 text-xs font-bold">
          <CheckIcon className="size-3" />
          {strings.ui.player.done}
        </span>
      );
    default:
      return progress satisfies never;
  }
}

/** Avatar + nickname + state (interface.md §1). */
export function PlayerChip({
  nickname,
  avatar,
  isHost = false,
  isSelf = false,
  connected = true,
  progress = 'idle',
}: PlayerChipProps) {
  return (
    <div
      className={`flex max-w-full min-w-0 items-center gap-2 rounded-full border-comic bg-paper py-1 pr-3 pl-1 shadow-pop ${
        connected ? '' : 'opacity-60 grayscale'
      }`}
    >
      <span className="relative shrink-0">
        <span className="flex size-10 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-paper">
          {avatar}
        </span>
        {isHost && (
          <span className="absolute -top-3 -right-2" title={strings.ui.player.host}>
            <CrownIcon />
            <span className="sr-only">{strings.ui.player.host}</span>
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-extrabold">
          {nickname}
          {isSelf && (
            <span className="ml-1 font-semibold text-muted">{strings.ui.player.self}</span>
          )}
        </span>
        {!connected && (
          <span className="text-xs font-semibold text-muted">{strings.ui.player.disconnected}</span>
        )}
      </span>
      <ProgressBadge progress={progress} />
    </div>
  );
}
