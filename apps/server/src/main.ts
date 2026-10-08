import { buildApp } from './app';

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';

const app = buildApp({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

await app.listen({
  port: Number(process.env.PORT ?? DEFAULT_PORT),
  host: process.env.HOST ?? DEFAULT_HOST,
});
