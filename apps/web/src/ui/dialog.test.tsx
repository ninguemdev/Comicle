import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { Button } from './button';
import { Dialog } from './dialog';

/** Test harness: labels are test data, not interface text. */
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        {'abrir'}
      </Button>
      <Dialog
        open={open}
        title={'Sair da sala?'}
        onClose={() => {
          setOpen(false);
        }}
        actions={
          <>
            <Button variant="secondary">{'cancelar'}</Button>
            <Button>{'confirmar'}</Button>
          </>
        }
      >
        <p>{'corpo'}</p>
      </Dialog>
    </>
  );
}

function openDialog() {
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'abrir' });
  trigger.focus();
  fireEvent.click(trigger);
  return { trigger, dialog: screen.getByRole('dialog', { name: 'Sair da sala?' }) };
}

describe('Dialog', () => {
  it('abre com o foco dentro do diálogo', () => {
    const { dialog } = openDialog();

    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('prende o foco: Tab no último volta ao primeiro e Shift+Tab no primeiro vai ao último', () => {
    const { dialog } = openDialog();
    const close = screen.getByRole('button', { name: 'Fechar' });
    const confirm = screen.getByRole('button', { name: 'confirmar' });

    confirm.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirm);
  });

  it('Esc fecha e o foco volta ao gatilho', () => {
    const { trigger, dialog } = openDialog();

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('o botão Fechar também devolve o foco ao gatilho', () => {
    const { trigger } = openDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
