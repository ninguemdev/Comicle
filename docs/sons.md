# Sons

Sons curtos de interface e de partida, adicionados na versão 1.1 ([D47](./decisoes.md)). Este documento define o catálogo, como cada som é gerado, quando toca e como o jogador controla o volume.

## 1. Princípios

- **Gerados no navegador.** Todo som é sintetizado na hora com a Web Audio API (osciladores, envelopes e ruído filtrado). Não há arquivos de áudio no repositório nem dependência nova, e não há licença de terceiros a acompanhar.
- **Curtos e discretos.** Nenhum som passa de 600 ms; o volume padrão é moderado. Desenhar exige concentração: nada toca em loop e não há música.
- **Informativos, não decorativos.** Um som acompanha uma mudança que o jogador precisa notar (o tempo acabando, a vez de desenhar, um quadro revelado) ou confirma uma ação dele (clique, envio). Nenhum som carrega informação que não esteja também na tela (acessibilidade, interface.md §6).
- **Sob controle do jogador.** Volume e silenciar ficam na tela inicial e valem para o site todo, guardados no próprio navegador.

## 2. Catálogo

| Id | Quando toca | Como é gerado | Duração |
|---|---|---|---|
| `click` | Clique em botão | Seno curto em 1,2 kHz com ataque instantâneo e queda exponencial | 40 ms |
| `toggle` | Marcar ou desmarcar uma opção, trocar ferramenta | Dois "tics" de seno (900 Hz → 1,3 kHz) | 80 ms |
| `join` | Alguém entra na sala (lobby) | Duas notas de triângulo subindo (Mi5 → Si5) | 220 ms |
| `leave` | Alguém sai da sala (lobby) | Duas notas de triângulo descendo (Si5 → Mi5) | 220 ms |
| `start` | A partida começa | Arpejo maior de quadrada suave (Dó5, Mi5, Sol5, Dó6) | 450 ms |
| `turn` | Começa a vez de escrever, ler ou desenhar | "Whoosh" de ruído com filtro passa-banda varrendo de 400 Hz a 2,4 kHz | 350 ms |
| `tick` | Cada um dos últimos 5 segundos de um prazo | "Tic" de ruído com passa-alta em 3 kHz | 30 ms |
| `warning` | Faltam 30 s e faltam 10 s | Dois bipes de quadrada em 880 Hz | 260 ms |
| `timeUp` | O prazo acabou | Glissando descendente de dente de serra suave (660 → 220 Hz) | 500 ms |
| `submit` | O próprio quadro ou tema foi recebido | Acorde maior curto (Sol5 + Si5 + Ré6) em seno | 300 ms |
| `reveal` | A apresentação mostra um passo novo (tema ou quadro) | "Pop": seno com queda rápida de afinação (1,6 kHz → 400 Hz) | 120 ms |
| `fanfare` | A HQ completa aparece na apresentação | Arpejo maior duas vezes mais rápido que o `start`, terminando em acorde | 600 ms |
| `error` | Uma ação foi recusada (toast de erro) | Duas notas graves de quadrada (Lá3 → Fá3) | 240 ms |

As receitas vivem em `apps/web/src/features/sound/sound-catalog.ts` como dados puros (notas, formas de onda, envelopes), testáveis sem áudio. Os valores acima são o ponto de partida; a página `/dev/sons` (só em desenvolvimento) toca cada um para afinar.

## 3. Quando toca (T34)

- A partida decide os sons pela **mudança da `PlayerView`**, como já faz o `RoomAnnouncer`: partida começando, tarefa nova, tema ou quadro recebido, passo novo da apresentação, membro entrando ou saindo do lobby. A função pura `soundsForChange` (`features/sound/game-sounds.ts`) compara a view anterior com a nova, e o hook `useGameSounds`, montado na sala, toca o que ela devolve.
- Fora disso, só tocam direto: o `Button` (`click`), as ferramentas do editor (`toggle`; desfazer, refazer e limpar dão `click`), as caixas das configurações (`toggle`), o `Toast` de erro (`error`) e o `Timer` (prazos, abaixo).
- Confirmar a própria leitura (R36) não toca `turn`: o clique já soou. Se a leitura acaba pelo prazo, a fase muda e o `turn` toca.
- Nada toca ao carregar ou reconectar: a primeira view só registra o estado, sem som.
- Os avisos de prazo (30 s e 10 s), o tique-taque dos últimos 5 s e o fim saem do `Timer`, pelos mesmos marcos que ele anuncia ao leitor de tela e com o mesmo relógio corrigido (R61). Começar atrasado, como ao reconectar, não repete um marco já passado. Atalhos de teclado do editor não fazem som.
- Sons do próprio desenho (cada traço) ficam de fora: seriam constantes e cansativos.

## 4. Volume

- **Controle na tela inicial**, abaixo de **Aparência**: botão **Silenciar / Ativar sons** e uma barra **Volume** de 0 a 100 %.
- Padrão: **ligado, 60 %**. Ajustar a barra toca um `click` no volume novo, como prévia.
- Guardado em `localStorage` como `comicle.sound` (`{ volume: number, muted: boolean }`, [modelo de dados](./modelo-de-dados.md)); valor inválido volta ao padrão.
- O volume é um ganho mestre (curva quadrática, que soa mais natural que a linear); silenciar zera o ganho sem perder o volume escolhido.

## 5. Navegador

- Os navegadores só liberam áudio depois de um gesto do usuário. O `AudioContext` é criado no primeiro gesto da página (`pointerdown`, `pointerup`, `touchend`, `keydown` ou `click`: num toque de celular, só o dedo subindo conta como gesto); gestos seguintes acordam o contexto se o navegador o suspendeu. Até o primeiro gesto, os sons são ignorados (não ficam em fila).
- Sem Web Audio (navegador antigo, testes), o motor vira um no-op silencioso: o jogo funciona igual.
- A aba em segundo plano não acumula sons: o navegador suspende o contexto e o que seria tocado é descartado.

## 6. Testes

- Receitas: unitários do catálogo (duração máxima, frequências audíveis, envelope que termina em silêncio).
- Motor: com um `AudioContext` falso, confere ganho mestre, silenciar e no-op sem suporte.
- Volume: store com storage falso (padrão, persistência, valor inválido) e controle na tela inicial com Testing Library.
- Eventos (T34): `useGameSounds` com sequências de views, conferindo quais sons pediu.
