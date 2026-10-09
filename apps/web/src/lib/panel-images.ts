import { env } from '../config/env';

/** The server refused or could not find the image (403, 404…), or the network failed. */
export class PanelImageError extends Error {
  override readonly name = 'PanelImageError';

  constructor(readonly status: number | null) {
    super(`Imagem do quadro indisponível (${String(status ?? 'rede')})`);
  }
}

/**
 * `GET /api/panels/:panelId` (protocolo §1): authorized by the session token in the
 * `Authorization` header, never in the URL, and never cached (R59).
 */
export async function fetchPanelImage(
  panelId: string,
  token: string,
  signal: AbortSignal,
): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${env.serverUrl}/api/panels/${encodeURIComponent(panelId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
    throw new PanelImageError(null);
  }
  if (!response.ok) {
    throw new PanelImageError(response.status);
  }
  return response.blob();
}
