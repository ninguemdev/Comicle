# T27 — Tempo de desenho até 10 minutos

**Depende de:** T11 · **Pacotes:** shared, web · **Branch:** `task/27-tempo-desenho-10min`

## Objetivo
Pedido do criador do projeto: o tempo por quadrinho, hoje limitado a 5 minutos, passa a ir até 10 minutos.

## Leia antes
- `docs/regras-do-jogo.md` §1 e R18
- `docs/protocolo-realtime.md` (configurações da sala)

## Entregáveis
- [x] `DRAWING_SECONDS_OPTIONS` ganha 360, 420, 480, 540 e 600.
- [x] Seletor de tempo do lobby mostra as novas opções em minutos.
- [x] Conferir se banco, validação de payload e testes de propriedade aceitam os novos valores.
- [x] `regras-do-jogo.md` §1, protocolo se citar a lista.

## Critérios de aceite
- [x] O anfitrião escolhe 10 minutos no lobby e a rodada de desenho dura 10 minutos.
- [x] Valores fora da lista continuam rejeitados (`INVALID_PAYLOAD`).

## Testes obrigatórios
- [x] R18: schema aceita 600 e rejeita valores fora da lista.
- [x] Lobby: opção de 10 minutos visível para o anfitrião.
