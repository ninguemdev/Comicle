import { errorResponseSchema, fail, ok, type Ack } from '@comicle/shared';
import type { z } from 'zod';

import { errorMessages, strings } from '../strings/pt-BR';

export interface HttpRequest<T> {
  method?: 'GET' | 'POST';
  /** Absolute path, such as `/api/guest-sessions`. */
  path: string;
  /** Sent as `Authorization: Bearer` (protocolo §1); never in the URL. */
  token?: string;
  /** Validates the success body. */
  schema: z.ZodType<T>;
}

/** Resolves every request to the same `Ack` envelope as the socket, never rejecting. */
export type HttpClient = <T>(request: HttpRequest<T>) => Promise<Ack<T>>;

export interface HttpClientOptions {
  /** '' = same origin. */
  baseUrl: string;
  fetch?: typeof fetch;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function createHttpClient({
  baseUrl,
  fetch: fetchFn = (input, init) => fetch(input, init),
}: HttpClientOptions): HttpClient {
  return async ({ method = 'GET', path, token, schema }) => {
    let response: Response;
    try {
      response = await fetchFn(`${baseUrl}${path}`, {
        method,
        headers: token === undefined ? {} : { Authorization: `Bearer ${token}` },
      });
    } catch {
      return fail('INTERNAL', strings.connection.serverUnreachable);
    }

    const body = await readJson(response);
    if (response.ok) {
      const parsed = schema.safeParse(body);
      return parsed.success ? ok(parsed.data) : fail('INTERNAL', errorMessages.INTERNAL);
    }
    const error = errorResponseSchema.safeParse(body);
    return error.success
      ? fail(error.data.error.code, error.data.error.message)
      : fail('INTERNAL', errorMessages.INTERNAL);
  };
}
