# Guia de artes dos avatares

Este é o guia para desenhar as **artes definitivas** dos avatares. Ele reúne tudo de que você precisa na hora de desenhar: estilo, tamanhos, pincéis, paleta, gabarito, coordenadas, regras de cada camada, como trocar um arquivo e a lista das artes atuais.

O sistema por trás (catálogo, regras de ID, renderização) está em [`avatares.md`](./avatares.md). As artes que estão no jogo hoje são as **artes de rabisco** em PNG ([D28](./decisoes.md)), desenhadas no layout descrito aqui. Cada uma pode ser trocada por outra, arquivo por arquivo, sem mexer em código.

Os números deste guia vêm de `apps/web/scripts/avatars/layout.ts`. Se um deles mudar, os dois mudam juntos.

---

## 1. Checklist rápido

- [ ] Um arquivo por opção, com **uma camada só** (a cabeça não leva olhos, o chapéu não leva cabeça…).
- [ ] **SVG 512 × 512** (`viewBox="0 0 512 512"`) ou **PNG 1024 × 1024**, sempre com **fundo transparente**.
- [ ] Desenhado **na posição final, no quadro inteiro**: nada de recortar a imagem em volta do desenho.
- [ ] Tudo dentro da **zona da categoria** (§6) e da margem segura de 16 px.
- [ ] Pincel redondo em **três espessuras**: 16 / 12 / 8 no SVG, ou 32 / 24 / 16 no PNG (§4).
- [ ] Contorno `#16161D` e preenchimentos da **paleta** (§5).
- [ ] Arquivo de no máximo **100 KB**.
- [ ] Nome `apps/web/public/avatars/<pasta>/<id>.svg` (ou `.png`) (§8).
- [ ] `pnpm avatars:check` sem erros e conferência em `/dev/ui` e `/perfil` (§8).

---

## 2. Estilo: skribbl.io

O avatar deve parecer desenhado com o mouse no próprio jogo, como os bonequinhos do skribbl.io: simples, expressivo e um pouco torto.

| Faça | Evite |
|---|---|
| Pincel **redondo**, de espessura **constante**, com pontas arredondadas | Variação de pressão, caneta caligráfica, traço que afina |
| Traço contínuo com um leve tremido de mão | Curvas perfeitas de vetor, formas geométricas "limpas demais" |
| Contornos que passam um pouquinho do ponto de partida | Fechar cada forma com precisão milimétrica |
| Cores **chapadas**, preenchidas como com o balde | Degradê, sombra, brilho suave, textura, hachura, transparência parcial |
| Contorno preto grosso na silhueta, pincel menor nos detalhes | Linhas finas demais, que somem nos tamanhos pequenos |
| Poucas formas, bem expressivas; rosto de frente e simétrico | Perfil, perspectiva, muitos detalhes pequenos |
| Brancos (`#FFFFFF`) para olhos, dentes e brilhos | Fundo branco ou colorido atrás do desenho |

Pense na leitura em **32 px** (lista de jogadores): cabeça, olhos e boca precisam se reconhecer mesmo minúsculos. Os detalhes pequenos são um bônus para os tamanhos grandes.

---

## 3. Tela e formato

| Item | SVG (preferido) | PNG |
|---|---|---|
| Tamanho | `viewBox="0 0 512 512"` (`width`/`height` 512 opcionais) | 1024 × 1024 px |
| Fundo | transparente | transparente (RGBA, ou paleta com transparência) |
| Margem segura | nada a menos de 16 das bordas (conteúdo entre 16 e 496) | nada a menos de 32 px das bordas (entre 32 e 992) |
| Tamanho do arquivo | até 100 KB | até 100 KB |
| Cor do contorno | `#16161D` | `#16161D` |

Todas as camadas usam **o mesmo enquadramento**: o jogo empilha os arquivos um sobre o outro, alinhados pelo canto. Se uma arte for exportada recortada ou deslocada, ela sai do lugar no avatar.

### Regras do SVG

O `pnpm avatars:check` recusa:

- `<script>`, atributos de evento (`onload`, `onclick`…), `<image>`, `<foreignObject>`, `DOCTYPE`/`ENTITY`;
- qualquer referência externa: `href`/`xlink:href` que não comece com `#`, `url(...)` que não aponte para `#id` interno, `@import`, endereços `http(s)://` (as declarações `xmlns` são permitidas);
- `viewBox` diferente de `0 0 512 512`.

Recomendações:

- **Texto vira curva.** Não use `<text>` nem fontes; converta em contornos.
- IDs internos (gradientes, máscaras, `<use>`) começam com o `id` da arte, ex.: `hat-cowboy-faixa`.
- Exporte **SVG simples**, sem metadados do editor:
  - Inkscape: *Salvar como → SVG simples* (o "SVG do Inkscape" pode trazer metadados com URLs, que o checker recusa).
  - Figma: *Export → SVG*, com "Include id attribute" desligado.
  - Illustrator: *Exportar como → SVG*, com estilo "Atributos de apresentação".
- Se o arquivo passar de 100 KB, otimize com SVGO/SVGOMG ou simplifique os traços.

### Regras do PNG

- 1024 × 1024 exatos, com canal alfa. O checker lê o cabeçalho e recusa outro tamanho ou PNG sem transparência.
- Exporte só a camada da arte, com a camada do gabarito escondida.
- A espessura dos pincéis dobra no PNG (§4).

---

## 4. Pincéis padronizados

Um pincel redondo, três tamanhos. No PNG os valores dobram, porque a tela tem o dobro do tamanho.

| Pincel | SVG (512) | PNG (1024) | Na tela em 256 / 160 / 64 / 32 px | Use para |
|---|---|---|---|---|
| **Grosso** | 16 | 32 | 8 / 5 / 2 / 1 px | silhueta da cabeça e dos chapéus; traços que são o próprio detalhe (linha da boca, olhos fechados, sobrancelhas) |
| **Médio** | 12 | 24 | 6 / 3,75 / 1,5 / 0,75 px | contorno de formas pequenas preenchidas (branco do olho, dentes, língua, lentes, armações, pompons) |
| **Fino** | 8 | 16 | 4 / 2,5 / 1 / 0,5 px | detalhes mínimos (brilho no olho, costuras, correntes, risquinhos) |

Detalhes no pincel fino praticamente somem em 32 px, e isso é esperado. Pupilas (pontos cheios, sem contorno) precisam de diâmetro de pelo menos **24** no SVG (48 no PNG) para continuarem visíveis em 64 px; pontinhos menores, como sardas, são detalhe e podem sumir nos tamanhos pequenos.

No SVG, use `stroke-linecap="round"` e `stroke-linejoin="round"`.

---

## 5. Paleta

São as **16 cores fixas do editor de desenho** ([interface §4](./interface.md#4-editor-de-desenho)), para o avatar parecer feito no próprio jogo, e o contorno usa o nanquim da interface.

| Cor | Hex |
|---|---|
| Nanquim (contorno) | `#16161D` |
| Preto | `#000000` |
| Branco | `#FFFFFF` |
| Cinza | `#7F7F7F` |
| Prata | `#C3C3C3` |
| Vermelho | `#E53935` |
| Laranja | `#FB8C00` |
| Amarelo | `#FDD835` |
| Verde | `#43A047` |
| Ciano | `#00ACC1` |
| Azul | `#1E88E5` |
| Anil | `#3949AB` |
| Roxo | `#8E24AA` |
| Rosa | `#EC407A` |
| Marrom | `#8D6E63` |
| Pele | `#F5CBA7` |
| Marrom-escuro | `#5D4037` |

O gabarito traz amostras dessas cores no canto inferior esquerdo, para usar com o conta-gotas. Uma cor fora da paleta não é proibida pelo checker, mas quebra a unidade visual; combine antes.

**A cor da pele é da cabeça.** Não existe categoria de cor: cada opção de cabeça já vem pintada. A mesma forma em cores diferentes são opções diferentes (`head-round-blue`, `head-round-pink`…).

---

## 6. Gabarito, zonas e âncoras

O gabarito fica em `apps/web/public/avatars/` (é regenerado por `pnpm avatars:generate`):

- `_template.svg`: com legendas; abre em Inkscape, Figma, Illustrator, Affinity, Krita e no navegador.
- `_template.png`: 1024 × 1024, sem legendas; para programas de pintura (Krita, Photoshop, Procreate, Aseprite, Paint.NET, ibisPaint…).

Como usar: importe o gabarito como **camada de baixo**, trave, baixe a opacidade, desenhe nas camadas de cima e **esconda o gabarito antes de exportar**.

| Cor no gabarito | Significado |
|---|---|
| Cinza tracejado | margem segura |
| Roxo (área e linha) | zona do chapéu e linha de base do chapéu (y 180) |
| Azul tracejado (retângulo) | zona da cabeça |
| Círculo cinza com contorno grosso | cabeça de referência, já com o pincel grosso |
| Azul tracejado (elipse) | área do rosto, que toda cabeça precisa cobrir |
| Vermelho tracejado | topo da cabeça (y 120) |
| Verde tracejado | zona do acessório |
| Ciano | zona dos olhos, círculo de cada olho e centros |
| Rosa | zona e círculos das bochechas |
| Laranja | zona e centro da boca |
| Cruz preta | centro do rosto |
| Canto inferior direito | os três pincéis, em tamanho real |

### Âncoras

"Esquerdo" e "direito" são os lados da imagem.

| Âncora | SVG (512) | PNG (1024) |
|---|---|---|
| Centro do rosto | (256, 280) | (512, 560) |
| Topo da cabeça (alto do contorno) | y 120 (aceita 112–128) | y 240 (224–256) |
| Base do chapéu | y 180 | y 360 |
| Olho esquerdo, centro | (196, 250) | (392, 500) |
| Olho direito, centro | (316, 250) | (632, 500) |
| Raio de cada olho | 44 | 88 |
| Boca, centro | (256, 350) | (512, 700) |
| Bochecha esquerda, centro | (166, 322) | (332, 644) |
| Bochecha direita, centro | (346, 322) | (692, 644) |
| Raio de cada bochecha | 34 | 68 |
| Cabeça de referência (círculo) | centro (256, 284), raio 164 | centro (512, 568), raio 328 |
| Área do rosto (elipse) | centro (256, 300), raios 132 × 108 | centro (512, 600), raios 264 × 216 |

### Zonas

Retângulo que cada camada pode ocupar, **contorno incluído** (esquerda, topo, direita, base):

| Camada | SVG (512) | PNG (1024) |
|---|---|---|
| Cabeça | 80, 104, 432, 476 | 160, 208, 864, 952 |
| Bochechas | 126, 282, 386, 362 | 252, 564, 772, 724 |
| Olhos | 144, 196, 368, 304 | 288, 392, 736, 608 |
| Boca | 166, 300, 346, 410 | 332, 600, 692, 820 |
| Acessório facial | 86, 170, 426, 420 | 172, 340, 852, 840 |
| Chapéu | 16, 16, 496, 220 | 32, 32, 992, 440 |

```text
  y
  0 ┌──────────────────────────────────────┐
 16 │ chapéu (16–220)                      │
120 │─ ─ ─ ─ ─ topo da cabeça ─ ─ ─ ─ ─ ─ ─│
180 │─ ─ ─ ─ ─ base do chapéu ─ ─ ─ ─ ─ ─ ─│
196 │ olhos (196–304)      ◎       ◎       │  centros (196, 250) e (316, 250)
280 │                          +           │  centro do rosto (256, 280)
282 │ bochechas (282–362)  ○       ○       │  centros (166, 322) e (346, 322)
300 │ boca (300–410)           ◡           │  centro (256, 350)
476 │ base da zona da cabeça               │
512 └──────────────────────────────────────┘
```

---

## 7. Regras por camada

Ordem de desenho, de baixo para cima: **cabeça → bochechas → olhos → boca → acessório → chapéu**. Cada arte precisa funcionar com **qualquer** combinação das outras.

### Cabeça · pasta `head/` · obrigatória

- Silhueta preenchida com a cor do personagem e contorno no pincel grosso.
- Centrada em x 256; o ponto mais alto do contorno em **y ≈ 120** (de 112 a 128), para os chapéus assentarem igual em todas.
- O **preenchimento cobre toda a área do rosto** (elipse azul do gabarito) e o contorno fica do lado de fora dela. É isso que garante que qualquer olho, boca ou bochecha caiba em qualquer cabeça.
- Orelhas, chifres, cabelo e antenas podem fazer parte da cabeça, desde que fiquem dentro da zona e **fora da área do rosto**.
- Sem olhos, boca ou bochechas: essas são outras camadas.

### Bochechas · pasta `cheeks/` · opcional

- Um par, centrado nas âncoras das bochechas, cada uma dentro do círculo de raio 34.
- Ficam por baixo dos olhos e da boca; não precisam de contorno (o "corado" é uma mancha chapada).

### Olhos · pasta `eyes/` · obrigatória

- Um par, cada olho dentro do círculo de raio 44 em volta do seu centro.
- Sobrancelhas fazem parte dos olhos e podem subir até y 196.
- Pupila cheia com diâmetro de pelo menos 24 (48 no PNG). Olho fechado é uma linha no pincel grosso.

### Boca · pasta `mouth/` · obrigatória

- Centrada em (256, 350), dentro da zona da boca.
- Boca de linha usa o pincel grosso; boca aberta é forma preenchida (preto) com contorno.

### Acessório facial · pasta `face-accessory/` · opcional, no máximo um

- Fica por cima de olhos e boca e pode cobri-los em parte (bigode, tapa-olho).
- Óculos: lentes centradas nos olhos, com raio de pelo menos 50, para cobrir qualquer olho; as hastes vão até a lateral da zona.
- Bigode: entre y ~285 e ~335, acima da linha da boca.

### Chapéu · pasta `hat/` · opcional

- Assenta no topo da cabeça (y 120) e não passa de **y 220**, para não cobrir os olhos.
- Chapéus que **cobrem** o alto da cabeça (boné, gorro, cartola) descem até a **base y 180**. Para esconder o contorno de qualquer cabeça, precisam de cerca de **330 de largura** nessa altura; mais estreitos, o contorno da cabeça aparece dos lados, o que é aceitável.
- Chapéus que só **pousam** (coroa, chapéu de festa) podem ser estreitos, com a base entre y 120 e 180.

---

## 8. Trocar uma arte

1. Desenhe sobre o gabarito, seguindo as §§2–7.
2. Exporte para o **mesmo caminho** da arte atual: `apps/web/public/avatars/<pasta>/<id>.png`. Nenhum código muda.
   - **Em SVG:** salve `<id>.svg`, apague o `<id>.png` e troque o `file` dessa opção em `packages/shared/src/avatar/catalog.json` para `.svg`.
3. Rode `pnpm avatars:check`.
4. Rode `pnpm dev` e confira:
   - `/dev/ui`, seção **Avatares**: o avatar nos quatro tamanhos (32, 64, 160 e 256) e todas as artes do catálogo lado a lado;
   - `/perfil`: combine sua arte com várias opções das outras categorias e use **Aleatório** algumas vezes.
5. Commit: `feat(avatar): redesenha a cabeça redonda`.

**Seu arquivo nunca é sobrescrito.** O `pnpm avatars:generate` só reescreve o gabarito; nenhuma arte é gerada por código.

**Mantenha o `id` se a opção continua sendo a mesma coisa** (a "Redonda" ganhou um desenho melhor). Se ela virar outra coisa ("Boné" passou a ser "Capacete"), crie um `id` novo e aposente o antigo com `"retired": true`: perfis salvos dependem do `id`.

## 9. Adicionar uma opção nova

1. Escolha o `id`: `kebab-case`, prefixado pela pasta da categoria (`hat-cowboy`, `face-accessory-bandaid`). Nunca reutilize um `id` publicado.
2. Salve a arte em `apps/web/public/avatars/<pasta>/<id>.svg` (ou `.png`).
3. Adicione a entrada na categoria certa de `catalog.json`, com o rótulo em pt-BR que aparece no editor: `{ "id": "hat-cowboy", "label": "Cowboy", "file": "hat/hat-cowboy.svg" }`. A posição na lista é a ordem no editor; a primeira opção ativa das categorias obrigatórias é o padrão.
4. Siga os passos 3 a 5 da §8.

---

## 10. Artes atuais

São as 50 artes de rabisco, em PNG de 1024 × 1024 ([D28](./decisoes.md)). A ordem de cada tabela é a ordem no editor.

### Cabeça (`head/`)

| `id` | Rótulo |
|---|---|
| `head-round` | Redonda (padrão) |
| `head-square` | Quadrada |
| `head-oval` | Oval |
| `head-cloud` | Nuvem |

### Bochechas (`cheeks/`)

| `id` | Rótulo |
|---|---|
| `cheeks-blush` | Coradas |
| `cheeks-freckles` | Sardas |
| `cheeks-hearts` | Corações |
| `cheeks-stripes` | Riscos |
| `cheeks-stars` | Estrelas |
| `cheeks-whisker-lines` | Marcas de gato |

### Olhos (`eyes/`)

| `id` | Rótulo |
|---|---|
| `eyes-dots` | Pontinhos (padrão) |
| `eyes-wide` | Arregalados |
| `eyes-sleepy` | Sonolentos |
| `eyes-happy` | Felizes |
| `eyes-angry` | Bravos |
| `eyes-classic-open` | Clássicos |
| `eyes-wink-left` | Piscadela |
| `eyes-dizzy-spiral` | Espirais |
| `eyes-heart-pupils` | Apaixonados |
| `eyes-suspicious` | Desconfiados |

### Boca (`mouth/`)

| `id` | Rótulo |
|---|---|
| `mouth-smile` | Sorriso (padrão) |
| `mouth-tongue` | Língua de fora |
| `mouth-big-grin` | Sorriso largo |
| `mouth-open-happy` | Aberta feliz |
| `mouth-surprised-o` | Surpresa |
| `mouth-sad` | Triste |
| `mouth-smirk` | Sorriso de canto |
| `mouth-clenched-teeth` | Dentes cerrados |
| `mouth-laugh` | Gargalhada |
| `mouth-zigzag-nervous` | Nervosa |

### Acessório facial (`face-accessory/`)

| `id` | Rótulo |
|---|---|
| `face-accessory-glasses` | Óculos |
| `face-accessory-sunglasses` | Óculos escuros |
| `face-accessory-mustache` | Bigode |
| `face-accessory-eyepatch` | Tapa-olho |
| `face-accessory-monocle` | Monóculo |
| `face-accessory-clown-nose` | Nariz de palhaço |
| `face-accessory-surgical-mask` | Máscara |
| `face-accessory-bandana` | Bandana |
| `face-accessory-nose-bandage` | Curativo |
| `face-accessory-disguise-glasses` | Disfarce |

### Chapéu (`hat/`)

| `id` | Rótulo |
|---|---|
| `hat-cap` | Boné |
| `hat-top` | Cartola |
| `hat-beanie` | Gorro |
| `hat-crown` | Coroa |
| `hat-party` | Festa |
| `hat-cowboy` | Cowboy |
| `hat-chef` | Cozinheiro |
| `hat-graduation` | Formatura |
| `hat-wizard` | Mago |
| `hat-propeller` | Hélice |

---

## 11. O que o `pnpm avatars:check` confere

Roda no CI, então um PR com arte fora do padrão não passa.

- O catálogo é válido: IDs únicos, prefixo certo, `required` de acordo com o R2, pelo menos uma opção ativa nas obrigatórias.
- Todo `file` se chama `<pasta>/<id>.svg` ou `<pasta>/<id>.png` e existe.
- Nenhum arquivo órfão: toda arte em `public/avatars/` está no catálogo. Os gabaritos (`_template.*`) e arquivos de sistema são ignorados.
- SVG: as regras de segurança e o `viewBox` da §3.
- PNG: 1024 × 1024 com transparência.
- Tamanho de até 100 KB.
- No fim, informa quantas artes o catálogo tem.

O que ele **não** consegue conferir, e fica com você: o estilo, as zonas e âncoras (confira com o gabarito) e a leitura em 32 px (confira em `/dev/ui`).
