# Interface e experiência

Complementa as seções 7, 8, 11 e 13 da [especificação](./especificacao-produto.md). Todos os textos da interface ficam em `apps/web/src/strings/pt-BR.ts`; componentes nunca têm texto literal.

---

## 1. Identidade visual

Direção: **página de gibi**. Papel levemente creme, traço de nanquim preto grosso, retícula sutil no fundo, cores primárias chapadas, sombras "duras" deslocadas. Divertido, legível e leve — sem excesso de ornamento que dispute com os desenhos dos jogadores.

Tokens (Tailwind 4, `@theme` em `apps/web/src/styles/theme.css`):

| Token | Valor | Uso |
|---|---|---|
| `--color-paper` | `#FFFBF0` | fundo da aplicação e das páginas de HQ |
| `--color-ink` | `#16161D` | texto, bordas, sombras |
| `--color-muted` | `#5B5B66` | texto secundário |
| `--color-pop-yellow` | `#FFD23F` | ação principal, destaques |
| `--color-pop-red` | `#EF476F` | alerta, tempo acabando, ações destrutivas |
| `--color-pop-blue` | `#118AB2` | links, seleção |
| `--color-pop-green` | `#06D6A0` | concluído, pronto |
| `--color-night` | `#16161D` | nunca inverte: texto sobre as cores pop e fundo dos diálogos, nos dois temas |
| `--font-display` | Bangers | títulos, botões principais, contagem regressiva |
| `--font-body` | Nunito (variável) | todo o resto |
| `--border-ink` | 3px sólida `ink` | cartões, botões, quadros |
| `--shadow-pop` | `4px 4px 0 var(--color-ink)` | botões e cartões (pressionado: `1px 1px`) |
| `--gutter-comic` | 12px (mobile) / 16px | espaço entre quadros |

Componentes base em `apps/web/src/ui/`: `Button` (primary, secondary, danger, ghost), `Card`, `Dialog` (com foco preso e `Esc`), `Timer`, `ProgressPill` ("3/5 prontos"), `SpeechBubble` (mensagens de estado), `PlayerChip` (avatar + nickname + estado), `Toast`, `ConnectionBanner` (faixa "Reconectando…") e `Logo`. Em desenvolvimento, a rota `/dev/ui` mostra todos eles; ela não entra no build de produção.

A paleta do Tailwind fica restrita a esses tokens (`--color-*: initial` no `theme.css`): cor nova entra primeiro nesta tabela ([D19](./decisoes.md)). Texto sobre qualquer cor pop (botão primário e `danger`, selos, faixas) é `night`, nos dois temas, porque texto claro sobre `pop-yellow` ou `pop-red` não atinge contraste AA.

### Modo escuro

O seletor **Aparência** (Sistema, Claro, Escuro), na tela inicial e na personalização, vale para o navegador (`comicle.theme`). Com **Sistema**, o tema segue `prefers-color-scheme` só por CSS, sem script (a CSP não permite script inline) e sem piscar; uma escolha manual vira `data-theme` no `<html>`. No escuro, só três tokens trocam:

| Token | Claro | Escuro |
|---|---|---|
| `--color-paper` | `#FFFBF0` | `#1B1B24` |
| `--color-ink` | `#16161D` | `#F3EEE2` |
| `--color-muted` | `#5B5B66` | `#A9A9B6` |

Bordas, sombras duras e retícula seguem o `ink`, então ficam claras sobre o fundo escuro. As cores pop, a paleta do editor, o **quadro de desenho** (o canvas pinta o próprio fundo branco) e os desenhos (PNG de fundo branco) não mudam; a página de HQ fica com moldura escura e os quadros com o branco deles.

Animações curtas (≤ 250 ms) e desligadas com `prefers-reduced-motion`. A revelação de quadros na apresentação usa um "pop" leve (escala 0.96 → 1).

---

## 2. Telas

| Tela | Rota / condição | Conteúdo essencial |
|---|---|---|
| Início | `/` | Logo, avatar + nickname atuais (botão editar), **Criar sala** (sem perfil salvo, leva antes à personalização), **Entrar em sala** (campo de código normalizado ao digitar: maiúsculas e só caracteres do alfabeto, R6), **Aparência** e **Som** (botão **Silenciar** e barra **Volume** de 0 a 100 %, com prévia; [sons](./sons.md#4-volume)) |
| Personalização | `/perfil` (ou modal ao entrar pelo convite sem perfil) | Prévia grande do avatar, abas por categoria com miniaturas, campo de nickname, botão aleatório, salvar |
| Lobby | `/sala/:code`, `room.status = 'lobby'` | Código, link do convite visível e botão **Copiar convite**; grade de `PlayerChip`; painel de configurações (editável só pelo anfitrião, leitura para os demais; inclui as caixas **O autor desenha o último quadro**, ligada por padrão, e **Mostrar quadros anteriores ao desenhar**, desligada por padrão; a dica de "Baseada nos jogadores" vira "um quadro por jogador, menos o autor" com a primeira desligada); **Iniciar** destacado só para o anfitrião e desabilitado com motivo ("Precisa de pelo menos 2 jogadores") |
| Temas | `task.kind = 'write_theme'` | Campo grande, contador de caracteres, exemplos rotativos de inspiração, timer, **Pronto** |
| Leitura | `task.kind = 'read_story'`, `status = 'reading'` | Tema no topo, `ComicPage` com os quadros anteriores, aviso "Depois de começar, você não verá estes quadros de novo", botão **Começar a desenhar**, timer de leitura |
| Desenho | `task.kind = 'draw_panel'`, `status = 'drawing'` (também na `round_reading`, para quem já confirmou, R38) | Canvas ocupando o máximo de espaço, barra de ferramentas compacta, timer do `deadlineAt` da tarefa, "Quadro 3 de 5", tema em uma linha recolhível. Com `previousPanels` (opção **Mostrar quadros anteriores ao desenhar**), miniaturas numeradas de 96 px; um clique abre o quadro grande num diálogo largo (`Esc` fecha e volta ao editor): coluna à direita do editor no desktop e no celular deitado, faixa acima do canvas no celular em pé |
| Espera | `draw_panel/submitted`, `write_theme/submitted`, `wait` | Confirmação "Recebido!", progresso, lista de quem falta. Nunca mostra desenhos de outros |
| Transição | `phase = 'round_closing'` | "Recolhendo quadros e passando as histórias adiante…". Quem ainda não tinha concluído continua no editor, desabilitado e com o aviso "Tempo esgotado! Enviando o seu quadro…", até o envio sair (R42) |
| Espectador | `task.kind = 'spectate'` | "Partida em andamento — você entra na próxima", lista de jogadores |
| Apresentação | `phase = 'presentation'` | Ver §5 |

Durante a partida, um cabeçalho mostra a fase, "Quadro X de Y", o progresso, o timer e, para o anfitrião, **Encerrar partida** (discreto, com confirmação, R57). Quando a partida é encerrada, todos voltam ao lobby com um aviso do motivo (`match:aborted`). O desenho ocupa a tela inteira, com o tema numa linha recolhível.

Erros de conexão aparecem como faixa no topo ("Reconectando…"), sem trocar de tela; as telas cheias (desenho e apresentação) começam abaixo dela, e os botões que mandam ações ficam desabilitados até a conexão voltar (o editor continua desenhando). Já os motivos para não estar na sala trocam a tela por uma mensagem com volta ao início: sala inexistente ou código mal formado, sala cheia, expulsão, sala encerrada e sessão aberta em outra aba (R5, R9, R12, R16).

---

## 3. Composição de página de HQ

`features/comic/compute-comic-layout.ts` é puro e testado:

```ts
computeComicLayout(panelCount: number, maxColumns: 1 | 2 | 3): number[] // quadros por linha
```

1. `rows = ceil(n / maxColumns)`
2. `base = floor(n / rows)`, `extra = n mod rows`
3. As primeiras `extra` linhas têm `base + 1` quadros; as demais, `base`.

| n | 2 colunas | 3 colunas |
|---|---|---|
| 3 | 2, 1 | 3 |
| 4 | 2, 2 | 2, 2 |
| 5 | 2, 2, 1 | 3, 2 |
| 6 | 2, 2, 2 | 3, 3 |
| 7 | 2, 2, 2, 1 | 3, 2, 2 |
| 8 | 2, 2, 2, 2 | 3, 3, 2 |

Regras visuais de `ComicPage`:

- Todos os quadros de uma página têm o **mesmo tamanho** e proporção 4:3 — nunca são esticados. Linhas com menos quadros ficam centralizadas. (O exemplo em ASCII da especificação, com o quadro 5 ocupando a linha toda, é atendido pela centralização; esticar o quadro distorceria o desenho.)
- `maxColumns`: 1 abaixo de 480px de largura, 2 até 1024px, 3 acima — exceto `n = 4`, que usa 2 para formar uma grade 2×2.
- Ordem de leitura: esquerda→direita, cima→baixo. Cada quadro tem um número discreto no canto.
- O tamanho do quadro é o maior que faça a página caber na área visível (a área do componente pai); se ficar menor que 160px de largura, os quadros ficam com 160px (ou a largura da linha, se for menor) e a página rola verticalmente. As colunas são decididas pela largura da página, não da janela.
- Página com moldura de papel, `--border-ink` em cada quadro e `--gutter-comic` entre eles.
- Quadro `empty`: fundo de retícula com o texto do R55.
- Créditos (apresentação, visão completa): nickname do artista sob cada quadro, em `--color-muted`.
- Imagens: `usePanelImage(panelId)` espera o token da sessão, busca com `Authorization`, mostra retícula enquanto carrega ou se falhar e revoga a URL `blob:` ao desmontar. Em desenvolvimento, `/dev/comic` mostra histórias de exemplo de 1 a 12 quadros.

---

## 4. Editor de desenho

### Superfície

- Resolução lógica fixa `PANEL_WIDTH × PANEL_HEIGHT` (1024×768), fundo branco. O canvas é exibido escalado para caber na área, mantendo 4:3, e o buffer interno considera `devicePixelRatio`.
- Coordenadas do ponteiro são convertidas para o espaço lógico — o desenho final independe do tamanho da tela.
- `touch-action: none` no canvas; Pointer Events com `setPointerCapture` e `getCoalescedEvents()` quando disponível.
- Um ponteiro por vez. Se um traço de caneta (`pointerType: 'pen'`) começou, toques são ignorados até ele terminar (rejeição de palma). Uma caneta que encosta durante um traço de toque descarta esse traço e começa o dela (a palma costuma encostar antes).
- Suavização por curvas quadráticas entre pontos médios.

### Ferramentas

| Ferramenta | Detalhes | Atalho |
|---|---|---|
| Pincel | traço redondo | `B` |
| Borracha | pinta branco do fundo (o PNG final é opaco) | `E` |
| Balde de tinta | pinta a área em volta do clique que tem quase a mesma cor (tolerância de 48 por canal), mais 1 px de borda para cobrir a suavização dos traços; usa a cor escolhida, que não troca a ferramenta | `G` |
| Cores | 16 cores fixas (abaixo) + seletor nativo para cor livre | — |
| Espessura | barra horizontal de 2 a 64 px lógicos (padrão 8; mais à direita, mais grosso), com prévia do traço; os atalhos andam cerca de um quarto da espessura, ao menos 1 px | `[` e `]` |
| Opacidade | barra de 10 % a 100 % (padrão 100 %) para o pincel; o traço inteiro é um caminho pintado de uma vez, então não escurece onde cruza a si mesmo. Borracha e balde são sempre opacos | — |
| Cursor | sobre o canvas, com mouse ou caneta, uma bolinha do diâmetro do traço na escala da tela (no mínimo 4 px), com anel preto e branco; o balde mantém a mira, e o toque não mostra cursor | — |
| Desfazer / Refazer | até 100 passos | `Ctrl/⌘+Z`, `Ctrl/⌘+Shift+Z` |
| Limpar | entra no histórico (pode ser desfeito); pede confirmação | — |
| Concluir | envia o quadro (R40); pede confirmação se faltar mais de metade do tempo. Fica na tela de desenho, não no editor | `Ctrl/⌘+Enter` |

Paleta: `#000000 #FFFFFF #7F7F7F #C3C3C3 #E53935 #FB8C00 #FDD835 #43A047 #00ACC1 #1E88E5 #3949AB #8E24AA #EC407A #8D6E63 #F5CBA7 #5D4037`.

### Modelo

- `DrawingDocument`: lista de operações (`stroke` com cor, tamanho, opacidade, ferramenta e pontos; `fill` com cor e ponto; `clear`), `baseImage` opcional (rascunho restaurado, R48) e pilha de refazer.
- Renderização incremental: o traço em andamento é desenhado direto; desfazer re-renderiza a partir de um snapshot em cache a cada 20 operações.
- `exportPng(): Promise<Uint8Array | null>` — `null` quando não há nada visível (R40): nenhum traço de pincel ou balde (fora o balde branco) depois do último `clear` e nenhuma `baseImage` que um `clear` não tenha coberto. A borracha sozinha não conta como desenho.
- API pública: `DrawingEditor { baseImageUrl?, disabled, onChange(revision), ref.exportPng() }`. Em desenvolvimento, `/dev/editor` mostra o editor isolado.
- O documento é descartado ao concluir; não é guardado no navegador.

### Layout

- Desktop: barra vertical à esquerda do canvas.
- Mobile retrato: barra horizontal abaixo do canvas, botões de pelo menos 44×44px; seletor de cores em popover.
- Mobile paisagem: barra lateral compacta.

---

## 5. Apresentação

- Área principal grande:
  - `theme`: tema em balão de fala gigante + avatar e nickname do autor.
  - `panel(k)`: quadro `k` em destaque (o maior possível), com artista; miniaturas dos já revelados em uma faixa, com o atual marcado. A miniatura de um quadro `empty` não tem o texto do R55 (não cabe), só o nome acessível.
  - `full`: `ComicPage` da história inteira com créditos — a vista mais destacada. Para todos (anfitrião e demais), o botão **Baixar HQ** gera no navegador um PNG como uma tira impressa, no tema claro: tema como título no alto, autor logo abaixo, quadros numerados de 512×384 **colados** (vizinhos dividem uma única linha de nanquim, sem calha; a última linha incompleta fica centralizada, ainda colada), as mesmas colunas de uma tela larga, os créditos numa linha só abaixo dos quadros ("Quadros: 1 Ana · 2 Bia…") e o rodapé "Feito no Comicle"; o arquivo é `comicle-<história>-<tema>.png`. Só usa os quadros que o jogador já pode ver (R54); um quadro que não carrega sai como retícula com aviso.
  - `finished`: "Fim das histórias!" e, para o anfitrião, **Nova partida** (volta ao lobby).
- Anfitrião: barra discreta no rodapé com **Voltar**, **Avançar**, **Ver HQ completa**, **Próxima história**, menu **Histórias** (lista `reachedStories`) e **Encerrar**. Teclado: `→`/`Espaço` avança, `←` volta, `F` visão completa (sem repetição por tecla segurada; `Espaço` sobre um botão focado só aciona o botão; nada enquanto um diálogo está aberto). Botões que não moveriam o cursor (D29) ficam desabilitados. **Encerrar** pede confirmação antes do fim; em `finished`, encerra direto.
- A apresentação ocupa a tela inteira, com cabeçalho próprio; o **Encerrar partida** do cabeçalho da partida (R57, que apaga o conteúdo) não aparece nela.
- Demais jogadores: sem controles; um indicador "O anfitrião está conduzindo".
- Indicador de posição: "História 2 de 5".

---

## 6. Responsividade e acessibilidade

- Mobile-first; testado em 360×640, 768×1024 e 1440×900.
- Contraste AA para texto; foco visível (contorno amarelo com borda de nanquim).
- Toda ação disponível por teclado, exceto desenhar.
- `aria-live="polite"` para mudanças de fase e progresso; o timer anuncia apenas 30 s, 10 s e o fim.
- Avatares têm `alt` com o nickname; quadros têm `alt` "Quadro {n} de {artista}".
- Idioma do documento `pt-BR`.
- Uma única região `aria-live` por sala (`RoomAnnouncer`), montada do lobby ao fim da apresentação, anuncia a fase e a rodada, cada passo da apresentação e a volta ao lobby. Uma região criada junto com o texto costuma não ser lida, por isso ela não é recriada a cada troca de tela.
- Página de HQ que rola (quadros no tamanho mínimo) vira uma região focável, para rolar pelo teclado.
- Título da aba por tela: "Comicle" no início, "{tela} · Comicle" nas demais ("Seu perfil", "Sala K7PQ2M" no lobby, a fase durante a partida, o motivo nas telas de problema).
- Erros de renderização mostram a tela "Algo deu errado", com volta ao início (recarga completa): o `errorElement` do roteador cobre as rotas, e um `ErrorBoundary` em volta do app cobre o resto.
- Favicon em SVG (balão amarelo com um "C" de nanquim), `description`, `theme-color` claro e escuro e Open Graph básico no `index.html`.
- Verificação automática: `e2e/screens.spec.ts` (ver [arquitetura §8](./arquitetura.md#8-testes)).
