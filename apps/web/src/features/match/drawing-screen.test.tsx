import {
  AUTOSAVE_INTERVAL_MS,
  defaultAvatar,
  fail,
  ok,
  type PanelRef,
  type PlayerView,
} from '@comicle/shared';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRoomStore } from '../../stores/room-store';
import { useSessionStore } from '../../stores/session-store';
import { matchView, setUpStores } from '../../test/room-fixtures';
import type { DrawingEditorProps } from '../drawing/drawing-editor';
import { DrawingScreen } from './drawing-screen';
import { MatchScreen } from './match-screen';

// The real editor needs a 2D canvas; this one records its props and hands back a fixed PNG.
const editor = vi.hoisted(() => ({
  props: null as DrawingEditorProps | null,
  png: new Uint8Array([137, 80, 78, 71]),
}));
vi.mock('../drawing/drawing-editor', () => ({
  DrawingEditor: (props: DrawingEditorProps) => {
    editor.props = props;
    return null;
  },
}));
vi.mock('../drawing/engine/export', () => ({
  exportPng: () => Promise.resolve(editor.png),
}));
vi.mock('../drawing/load-image', () => ({
  loadImage: () => Promise.resolve(new Image()),
}));

const NOW = 1_000_000;
const DRAWING_MS = 90_000;

function drawingView({
  draftPanels = [] as number[],
  deadlineIn = DRAWING_MS,
  previousPanels = [] as PanelRef[],
  panelCount = 1,
} = {}): PlayerView {
  const view = matchView({
    phase: 'round_drawing',
    roundIndex: 1,
    phaseDeadlineAt: NOW + deadlineIn,
    task: {
      kind: 'draw_panel',
      status: 'drawing',
      theme: 'Um gato',
      panelPosition: 1,
      panelCount,
      draftPanels,
      deadlineAt: NOW + deadlineIn,
      previousPanels,
    },
  });
  // R62: several panels per round only happen in the individual mode.
  const mode = panelCount > 1 ? 'individual' : 'collaborative';
  return { ...view, room: { ...view.room, settings: { ...view.room.settings, mode } } };
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
      previousPanels={match.task.kind === 'draw_panel' ? match.task.previousPanels : []}
      deadlineAt={match.task.kind === 'draw_panel' ? match.task.deadlineAt : null}
      panelCount={match.task.kind === 'draw_panel' ? match.task.panelCount : 1}
      draftPanels={match.task.kind === 'draw_panel' ? match.task.draftPanels : []}
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

/** The player draws on the panel in the editor: its document changes. */
function change(): void {
  act(() => {
    const document = editor.props?.document;
    document?.setBaseImage(null);
    editor.props?.onChange(document?.revision ?? 0);
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

    change();
    change();
    await advance(AUTOSAVE_INTERVAL_MS);
    expect(actions.autosavePanel).toHaveBeenCalledTimes(1);
    expect(actions.autosavePanel).toHaveBeenCalledWith(1, 0, editor.png);

    await advance(AUTOSAVE_INTERVAL_MS * 2);
    expect(actions.autosavePanel).toHaveBeenCalledTimes(1);
    change();
    await advance(AUTOSAVE_INTERVAL_MS);
    expect(actions.autosavePanel).toHaveBeenCalledTimes(2);
  });

  it('R42: timer local zerado envia timeout uma única vez; round:collect depois não reenvia', async () => {
    const { actions, onSent } = renderDrawing(drawingView({ deadlineIn: 3000 }));

    await advance(2999);
    expect(actions.submitPanel).not.toHaveBeenCalled();
    await advance(1);
    expect(actions.submitPanel).toHaveBeenCalledTimes(1);
    expect(actions.submitPanel).toHaveBeenCalledWith(1, 0, 'timeout', editor.png);
    expect(onSent).toHaveBeenCalledWith(1);
    expect(editor.props?.disabled).toBe(true);

    act(() => {
      useRoomStore.setState({ collect: { seq: 99, payload: { roundIndex: 1 } } });
    });
    await advance(1000);
    expect(actions.submitPanel).toHaveBeenCalledTimes(1);
  });

  it('R36, R38: quem confirmou a leitura desenha com o prazo do desenho, não o da leitura', async () => {
    const view = matchView({
      phase: 'round_reading',
      roundIndex: 1,
      phaseDeadlineAt: NOW + 5000,
      task: {
        kind: 'draw_panel',
        status: 'drawing',
        theme: 'Um gato',
        panelPosition: 1,
        panelCount: 1,
        draftPanels: [],
        deadlineAt: NOW + 5000 + DRAWING_MS,
        previousPanels: [],
      },
    });
    const actions = setUpStores(view);
    useRoomStore.setState({ clockOffsetMs: 0 });
    render(<MatchScreen view={view} match={view.match ?? never()} />);

    expect(screen.getByRole('button', { name: 'Concluir' })).toBeTruthy();
    expect(editor.props?.disabled).toBe(false);
    await advance(5000 + DRAWING_MS - 1);
    expect(actions.submitPanel).not.toHaveBeenCalled();
    await advance(1);
    expect(actions.submitPanel).toHaveBeenCalledWith(1, 0, 'timeout', editor.png);
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
    expect(actions.submitPanel).toHaveBeenCalledWith(1, 0, 'timeout', editor.png);
  });

  it('R40: Concluir com mais da metade do tempo pede confirmação, e então envia done', async () => {
    const { actions } = renderDrawing(drawingView());

    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    const dialog = screen.getByRole('dialog', { name: 'Concluir agora?' });
    expect(actions.submitPanel).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Concluir' }));
    await advance(0);
    expect(actions.submitPanel).toHaveBeenCalledWith(1, 0, 'done', editor.png);
    expect(actions.submitPanel).toHaveBeenCalledTimes(1);
  });

  it('R40: perto do fim, Ctrl+Enter conclui sem perguntar', async () => {
    const { actions } = renderDrawing(drawingView({ deadlineIn: 10_000 }));

    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    await advance(0);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(actions.submitPanel).toHaveBeenCalledWith(1, 0, 'done', editor.png);
  });

  it('R48: com rascunho, o documento do quadro recebe a imagem base, sem novo autosave', async () => {
    useSessionStore.setState({ status: 'ready', token: 'tok' });
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(new Blob([new Uint8Array([1])]), { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => 'blob:rascunho');
    URL.revokeObjectURL = vi.fn();

    const { actions } = renderDrawing(drawingView({ draftPanels: [0] }));
    await advance(0);

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/rooms/K7PQ2M/my-draft?panelIndex=0');
    expect(editor.props?.document?.baseImage).toBeInstanceOf(HTMLImageElement);
    await advance(AUTOSAVE_INTERVAL_MS);
    expect(actions.autosavePanel).not.toHaveBeenCalled();
  });

  it('T18: quadro que caiu sem conexão é reenviado quando o jogador volta à sala', async () => {
    const { actions, onSent } = renderDrawing(drawingView({ deadlineIn: 3000 }));
    act(() => {
      useRoomStore.setState({ connection: 'reconnecting' });
    });
    actions.submitPanel.mockResolvedValueOnce(fail('INTERNAL', 'Sem conexão com o servidor.'));

    await advance(3000);
    expect(actions.submitPanel).toHaveBeenCalledTimes(1);
    expect(onSent).not.toHaveBeenCalled();

    // Connected again, but not back in the room yet: nothing goes.
    act(() => {
      useRoomStore.setState({ connection: 'connected' });
    });
    await advance(0);
    expect(actions.submitPanel).toHaveBeenCalledTimes(1);

    act(() => {
      useRoomStore.setState((state) => ({ joins: state.joins + 1 }));
    });
    await advance(0);
    expect(actions.submitPanel).toHaveBeenCalledTimes(2);
    expect(actions.submitPanel).toHaveBeenLastCalledWith(1, 0, 'timeout', editor.png);
    expect(onSent).toHaveBeenCalledWith(1);
  });

  it('T18: reenviado e recusado (já recebido ou fora do prazo) conta como entregue', async () => {
    const { actions, onSent } = renderDrawing(drawingView({ deadlineIn: 10_000 }));
    act(() => {
      useRoomStore.setState({ connection: 'reconnecting' });
    });
    actions.submitPanel.mockResolvedValueOnce(fail('INTERNAL', 'Sem conexão com o servidor.'));
    act(() => {
      useRoomStore.setState({ connection: 'connected' });
    });
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    act(() => {
      useRoomStore.setState({ connection: 'reconnecting' });
    });
    await advance(0);
    expect(onSent).not.toHaveBeenCalled();

    actions.submitPanel.mockResolvedValueOnce(fail('INVALID_STATE', 'Você já concluiu.'));
    act(() => {
      useRoomStore.setState((state) => ({ connection: 'connected', joins: state.joins + 1 }));
    });
    await advance(0);
    expect(actions.submitPanel).toHaveBeenNthCalledWith(1, 1, 0, 'done', editor.png);
    expect(actions.submitPanel).toHaveBeenNthCalledWith(2, 1, 0, 'done', editor.png);
    expect(onSent).toHaveBeenCalledWith(1);
  });

  it('T18: sem conexão, Concluir fica desabilitado e o editor segue desenhando', () => {
    renderDrawing(drawingView());
    act(() => {
      useRoomStore.setState({ connection: 'reconnecting' });
    });

    expect(screen.getByRole('button', { name: 'Concluir' })).toHaveProperty('disabled', true);
    expect(editor.props?.disabled).toBe(false);
  });

  it('R39, T18: autosave que falhou é tentado de novo no próximo intervalo', async () => {
    const { actions } = renderDrawing(drawingView());
    actions.autosavePanel.mockResolvedValueOnce(fail('INTERNAL', 'Sem conexão com o servidor.'));
    actions.autosavePanel.mockResolvedValue(ok({}));

    change();
    await advance(AUTOSAVE_INTERVAL_MS);
    await advance(AUTOSAVE_INTERVAL_MS);
    expect(actions.autosavePanel).toHaveBeenCalledTimes(2);

    await advance(AUTOSAVE_INTERVAL_MS);
    expect(actions.autosavePanel).toHaveBeenCalledTimes(2);
  });

  it('R38: com quadros anteriores, mostra as miniaturas numeradas ao lado do editor', () => {
    const panel = (position: number, nickname: string): PanelRef => ({
      panelId: `panel-${String(position)}`,
      position,
      artist: { playerId: nickname, nickname, avatar: defaultAvatar() },
      status: position === 1 ? 'empty' : 'complete',
    });
    renderDrawing(drawingView({ previousPanels: [panel(0, 'Bia'), panel(1, 'Caio')] }));

    const strip = screen.getByRole('list', { name: 'Quadros anteriores' });
    expect(
      within(strip)
        .getAllByRole('img')
        .map((image) => image.getAttribute('aria-label')),
    ).toEqual(['Quadro 1 de Bia', 'Quadro 2 de Caio']);
  });

  it('R38: clicar numa miniatura abre o quadro grande; Esc fecha e volta ao editor', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {
          // jsdom has no layout to observe
        }
        disconnect(): void {
          // nothing to stop
        }
      },
    );
    const panel: PanelRef = {
      panelId: 'panel-0',
      position: 0,
      artist: { playerId: 'bia', nickname: 'Bia', avatar: defaultAvatar() },
      status: 'empty',
    };
    renderDrawing(drawingView({ previousPanels: [panel] }));

    const thumbnail = screen.getByRole('button', { name: 'Ampliar o quadro 1 de Bia' });
    fireEvent.click(thumbnail);
    const dialog = screen.getByRole('dialog', { name: 'Quadro 1 de Bia' });
    expect(within(dialog).getByRole('img', { name: 'Quadro 1 de Bia' })).toBeTruthy();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(editor.props?.disabled).toBe(false);
  });

  it('R36: sem quadros anteriores (opção desligada), nenhuma miniatura', () => {
    renderDrawing(drawingView());

    expect(screen.queryByRole('list', { name: 'Quadros anteriores' })).toBeNull();
  });

  it('sem rascunho, nada é buscado', async () => {
    useSessionStore.setState({ status: 'ready', token: 'tok' });
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    renderDrawing(drawingView());
    await advance(0);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(editor.props?.document?.baseImage).toBeNull();
  });
});

describe('tela de desenho da história completa (modo individual)', () => {
  const STORY = 3;

  function panelButton(number: number) {
    return screen.getByRole('button', { name: `Quadro ${String(number)} de ${String(STORY)}` });
  }

  it('R65: a faixa numera os quadros e cada um guarda o próprio desenho', () => {
    renderDrawing(drawingView({ panelCount: STORY }));

    expect(screen.getByText('História 2 de 3')).toBeInstanceOf(HTMLElement);
    expect(panelButton(1).getAttribute('aria-current')).toBe('step');
    const first = editor.props?.document;
    change();

    fireEvent.click(panelButton(3));
    expect(panelButton(3).getAttribute('aria-current')).toBe('step');
    const third = editor.props?.document;
    expect(third).not.toBe(first);
    expect(third?.revision).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'Quadro anterior' }));
    fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true });
    expect(editor.props?.document).toBe(first);
    expect(first?.revision).toBe(1);
    expect(screen.getByRole('button', { name: 'Quadro anterior' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('R66: Enviar história entrega cada quadro uma vez, em ordem', async () => {
    const { actions, onSent } = renderDrawing(
      drawingView({ panelCount: STORY, deadlineIn: 10_000 }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enviar história' }));
    await advance(0);

    expect(actions.submitPanel.mock.calls.map((call) => call.slice(0, 3))).toEqual([
      [1, 0, 'done'],
      [1, 1, 'done'],
      [1, 2, 'done'],
    ]);
    expect(onSent).toHaveBeenCalledTimes(1);
  });

  it('R66: com mais da metade do tempo, pede confirmação para enviar a história (metade do tempo da história)', () => {
    renderDrawing(drawingView({ panelCount: STORY, deadlineIn: 200_000 }));

    fireEvent.click(screen.getByRole('button', { name: 'Enviar história' }));
    expect(screen.getByRole('dialog', { name: 'Enviar a história agora?' })).toBeTruthy();
  });

  it('R42, R66: no fim do tempo, todos os quadros vão como timeout', async () => {
    const { actions, onSent } = renderDrawing(drawingView({ panelCount: STORY, deadlineIn: 3000 }));

    await advance(3000);
    expect(actions.submitPanel.mock.calls.map((call) => call.slice(0, 3))).toEqual([
      [1, 0, 'timeout'],
      [1, 1, 'timeout'],
      [1, 2, 'timeout'],
    ]);
    expect(onSent).toHaveBeenCalledWith(1);
  });

  it('T18, R66: quadro perdido na queda é reenviado na volta, sem repetir os já entregues', async () => {
    const { actions, onSent } = renderDrawing(
      drawingView({ panelCount: STORY, deadlineIn: 10_000 }),
    );
    actions.submitPanel.mockResolvedValueOnce(ok({})).mockImplementationOnce(() => {
      useRoomStore.setState({ connection: 'reconnecting' });
      return Promise.resolve(fail('INTERNAL', 'Sem conexão com o servidor.'));
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar história' }));
    await advance(0);
    expect(actions.submitPanel).toHaveBeenCalledTimes(2);
    expect(onSent).not.toHaveBeenCalled();

    act(() => {
      useRoomStore.setState((state) => ({ connection: 'connected', joins: state.joins + 1 }));
    });
    await advance(0);
    expect(actions.submitPanel.mock.calls.map((call) => call[1])).toEqual([0, 1, 1, 2]);
    expect(onSent).toHaveBeenCalledWith(1);
  });

  it('R39, R66: o autosave reveza os quadros que mudaram, um por intervalo', async () => {
    const { actions } = renderDrawing(drawingView({ panelCount: STORY }));

    change();
    fireEvent.click(panelButton(3));
    change();
    await advance(AUTOSAVE_INTERVAL_MS);
    await advance(AUTOSAVE_INTERVAL_MS);
    await advance(AUTOSAVE_INTERVAL_MS);

    expect(actions.autosavePanel.mock.calls.map((call) => call[1])).toEqual([0, 2]);
  });

  it('R48, R66: na volta, cada quadro com rascunho recebe o seu', async () => {
    useSessionStore.setState({ status: 'ready', token: 'tok' });
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(new Blob([new Uint8Array([1])]), { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => 'blob:rascunho');
    URL.revokeObjectURL = vi.fn();

    renderDrawing(drawingView({ panelCount: STORY, draftPanels: [0, 2] }));
    await advance(0);

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      '/api/rooms/K7PQ2M/my-draft?panelIndex=0',
      '/api/rooms/K7PQ2M/my-draft?panelIndex=2',
    ]);
    expect(editor.props?.document?.baseImage).toBeInstanceOf(HTMLImageElement);
    fireEvent.click(panelButton(2));
    expect(editor.props?.document?.baseImage).toBeNull();
    fireEvent.click(panelButton(3));
    expect(editor.props?.document?.baseImage).toBeInstanceOf(HTMLImageElement);
  });
});

function never(): never {
  throw new Error('view sem partida');
}
