import { env } from '../config/env';
import { PanelImageError } from './panel-images';

const HTTP_NO_CONTENT = 204;

/**
 * R48, R66: `GET /api/rooms/:code/my-draft?panelIndex=k`, the player's latest autosave of panel
 * `k` of the round being drawn, or `null` when there is none (204). The token goes in the header, never in the URL.
 */
export async function fetchMyDraft(
  roomCode: string,
  panelIndex: number,
  token: string,
  signal: AbortSignal,
): Promise<Blob | null> {
  let response: Response;
  try {
    const path = `/api/rooms/${encodeURIComponent(roomCode)}/my-draft?panelIndex=${String(panelIndex)}`;
    response = await fetch(`${env.serverUrl}${path}`, {
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
  if (response.status === HTTP_NO_CONTENT) {
    return null;
  }
  if (!response.ok) {
    throw new PanelImageError(response.status);
  }
  return response.blob();
}
