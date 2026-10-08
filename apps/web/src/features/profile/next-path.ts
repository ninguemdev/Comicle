const FALLBACK = '/';

/**
 * Where `/perfil?next=…` returns to. Only paths inside the app: `//host` and absolute URLs
 * would turn the profile screen into an open redirect.
 */
export function safeNextPath(raw: string | null): string {
  if (raw === null || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return FALLBACK;
  }
  return raw;
}
