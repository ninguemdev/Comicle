import { z } from 'zod';

// Environment variables from docs/arquitetura.md §6.

const DEFAULT_PORT = 3000;

const booleanFlag = z.enum(['true', 'false']).transform((value) => value === 'true');

const originList = z.string().transform((value, ctx) => {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');
  for (const origin of origins) {
    if (!URL.canParse(origin)) {
      ctx.addIssue({ code: 'custom', message: `origem inválida: "${origin}"` });
    }
  }
  return origins;
});

/** Empty values (`SERVE_WEB_DIST=`) mean "not set". */
const optionalText = z
  .string()
  .optional()
  .transform((value) => (value === undefined || value === '' ? undefined : value));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(0).max(65_535).default(DEFAULT_PORT),
    HOST: z.string().min(1).default('0.0.0.0'),
    DATABASE_URL: z.url().default('postgres://comicle:comicle@localhost:5432/comicle'),
    DATABASE_URL_TEST: z.url().optional(),
    CORS_ORIGINS: originList.default(['http://localhost:5173']),
    PUBLIC_BASE_PATH: z.string().startsWith('/').default('/'),
    SERVE_WEB_DIST: optionalText,
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    TRUST_PROXY: booleanFlag.default(false),
    GAME_TIMING_PROFILE: z.enum(['default', 'fast']).default('default'),
  })
  .refine((env) => !(env.NODE_ENV === 'production' && env.GAME_TIMING_PROFILE === 'fast'), {
    path: ['GAME_TIMING_PROFILE'],
    message: '"fast" não é permitido com NODE_ENV=production',
  });

export type AppConfig = z.output<typeof envSchema>;

export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}

/** Validates the environment; throws a `ConfigError` listing every invalid variable. */
export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(env)'}: ${issue.message}`)
      .join('\n');
    throw new ConfigError(`Configuração inválida:\n${details}`);
  }
  return result.data;
}
