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

- `id` é único globalmente, em `kebab-case`, prefixado pela categoria (`hat-cowboy`). **Nunca reutilize nem renomeie um `id` publicado** — perfis salvos dependem dele. Para aposentar uma arte, adicione `"retired": true`: ela some da lista de escolha, mas continua renderizando para quem já a usa.
- `file` é relativo a `apps/web/public/avatars/`.
- O padrão de cada categoria obrigatória é a primeira opção não aposentada; o de cada opcional é `null`.
- `catalog.ts` valida o JSON com Zod ao carregar e exporta tipos e helpers (`isValidAvatar`, `defaultAvatar`, `randomAvatar(rng)`).

---

## 3. Especificação das artes

| Item | Valor |
|---|---|
| Formato | SVG (preferido) ou PNG com transparência |
| Área | 512 × 512 (`viewBox="0 0 512 512"`), fundo transparente |
| Alinhamento | Todas as camadas usam o mesmo enquadramento; o centro do rosto fica em (256, 280) |
| Zona do chapéu | y de 0 a 220; pode sobrepor o topo da cabeça |
| Zona dos olhos | y de 200 a 300 |
| Zona da boca | y de 300 a 400 |
| Traço | Contorno preto (`#16161D`), ~10 px, combinando com a identidade de HQ |
| SVG | Sem scripts, sem fontes externas, sem `<image>` remoto; IDs internos únicos (prefixe com o `id` da arte) |
| PNG | 1024 × 1024 para ficar nítido em telas densas |

Um gabarito `apps/web/public/avatars/_template.svg` (criado na T07) mostra as zonas acima.

---

## 4. Como adicionar uma arte

1. Salve o arquivo em `apps/web/public/avatars/<categoria>/<id>.svg`.
2. Adicione a entrada em `catalog.json` na categoria certa.
3. Rode `pnpm avatars:check` — confere que todo `file` existe, que não há arquivo órfão, IDs duplicados ou SVG com conteúdo proibido.
4. Abra `/perfil` em dev e confira a composição.
5. Commit: `feat(avatar): adiciona chapéu de cowboy`.

---

## 5. Artes provisórias

Até as artes definitivas chegarem, a T07 cria placeholders em SVG gerados por código simples (formas geométricas e traços), com 4 a 6 opções por categoria. Eles seguem a mesma especificação e são substituídos arquivo a arquivo, mantendo os `id`s ou aposentando-os.

---

## 6. Renderização

`AvatarRenderer({ avatar, size })` empilha as camadas como `<img>` absolutamente posicionadas dentro de um contêiner quadrado, na ordem da §1, com `alt` vazio nas camadas e `aria-label` no contêiner. Tamanhos usados: 32 (listas), 64 (cartões), 160 (lobby/apresentação), 256 (editor).
