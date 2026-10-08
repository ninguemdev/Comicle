/** R7: `{origem}{BASE_PATH}/sala/{CODIGO}`; `basename` is the router's ('/' at the root). */
export function inviteUrl(origin: string, basename: string, code: string): string {
  const basePath = basename === '/' ? '' : basename;
  return `${origin}${basePath}/sala/${code}`;
}

/**
 * Copies with the Clipboard API. `false` when it is refused or missing: on insecure origins
 * `navigator.clipboard` does not exist, and the call throws. The caller then lets the player
 * copy the visible link.
 */
export async function copyText(
  text: string,
  clipboard: Pick<Clipboard, 'writeText'> = navigator.clipboard,
): Promise<boolean> {
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
