# T27 — Tempo de desenho até 10 minutos

**Depende de:** T11 · **Pacotes:** shared, web · **Branch:** `task/27-tempo-desenho-10min`

## Objetivo
Pedido do criador do projeto: o tempo por quadrinho, hoje limitado a 5 minutos, passa a ir até 10 minutos.

## Leia antes
- `docs/regras-do-jogo.md` §1 e R18
- `docs/protocolo-realtime.md` (configurações da sala)

## Entregáveis
- [ ] `DRAWING_SECONDS_OPTIONS` ganha 360, 420, 480, 540 e 600.
- [ ] Seletor de tempo do lobby mostra as novas opções em minutos.
- [ ] Conferir se banco, validação de payload e testes de propriedade aceitam os novos valores.
- [ ] `regras-do-jogo.md` §1, protocolo se citar a lista.

## Critérios de aceite
- [ ] O anfitrião escolhe 10 minutos no lobby e a rodada de desenho dura 10 minutos.
- [ ] Valores fora da lista continuam rejeitados (`INVALID_PAYLOAD`).

## Testes obrigatórios
- [ ] R18: schema aceita 600 e rejeita valores fora da lista.
- [ ] Lobby: opção de 10 minutos visível para o anfitrião.
