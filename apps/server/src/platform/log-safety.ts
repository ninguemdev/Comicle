// What an error may carry into the logs (AGENTS.md, Logs): never tokens, themes, nicknames or
// images. Database errors are the risk: Drizzle puts the query parameters in the message
// ("params: …") and pg puts row values in `detail`. Only the type, the code, the first line of
// the message without parameters and the stack frames are kept.

/** Longest message kept; longer ones are cut. */
const MAX_MESSAGE_LENGTH = 200;
/** Causes followed at most (Drizzle wraps the pg error). */
const MAX_CAUSE_DEPTH = 2;
const PARAMS_MARKER = /\bparams:/i;
const STACK_FRAME = /^\s+at /;

// A type alias (not an interface) so it fits pino's index-signature serializer type.
export type SafeError = {
  type: string;
  message: string;
  stack: string;
  code?: string;
  cause?: SafeError;
};

function safeMessage(message: string): string {
  const firstLine = message.split('\n')[0] ?? '';
  const withoutParams = firstLine.split(PARAMS_MARKER)[0] ?? '';
  return withoutParams.trim().slice(0, MAX_MESSAGE_LENGTH);
}

function codeOf(error: Error): string | undefined {
  const code: unknown = Reflect.get(error, 'code');
  return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
}

/** Pino serializer for `err`: see the file comment. */
export function serializeError(error: unknown, depth = 0): SafeError {
  if (!(error instanceof Error)) {
    return { type: typeof error, message: '', stack: '' };
  }
  const message = safeMessage(error.message);
  const frames = (error.stack ?? '').split('\n').filter((line) => STACK_FRAME.test(line));
  const serialized: SafeError = {
    type: error.name,
    message,
    stack: [`${error.name}: ${message}`, ...frames].join('\n'),
  };
  const code = codeOf(error);
  if (code !== undefined) {
    serialized.code = code;
  }
  if (error.cause !== undefined && depth < MAX_CAUSE_DEPTH) {
    serialized.cause = serializeError(error.cause, depth + 1);
  }
  return serialized;
}
