import type { ErrorCode } from '@comicle/shared';

/** Expected business failure; its code and pt-BR message reach the client as is. */
export class DomainError extends Error {
  override readonly name = 'DomainError';

  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}
