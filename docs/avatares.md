# Avatares — catálogo e guia de artes

O sistema separa **regras** (quais categorias existem, quais são opcionais) de **artes** (os arquivos). Adicionar uma arte nova nunca exige mudar código: basta o arquivo e uma entrada no catálogo.

---

## 1. Categorias e camadas

Ordem de desenho (de baixo para cima):

| Camada | Categoria | Chave | Obrigatória |
|---|---|---|---|
| 1 | Cabeça | `head` | sim |
| 2 | Bochechas | `cheeks` | não |
| 3 | Olhos | `eyes` | sim |
| 4 | Boca | `mouth` | sim |
| 5 | Acessório facial | `faceAccessory` | não (no máximo um) |
| 6 | Chapéu | `hat` | não |

Opcional não selecionado = `null` (R2).

---

## 2. Catálogo

Arquivo único: `packages/shared/src/avatar/catalog.json`. É lido pelo servidor (validação de IDs) e pelo cliente (lista de opções e caminhos das imagens).

```json
{
  "version": 1,
  "categories": {
    "head": {
      "label": "Cabeça",
      "required": true,
      "options": [
        { "id": "head-round", "label": "Redonda", "file": "head/head-round.svg" },
        { "id": "head-square", "label": "Quadrada", "file": "head/head-square.svg" }
      ]
    },
    "eyes": { "label": "Olhos", "required": true, "options": [] },
    "mouth": { "label": "Boca", "required": true, "options": [] },
    "cheeks": { "label": "Bochechas", "required": false, "options": [] },
    "faceAccessory": { "label": "Acessório", "required": false, "options": [] },
    "hat": { "label": "Chapéu", "required": false, "options": [] }
  }
}
```

Regras:

- `id` é único globalmente, em `kebab-case`, prefixado pela categoria em `kebab-case` (`hat-cowboy`, `face-accessory-glasses`); a pasta da arte usa o mesmo prefixo (`face-accessory/`). **Nunca reutilize nem renomeie um `id` publicado** — perfis salvos dependem dele. Para aposentar uma arte, adicione `"retired": true`: ela some da lista de escolha, mas continua renderizando para quem já a usa.
- `file` é relativo a `apps/web/public/avatars/`.
- O padrão de cada categoria obrigatória é a primeira opção não aposentada; o de cada opcional é `null`.
- `catalog.ts` valida o JSON com Zod ao carregar e exporta tipos e helpers (`isValidAvatar`, `defaultAvatar`, `randomAvatar(rng)`, `sanitizeAvatar`, `activeOptions`, `findAvatarOption`, `avatarCategorySlug`). O `Rng` é a interface de `@comicle/shared` (D18).

---

## 3. Especificação das artes

O guia completo para quem desenha, com estilo, pincéis, paleta, gabarito, coordenadas, regras por camada e a lista das artes atuais, está em [`avatares-guia-de-artes.md`](./avatares-guia-de-artes.md). Resumo:

| Item | Valor |
|---|---|
| Estilo | skribbl.io: pincel redondo de espessura constante, leve tremido, cores chapadas |
| Formato | SVG (preferido) ou PNG com transparência |
| Área | SVG 512 × 512 (`viewBox="0 0 512 512"`) ou PNG 1024 × 1024, fundo transparente, margem segura de 16 (32 no PNG) |
| Alinhamento | Todas as camadas usam o mesmo enquadramento; o centro do rosto fica em (256, 280) |
| Zonas | Cada camada tem um retângulo próprio (cabeça, bochechas, olhos, boca, acessório, chapéu); o chapéu vai de y 16 a 220, os olhos de 196 a 304, a boca de 300 a 410 |
| Pincéis | 16 / 12 / 8 no SVG (32 / 24 / 16 no PNG), contorno `#16161D` |
| Paleta | As 16 cores do editor de desenho ([interface §4](./interface.md#4-editor-de-desenho)) |
| SVG | Sem scripts, eventos, `<image>`, `<foreignObject>` ou referências externas; IDs internos prefixados com o `id` da arte |
| Tamanho | Até 100 KB por arquivo |

Os números vêm de `apps/web/scripts/avatars/layout.ts`, que o gerador das provisórias e o gabarito usam. O gabarito fica em `apps/web/public/avatars/_template.svg` (com legendas) e `_template.png` (1024 × 1024, para programas de pintura).

---

## 4. Como adicionar ou trocar uma arte

1. Salve o arquivo em `apps/web/public/avatars/<pasta>/<id>.svg` (ou `.png`), onde `<pasta>` é o prefixo da categoria (`face-accessory`, `hat`…). Para trocar uma provisória, basta sobrescrever o arquivo dela.
2. Opção nova: adicione a entrada em `catalog.json` na categoria certa. Arte em PNG: o `file` da opção termina em `.png` e o SVG provisório é apagado.
3. Rode `pnpm avatars:check`: confere o catálogo, que todo `file` existe com o nome padrão, que não há arquivo órfão, a segurança e o `viewBox` dos SVGs, as dimensões dos PNGs e o tamanho; no fim, conta as artes definitivas e as provisórias. Roda no CI.
4. Em `pnpm dev`, confira em `/dev/ui` (seção Avatares: quatro tamanhos e todas as artes) e em `/perfil`.
5. Commit: `feat(avatar): adiciona chapéu de cowboy`.

---

## 5. Artes provisórias

Até as artes definitivas chegarem, as 30 opções do catálogo (5 por categoria) usam artes geradas por código em `apps/web/scripts/avatars/`: um motor de esboço determinístico (`sketch.ts`) imita o traço do skribbl.io (pincel redondo de espessura constante, tremido suave de mão, contornos que passam um pouco do início, cores chapadas) e desenha cada arte sobre as âncoras do layout padrão. Os testes garantem que cada arte fica na zona da sua categoria e que toda cabeça cobre a área do rosto.

- `pnpm avatars:generate` reescreve as provisórias e o gabarito. A saída é sempre a mesma (a semente vem do `id`).
- Toda provisória tem o comentário com o marcador `comicle-placeholder`. O gerador **nunca sobrescreve** um arquivo sem o marcador, ou seja, uma arte definitiva.
- As provisórias são substituídas arquivo a arquivo, mantendo os `id`s ou aposentando-os ([D20](./decisoes.md)).

---

## 6. Renderização

`AvatarRenderer({ avatar, size, label })` empilha as camadas como `<img>` absolutamente posicionadas dentro de um contêiner quadrado, na ordem da §1, com `alt` vazio nas camadas. Com `label`, o contêiner é `role="img"` com `aria-label` (ex.: "Avatar de Ana" no `PlayerChip`); sem `label`, é decorativo (`aria-hidden`), como nas miniaturas do editor, que já ficam dentro de um botão com rótulo. Opcional em `null` e `id` desconhecido não desenham camada. Tamanhos usados: 32 (listas), 64 (cartões e miniaturas), 160 (lobby/apresentação), 256 (editor).

O editor (`AvatarEditor`) mostra a prévia em 256, uma aba por categoria (setas, Home e End trocam de aba), uma miniatura por opção com o avatar atual já aplicado, "Nenhum" nas opcionais e o botão **Aleatório**. Os painéis inativos ficam montados e escondidos, para todas as miniaturas já estarem carregadas ao trocar de aba.
