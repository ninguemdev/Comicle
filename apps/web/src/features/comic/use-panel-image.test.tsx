import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from '../../stores/session-store';
import { usePanelImage } from './use-panel-image';

const fetchMock = vi.fn<typeof fetch>();
const createObjectURL = vi.fn(() => 'blob:painel');
const revokeObjectURL = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
  useSessionStore.setState({ status: 'ready', token: 'token-secreto' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  useSessionStore.setState({ status: 'idle', token: null });
});

function pngResponse(status = 200): Response {
  return new Response(status === 200 ? new Blob([new Uint8Array([137, 80])]) : null, { status });
}

describe('usePanelImage', () => {
  it('busca com Authorization (nunca na URL) e devolve uma URL blob:', async () => {
    fetchMock.mockResolvedValue(pngResponse());
    const { result } = renderHook(() => usePanelImage('painel-1'));

    expect(result.current).toEqual({ status: 'loading' });
    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', url: 'blob:painel' });
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    // The token goes only in the header.
    expect(url).toBe('/api/panels/painel-1');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-secreto');
    expect(init?.cache).toBe('no-store');
  });

  it('revoga a URL ao desmontar', async () => {
    fetchMock.mockResolvedValue(pngResponse());
    const { result, unmount } = renderHook(() => usePanelImage('painel-1'));
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:painel');
  });

  it('trocar de quadro revoga a URL anterior e volta a carregar', async () => {
    fetchMock.mockResolvedValue(pngResponse());
    const { result, rerender } = renderHook(({ id }) => usePanelImage(id), {
      initialProps: { id: 'painel-1' },
    });
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    fetchMock.mockReturnValue(new Promise(() => undefined));
    rerender({ id: 'painel-2' });
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:painel');
    expect(result.current).toEqual({ status: 'loading' });
  });

  it('R59: 403 vira erro, sem URL', async () => {
    fetchMock.mockResolvedValue(pngResponse(403));
    const { result } = renderHook(() => usePanelImage('painel-1'));

    await waitFor(() => {
      expect(result.current).toEqual({ status: 'error' });
    });
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('espera a sessão antes de buscar', async () => {
    useSessionStore.setState({ status: 'loading', token: null });
    fetchMock.mockResolvedValue(pngResponse());
    const { result } = renderHook(() => usePanelImage('painel-1'));
    expect(fetchMock).not.toHaveBeenCalled();

    act(() => {
      useSessionStore.setState({ status: 'ready', token: 'token-novo' });
    });
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe(
      'Bearer token-novo',
    );
  });
});
