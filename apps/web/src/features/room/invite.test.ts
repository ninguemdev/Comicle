import { describe, expect, it, vi } from 'vitest';

import { sanitizeRoomCodeInput } from '../home/room-code-input';
import { copyText, inviteUrl } from './invite';

describe('convite', () => {
  it('R7: link é {origem}{BASE_PATH}/sala/{CODIGO}', () => {
    expect(inviteUrl('https://jogos.exemplo.com', '/', 'K7PQ2M')).toBe(
      'https://jogos.exemplo.com/sala/K7PQ2M',
    );
    expect(inviteUrl('https://exemplo.com', '/jogos/comicle', 'K7PQ2M')).toBe(
      'https://exemplo.com/jogos/comicle/sala/K7PQ2M',
    );
  });

  it('copyText usa a Clipboard API e devolve false quando ela falha', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    expect(await copyText('link', { writeText })).toBe(true);
    expect(writeText).toHaveBeenCalledWith('link');

    const denied = { writeText: () => Promise.reject(new DOMException('negado')) };
    expect(await copyText('link', denied)).toBe(false);
  });
});

describe('campo de código', () => {
  it('R6: maiúsculas, sem espaços e sem caracteres que nunca estão num código', () => {
    expect(sanitizeRoomCodeInput('k7 pq-2m')).toBe('K7PQ2M');
    expect(sanitizeRoomCodeInput('o0i1l k7')).toBe('K7');
  });

  it('para no tamanho do código', () => {
    expect(sanitizeRoomCodeInput('K7PQ2MXYZ')).toBe('K7PQ2M');
  });
});
