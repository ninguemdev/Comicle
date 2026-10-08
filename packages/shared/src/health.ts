/** Body of `GET /healthz` (docs/protocolo-realtime.md §1). */
export interface HealthResponse {
  status: 'ok';
}

export const HEALTH_OK = { status: 'ok' } as const satisfies HealthResponse;
