# Registro de decisões

Decisões de arquitetura e de produto que não estão explícitas na especificação. Cada entrada: contexto curto, decisão e consequência. Para mudar uma decisão, adicione uma nova entrada que a substitui (não apague a antiga).

---

**D1 — Monorepo pnpm sem orquestrador.** `apps/web`, `apps/server`, `packages/shared` com pnpm workspaces e scripts `pnpm -r`. Turborepo/Nx não compensam em três pacotes. *Consequência:* builds sequenciais simples; `@comicle/shared` exporta TypeScript puro, consumido pelo Vite e empacotado no servidor pelo tsdown.

**D2 — Instância única e estado vivo em memória.** A especificação pede baixa complexidade operacional. Um processo Node é a autoridade de todas as salas; não há Redis nem adaptador do Socket.IO. *Consequência:* escala vertical apenas; suficiente para o público de grupos de amigos. Escalar exigirá uma nova decisão.

**D3 — PostgreSQL guarda o conteúdo, não o estado vivo.** Temas e quadros (PNG em `bytea`) vão para o banco ao final de cada fase; sessões, presença, fases e prazos ficam em memória. Reinício do servidor encerra as salas e a inicialização limpa o conteúdo órfão (R17). *Consequência:* memória estável mesmo com muitos quadros, imagens servidas por HTTP com autorização, limpeza simples por cascata. Restaurar partidas após reinício fica para o futuro.

**D4 — Desenhos como PNG rasterizado de 1024×768.** O cliente mantém traços para desfazer/refazer, mas envia PNG. Vetores dariam mais trabalho (renderização igual em todo lugar, tamanho com muitos traços) sem ganho para a experiência. PNG em vez de WebP porque o Safari não codifica WebP no canvas. *Consequência:* resolução fixa; tamanho limitado a 2 MiB.

**D5 — Quadros com proporção única 4:3.** Simplifica o editor e a composição. Linhas incompletas da página ficam centralizadas em vez de esticar quadros (interpretação da seção 7.1 da especificação, que pede para não distorcer os desenhos).

**D6 — Sincronização por estado projetado.** O servidor envia a `PlayerView` inteira após cada mudança, em vez de eventos incrementais. Payload pequeno (≤ 12 membros) e elimina toda uma classe de bugs de dessincronização; reconexão vira "receber a view de novo".

**D7 — Leitura sincronizada com prazo próprio.** A especificação pede tempo de desenho igual para todos e que ninguém ganhe tempo ficando na leitura. Decisão: a leitura tem prazo (R35); o desenho começa ao mesmo tempo para todos quando todos confirmam ou o prazo acaba (R37). Quem confirma cedo espera sem ver os quadros — o que reforça o elemento de memória.

**D8 — Rodada 1 sem leitura e autor desenha o último quadro.** A rotação começa no vizinho (R31). Com quantidade baseada nos jogadores, cada um contribui uma vez para cada história e o autor fecha a própria história — ele vê, na apresentação, o que fizeram com sua ideia.

**D9 — Temas reserva.** Para nunca travar a partida, quem não escreve recebe um tema sorteado de uma lista em pt-BR (R30).

**D10 — Encerramento antecipado.** Temas e desenho terminam cedo quando todos concluíram; a leitura termina cedo quando todos os conectados confirmaram (R29, R37, R41). Esperar desconectados na leitura só atrasaria todos; no desenho, eles podem voltar.

**D11 — Abortar partida.** Não está na especificação, mas sem isso uma partida longa com jogadores que saíram não teria saída além de esperar todas as rodadas. Ação exclusiva do anfitrião com confirmação (R57).

**D12 — Espectadores.** Quem entra durante a partida acompanha como espectador e vê a apresentação (R10). Mantém o grupo junto sem alterar a distribuição.

**D13 — Sessões opacas emitidas pelo servidor.** Token aleatório guardado só como hash, em memória (R3). Sem JWT: não há necessidade de validação sem estado e o token precisa ser revogável junto com a sala.

**D14 — Imagens por HTTP autenticado, não pelo socket.** Separar o transporte de imagens permite autorização por quadro (`PanelAccessPolicy`), `no-store` e carregamento paralelo, sem inflar a `PlayerView`.

**D15 — Identificadores em inglês, interface e documentação em pt-BR.** Código e nomes técnicos em inglês (padrão do ecossistema); textos de interface centralizados em `strings/pt-BR.ts` para facilitar tradução futura; documentação e mensagens de commit em português.

**D16 — TypeScript 6.0 em vez do 7.** Na T01 a versão estável mais recente era o TypeScript 7 (compilador nativo), mas o `typescript-eslint` — necessário para as regras type-checked — só aceita `typescript < 6.1`. Decisão: travar `typescript@~6.0`. *Consequência:* lint type-checked funcionando; migrar para o 7 quando o `typescript-eslint` suportá-lo, em PR próprio.

**D17 — Nome do jogo: Comicle.** Substitui o nome provisório "HQ Coletiva". Como o projeto ainda estava na T01, os identificadores derivados do nome também mudaram: pacotes `@comicle/*`, chaves `comicle.session` e `comicle.profile` no `localStorage`, usuário e bancos `comicle`/`comicle_test` no Postgres. *Consequência:* "HQ" continua aparecendo só no sentido de história em quadrinhos (ex.: página de HQ).

**D18 — Interface `Rng` no pacote compartilhado.** `randomAvatar(rng)` vive em `@comicle/shared`, que não pode importar o servidor, então a interface `Rng { nextInt(maxExclusive) }` fica em `packages/shared/src/random.ts`. *Consequência:* o `Rng` com `crypto` e o `SeededRng` do servidor (T03) implementam essa interface, e o cliente pode passar o próprio gerador ao sortear o avatar da primeira visita (T07).
