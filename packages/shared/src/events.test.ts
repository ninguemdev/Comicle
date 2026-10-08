import { describe, expect, it } from 'vitest';

import { fail, ok } from './ack';
import { isErrorCode } from './errors';
import { clientEventSchemas } from './events';

const profile = {
  nickname: ' Ana ',
  avatar: {
    head: 'head-round',
    eyes: 'eyes-dots',
    mouth: 'mouth-smile',
    cheeks: null,
    hat: null,
    faceAccessory: null,
  },
};

describe('clientEventSchemas', () => {
  it('tem um schema para cada evento de docs/protocolo-realtime.md §3', () => {
    expect(Object.keys(clientEventSchemas).sort()).toEqual(
      [
        'time:sync',
        'room:create',
        'room:join',
        'room:leave',
        'room:kick',
        'room:updateSettings',
        'player:updateProfile',
        'match:start',
        'match:abort',
        'theme:draft',
        'theme:submit',
        'round:ready',
        'panel:autosave',
        'panel:submit',
        'presentation:navigate',
        'presentation:end',
      ].sort(),
    );
  });

  it('R6: room:join normaliza o código e o nickname', () => {
    expect(clientEventSchemas['room:join'].parse({ roomCode: ' k7pq2m ', profile })).toEqual({
      roomCode: 'K7PQ2M',
      profile: { ...profile, nickname: 'Ana' },
    });
  });

  it('panel:submit aceita bytes ou null e recusa outros formatos', () => {
    const schema = clientEventSchemas['panel:submit'];
    const base = { roundIndex: 0, reason: 'done' };

    expect(schema.safeParse({ ...base, png: new Uint8Array([1, 2]) }).success).toBe(true);
    expect(schema.safeParse({ ...base, reason: 'timeout', png: null }).success).toBe(true);
    expect(schema.safeParse({ ...base, png: [1, 2] }).success).toBe(false);
    expect(schema.safeParse({ ...base, reason: 'later', png: null }).success).toBe(false);
    expect(schema.safeParse({ ...base, roundIndex: -1, png: null }).success).toBe(false);
  });

  it('presentation:navigate exige storyIndex só em goToStory', () => {
    const schema = clientEventSchemas['presentation:navigate'];

    expect(schema.safeParse({ action: 'next' }).success).toBe(true);
    expect(schema.safeParse({ action: 'goToStory', storyIndex: 2 }).success).toBe(true);
    expect(schema.safeParse({ action: 'goToStory' }).success).toBe(false);
    expect(schema.safeParse({ action: 'jump' }).success).toBe(false);
  });

  it('eventos sem payload aceitam objeto vazio', () => {
    expect(clientEventSchemas['match:start'].parse({})).toEqual({});
  });
});

describe('ack', () => {
  it('ok e fail montam o envelope do protocolo', () => {
    expect(ok({ roomCode: 'K7PQ2M' })).toEqual({ ok: true, data: { roomCode: 'K7PQ2M' } });
    expect(fail('NOT_HOST', 'Só o anfitrião pode fazer isso.')).toEqual({
      ok: false,
      error: { code: 'NOT_HOST', message: 'Só o anfitrião pode fazer isso.' },
    });
  });

  it('isErrorCode reconhece só os códigos do protocolo', () => {
    expect(isErrorCode('ROOM_FULL')).toBe(true);
    expect(isErrorCode('room_full')).toBe(false);
    expect(isErrorCode(404)).toBe(false);
  });
});
