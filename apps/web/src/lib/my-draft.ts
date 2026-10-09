import { env } from '../config/env';
import { PanelImageError } from './panel-images';

const HTTP_NO_CONTENT = 204;

/**
 * R48: `GET /api/rooms/:code/my-draft`, the player's latest autosave of the round being drawn,
 * or `null` when there is none (204). The token goes in the header, never in the URL.
 */
export async function fetchMyDraft(
  roomCode: string,
  token: string,
  signal: AbortSignal,
): Promise<Blob | null> {
  let response: Response;
  try {
    response = await fetch(`${env.serverUrl}/api/rooms/${encodeURIComponent(roomCode)}/my-draft`, {
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
