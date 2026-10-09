import { AUTOSAVE_INTERVAL_MS, type PlayerView } from '@comicle/shared';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRoomStore } from '../../stores/room-store';
import { useSessionStore } from '../../stores/session-store';
import { matchView, setUpStores } from '../../test/room-fixtures';
import type { DrawingEditorProps } from '../drawing/drawing-editor';
import { DrawingScreen } from './drawing-screen';

// The real editor needs a 2D canvas; this one records its props and hands back a fixed PNG.
const editor = vi.hoisted(() => ({
  props: null as DrawingEditorProps | null,
  png: new Uint8Array([137, 80, 78, 71]),
}));
vi.mock('../drawing/drawing-editor', () => ({
  DrawingEditor: (props: DrawingEditorProps) => {
    editor.props = props;
    useImperativeHandle(props.ref, () => ({ exportPng: () => Promise.resolve(editor.png) }));
    return null;
  },
}));

const NOW = 1_000_000;
const DRAWING_MS = 90_000;

function drawingView({ hasDraft = false, deadlineIn = DRAWING_MS } = {}): PlayerView {
  return matchView({
    phase: 'round_drawing',
    roundIndex: 1,
    phaseDeadlineAt: NOW + deadlineIn,
    task: { kind: 'draw_panel', status: 'drawing', theme: 'Um gato', panelPosition: 1, hasDraft },
  });
}

function renderDrawing(view: PlayerView) {
  const match = view.match;
  if (!match) {
    throw new Error('view sem partida');
  }
  const actions = setUpStores(view);
  useRoomStore.setState({ clockOffsetMs: 0 });
  const onSent = vi.fn();
  render(
    <DrawingScreen
      view={view}
      match={match}
      theme="Um gato"
      hasDraft={match.task.kind === 'draw_panel' && match.task.hasDraft}
      closing={false}
      onSent={onSent}
    />,
  );
  return { actions, onSent };
}

/** Lets the timers and the promises they start run. */
async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function change(revision: number): void {
  act(() => {
    editor.props?.onChange(revision);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  editor.props = null;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  useSessionStore.setState({ status: 'idle', token: null });
});

describe('tela de desenho', () => {
  it('R39: sem mudança, nenhum autosave; com mudança, um autosave após o intervalo', async () => {
    const { actions } = renderDrawing(drawingView());

    await advance(AUTOSAVE_INTERVAL_MS * 2);
    expect(actions.autosavePanel).not.toHaveBeenCalled();

    change(1);
    change(2);
    await advance(AUTOSAVE_INTERVAL_MS);
    expect(actions.autosavePanel).toHaveBeenCalledTimes(1);
    expect(actions.autosavePanel).toHaveBeenCalledWith(1, editor.png);

    await advance(AUTOSAVE_INTERVAL_MS * 2);
    expect(actions.autosavePanel).toHaveBeenCalledTimes(1);
    change(3);
    await advance(AUTOSAVE_INTERVAL_MS);
    expect(actions.autosavePanel).toHaveBeenCalledTimes(2);
  });

  it('R42: timer local zerado envia timeout uma única vez; round:collect depois não reenvia', async () => {
    const { actions, onSent } = renderDrawing(drawingView({ deadlineIn: 3000 }));

    await advance(2999);
    expect(actions.submitPanel).not.toHaveBeenCalled();
    await advance(1);
    expect(actions.submitPanel).toHaveBeenCalledTimes(1);
    expect(actions.submitPanel).toHaveBeenCalledWith(1, 'timeout', editor.png);
    expect(onSent).toHaveBeenCalledWith(1);
    expect(editor.props?.disabled).toBe(true);

    act(() => {
      useRoomStore.setState({ collect: { seq: 99, payload: { roundIndex: 1 } } });
    });
    await advance(1000);
    expect(actions.submitPanel).toHaveBeenCalledTimes(1);
  });

  it('R42: round:collect da rodada envia timeout na hora; de outra rodada, não', async () => {
    const { actions } = renderDrawing(drawingView());

    act(() => {
      useRoomStore.setState({ collect: { seq: 1, payload: { roundIndex: 0 } } });
    });
    await advance(0);
    expect(actions.submitPanel).not.toHaveBeenCalled();

    act(() => {
      useRoomStore.setState({ collect: { seq: 2, payload: { roundIndex: 1 } } });
    });
    await advance(0);
    expect(actions.submitPanel).toHaveBeenCalledWith(1, 'timeout', editor.png);
  });

  it('R40: Concluir com mais da metade do tempo pede confirmação, e então envia done', async () => {
    const { actions } = renderDrawing(drawingView());

    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    const dialog = screen.getByRole('dialog', { name: 'Concluir agora?' });
    expect(actions.submitPanel).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Concluir' }));
    await advance(0);
    expect(actions.submitPanel).toHaveBeenCalledWith(1, 'done', editor.png);
    expect(actions.submitPanel).toHaveBeenCalledTimes(1);
  });

  it('R40: perto do fim, Ctrl+Enter conclui sem perguntar', async () => {
    const { actions } = renderDrawing(drawingView({ deadlineIn: 10_000 }));

    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    await advance(0);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(actions.submitPanel).toHaveBeenCalledWith(1, 'done', editor.png);
  });

  it('R48: com hasDraft, o editor recebe o rascunho como imagem base', async () => {
    useSessionStore.setState({ status: 'ready', token: 'tok' });
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(new Blob([new Uint8Array([1])]), { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => 'blob:rascunho');
    URL.revokeObjectURL = vi.fn();

    renderDrawing(drawingView({ hasDraft: true }));
    await advance(0);

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/rooms/K7PQ2M/my-draft');
    expect(editor.props?.baseImageUrl).toBe('blob:rascunho');
  });

  it('sem hasDraft, nada é buscado', async () => {
    useSessionStore.setState({ status: 'ready', token: 'tok' });
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    renderDrawing(drawingView());
    await advance(0);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(editor.props?.baseImageUrl).toBeUndefined();
  });
});
