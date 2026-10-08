# Projeto — Jogo Multiplayer de Quadrinhos

**Categoria:** Jogo social, multiplayer, criativo e casual  
**Plataforma:** Web (navegador)  
**Formato:** Salas multiplayer privadas por convite  
**Identidade:** Jogo independente, preparado para integração com um site público existente  
**Versão inicial:** Modo Quadrinhos Colaborativos

---

## 1. Visão geral

O projeto consiste em uma aplicação web multiplayer na qual grupos de jogadores criam histórias em quadrinhos por meio de desenhos realizados em rodadas.

A experiência combina criatividade, improvisação, colaboração e humor. Cada participante contribui com ideias ou interpretações visuais, formando histórias que podem seguir caminhos inesperados conforme passam pelas mãos de diferentes jogadores.

A principal característica do jogo é a utilização de histórias em quadrinhos como formato de criação e apresentação.

Diferentemente de jogos em que desenhos são apresentados individualmente e de maneira isolada, cada história possui uma sequência organizada de quadros, exibidos visualmente como uma página de história em quadrinhos.

O jogo não possui sistema de pontuação, vencedores ou derrotados. Seu objetivo é proporcionar uma experiência social divertida, na qual o resultado da criatividade coletiva é a principal recompensa.

### Princípios do produto

- **Simplicidade:** a experiência é acessível, sem cadastro, instalação ou configurações desnecessárias.
- **Criatividade:** a interpretação individual dos jogadores é o elemento central.
- **Interação social:** o jogo é pensado principalmente para grupos de amigos.
- **Fluidez:** a transição entre salas, rodadas, desenho e apresentação acontece de maneira natural.
- **Identidade visual:** jogadores possuem avatares personalizados e as histórias são apresentadas em um formato inspirado em quadrinhos.
- **Modularidade:** os sistemas são independentes o suficiente para permitir novos modos sem comprometer os existentes.
- **Baixa complexidade operacional:** a aplicação privilegia soluções diretas e confiáveis, sem sistemas que não contribuam para a experiência.

---

## 2. Plataforma e acesso

O jogo funciona diretamente em navegadores modernos, sem necessidade de instalação.

A aplicação possui uma identidade própria, mas sua estrutura permite integração futura com um site público, por exemplo, como uma seção dedicada a jogos.

A experiência é compatível com computadores e dispositivos móveis, respeitando as diferenças entre desenho com mouse, caneta digital e toque.

### 2.1 Acesso sem contas

Não existe cadastro, login, senha ou sistema tradicional de contas.

Ao acessar o jogo, o usuário identifica-se utilizando:

- Um nickname.
- Um avatar personalizado.

Essa identidade é utilizada durante a sessão de jogo e pode permanecer armazenada localmente no navegador para facilitar acessos posteriores.

O nickname não representa uma identidade global exclusiva. Diferentes pessoas podem utilizar o mesmo nome, enquanto cada participante de uma sala possui uma identificação interna independente.

### 2.2 Identidade temporária

Cada jogador possui uma sessão temporária, utilizada para reconhecer sua participação na sala e permitir o retorno em situações como atualização acidental da página ou interrupção momentânea da conexão.

A identidade local não constitui uma conta permanente.

As configurações do avatar e do nickname podem continuar disponíveis no mesmo navegador, mas não existe sincronização automática entre dispositivos.

---

## 3. Sistema de avatares

Cada jogador possui um avatar visual personalizável, construído pela combinação de elementos gráficos.

O avatar funciona como representação social dentro da aplicação, sendo exibido principalmente na sala de espera, junto ao nickname e em contextos de identificação dos participantes.

### 3.1 Estrutura do avatar

O avatar possui seis categorias de personalização:

| Categoria | Descrição |
|---|---|
| Cabeça | Forma ou modelo principal que compõe a base do avatar |
| Olhos | Formato e aparência dos olhos |
| Boca | Expressão e formato da boca |
| Bochechas | Detalhes decorativos, marcas ou elementos visuais nas bochechas |
| Chapéu | Elemento utilizado sobre a cabeça |
| Acessório facial | Um único acessório aplicado ao rosto |

As categorias podem possuir diversas opções visuais.

Chapéus, detalhes nas bochechas e acessórios faciais podem ser opcionais, permitindo avatares mais simples.

A categoria de acessório facial aceita apenas um item selecionado por vez.

### 3.2 Composição visual

Os elementos são organizados em camadas e combinados para formar um personagem único.

Os recursos gráficos são independentes das regras de personalização, permitindo adicionar novas artes às categorias existentes sem alterar o funcionamento do sistema.

Todas as artes dos avatares serão produzidas e adicionadas posteriormente pelo criador do projeto.

Enquanto não houver uma biblioteca definitiva de imagens, a estrutura do avatar admite representações visuais provisórias.

### 3.3 Experiência de personalização

O jogador visualiza seu avatar enquanto seleciona os elementos.

Cada alteração atualiza imediatamente a aparência apresentada na tela.

O resultado é um personagem composto, e não uma imagem enviada pelo usuário.

O avatar pode ser alterado fora das partidas, mantendo uma apresentação consistente durante as rodadas.

---

## 4. Sistema de salas multiplayer

As partidas acontecem dentro de salas independentes.

Uma sala reúne os jogadores, concentra suas configurações e coordena o andamento da partida.

### 4.1 Criação de sala

Um jogador cria uma sala e torna-se seu anfitrião, também chamado de dono da sala.

A sala possui um identificador próprio e pode ser compartilhada por meio de um link de convite.

Os demais participantes entram diretamente pelo convite, utilizando seus nicknames e avatares.

Não existe necessidade de criar uma conta para hospedar ou participar.

### 4.2 Sala de espera

Antes de começar a partida, os participantes ficam reunidos em um lobby.

O lobby apresenta os jogadores conectados, seus nicknames, avatares e as informações principais da partida.

O anfitrião possui acesso às configurações, enquanto os demais participantes conseguem visualizar as regras estabelecidas.

A partida começa quando o anfitrião inicia o jogo e existe uma quantidade suficiente de participantes para o modo selecionado.

### 4.3 Funções do anfitrião

O anfitrião possui responsabilidades diferentes das dos demais jogadores.

Entre suas atribuições estão:

- Definir as configurações da partida.
- Selecionar o modo de jogo disponível.
- Iniciar a partida.
- Gerenciar participantes na sala de espera.
- Controlar a apresentação final das histórias.
- Iniciar uma nova partida com o mesmo grupo.

O controle da apresentação permanece centralizado no anfitrião, evitando que diferentes participantes avancem as histórias em momentos diferentes.

### 4.4 Persistência da sala

As salas existem independentemente de contas permanentes.

Uma desconexão temporária não significa necessariamente que o participante perdeu sua posição na partida.

Se o jogador retornar com a mesma sessão válida, sua participação pode ser recuperada.

Caso o anfitrião abandone definitivamente a sala, o controle pode ser transferido a outro participante conectado, preservando a continuidade da experiência.

As salas não são espaços de armazenamento permanente. Sua existência está relacionada à sessão multiplayer e à apresentação dos resultados.

### 4.5 Partidas em andamento

A composição dos participantes fica definida no início da partida.

Novos jogadores não passam a integrar uma história que já começou, pois isso alteraria a distribuição das contribuições e a quantidade de quadros.

A entrada de novos participantes fica associada à próxima partida.

---

## 5. Estrutura conceitual do jogo

O jogo é organizado em entidades que representam os elementos fundamentais da experiência.

| Entidade | Significado |
|---|---|
| Jogador | Participante identificado por sessão, nickname e avatar |
| Sala | Ambiente multiplayer que reúne os jogadores |
| Partida | Uma sessão completa de jogo, da criação dos temas à apresentação |
| Tema | Ideia textual que dá origem a uma história |
| História | Conjunto de quadrinhos associados a um tema |
| Quadrinho | Uma contribuição visual individual dentro de uma história |
| Rodada | Período em que os jogadores realizam suas contribuições |
| Apresentação | Etapa final de revelação e visualização das histórias |

Uma partida contém múltiplas histórias.

Cada história é iniciada a partir de um tema escrito por um participante.

As histórias evoluem independentemente, mas compartilham a mesma sequência global de rodadas.

---

# 6. Modo 1 — Quadrinhos Colaborativos

**Modo principal da primeira versão.**

Quadrinhos Colaborativos é o modo central do jogo e representa a experiência principal do produto.

Nesse modo, cada jogador propõe uma ideia, e uma história é formada por quadrinhos produzidos sequencialmente por diferentes participantes.

O resultado é uma coleção de histórias coletivas, cada uma com seu próprio tema, sequência de acontecimentos e conclusão.

## 6.1 Configurações do modo

O anfitrião possui controle sobre as seguintes opções:

| Configuração | Comportamento |
|---|---|
| Quantidade de quadrinhos | Define quantos quadros cada história terá |
| Quantidade fixa | O anfitrião escolhe um número específico de quadros |
| Quantidade baseada nos jogadores | Cada história possui tantos quadros quanto jogadores participando da partida |
| Tempo por quadrinho | Determina a duração disponível para desenhar cada contribuição |

As duas opções de quantidade de quadrinhos são alternativas.

Por exemplo, em uma sala com cinco participantes, utilizar a quantidade baseada nos jogadores resulta em histórias com cinco quadros.

Também é possível definir uma quantidade independente de participantes, como três, seis ou oito quadros por história.

A quantidade escolhida vale igualmente para todas as histórias da partida.

## 6.2 Etapa de criação dos temas

No início da partida, cada jogador recebe um campo para escrever uma ideia.

Essa ideia funciona como ponto de partida para uma história em quadrinhos.

O conteúdo é livre: uma situação, um personagem, um acontecimento, uma frase ou uma premissa narrativa.

Exemplos:

- Um cavaleiro descobre que seu dragão tem medo de altura.
- Um astronauta encontra uma cafeteria na Lua.
- Um gato decide se candidatar à presidência.
- Um robô tenta entender o significado de amizade.

Cada participante fornece um único tema.

Os temas permanecem separados e dão origem a histórias independentes.

Ao término dessa etapa, o jogo possui uma história inicial para cada participante.

## 6.3 Distribuição das histórias

Após a criação dos temas, cada jogador recebe uma história para desenhar.

A distribuição acontece de maneira que todos realizem uma contribuição por rodada e cada história ativa receba um novo quadrinho.

Na primeira rodada, os jogadores conhecem o tema recebido e produzem o primeiro desenho daquela história.

Quando a rodada termina, as histórias são redistribuídas.

Na rodada seguinte, cada participante recebe outra história, contendo as contribuições anteriores.

Dessa maneira, as histórias circulam entre os participantes ao longo da partida.

Sempre que possível, a distribuição evita atribuir a mesma história ao mesmo jogador em rodadas consecutivas.

Quando existem mais quadrinhos do que participantes, os jogadores podem voltar a contribuir para histórias em que já trabalharam, respeitando a sequência narrativa.

## 6.4 Primeira rodada de desenho

Na primeira rodada, uma história ainda não possui quadrinhos anteriores.

Por isso, o jogador recebe somente o tema e o espaço destinado ao primeiro quadrinho.

O primeiro desenho estabelece visualmente o início da história.

O participante pode interpretar o tema livremente, criando personagens, acontecimentos ou cenários.

Não existe necessidade de respeitar uma estética específica.

## 6.5 Rodadas seguintes — leitura da história

A partir da segunda rodada, cada jogador recebe uma história com quadrinhos já produzidos.

Antes de desenhar, existe uma etapa de visualização.

Nessa etapa, os quadrinhos anteriores são apresentados juntos, em sequência, utilizando uma composição de página de história em quadrinhos.

O jogador consegue compreender o desenvolvimento narrativo, reconhecer acontecimentos e escolher como pretende continuar.

Essa visualização funciona como uma fase de leitura e preparação.

### Confirmação para começar a desenhar

Para passar da leitura ao desenho, o jogador precisa pressionar um botão de confirmação, como **Começar a desenhar**.

Após a confirmação:

- A visualização dos quadrinhos anteriores desaparece.
- O jogador passa a visualizar somente o espaço de desenho atual e as informações permitidas da rodada.
- Não existe botão para retornar à visualização anterior.
- Os quadros anteriores permanecem indisponíveis até a apresentação final.

Essa regra é uma característica central do modo.

O participante precisa observar, interpretar e memorizar o que aconteceu na história antes de começar sua contribuição.

O objetivo é permitir que pequenas alterações de memória, interpretações individuais e improvisações influenciem naturalmente o desenvolvimento da narrativa.

O desenho não acontece com os quadros anteriores permanentemente visíveis.

### Tempo e preparação

A preparação para desenhar e o período efetivo de desenho são etapas distintas.

O tempo de desenho configurado é compartilhado pelos participantes da rodada, mantendo condições equivalentes de criação.

A transição entre leitura e desenho é coordenada para evitar que participantes obtenham tempo adicional simplesmente por permanecerem indefinidamente na visualização.

## 6.6 Editor de desenho

O editor é um espaço de criação visual simples e acessível.

A superfície central é uma tela de desenho que representa o quadrinho atual.

A experiência privilegia desenhos rápidos e expressivos em vez de ferramentas avançadas de ilustração.

### Recursos principais

O editor contempla ferramentas fundamentais:

- Pincel para desenho livre.
- Borracha.
- Seleção de cores.
- Ajuste de espessura do traço.
- Desfazer a última ação.
- Refazer ações desfeitas.
- Limpar o quadrinho.
- Concluir a contribuição antes do término do tempo.

Os comandos são apresentados de maneira compacta, mantendo o espaço de desenho como foco principal.

Os desenhos são produzidos diretamente no navegador.

A experiência considera tanto a precisão do mouse quanto as interações por toque.

### Estado do desenho

O trabalho realizado pelo participante pertence ao quadrinho atualmente atribuído.

As contribuições permanecem associadas à história correspondente, mesmo após sua redistribuição entre jogadores.

Depois da conclusão de uma rodada, o quadrinho passa a fazer parte da sequência narrativa e deixa de ser editável por outros participantes.

## 6.7 Tempo de desenho

Cada quadrinho possui um limite de tempo definido pelo anfitrião.

Durante a etapa de desenho, todos os jogadores acompanham um indicador de tempo restante.

O encerramento da rodada acontece quando o tempo global chega ao fim, mesmo que alguns participantes não tenham concluído manualmente.

Desenhos parcialmente realizados são preservados como contribuições parciais.

Participantes que terminam antes do prazo entram em um estado de espera, sem acessar antecipadamente os resultados dos demais.

A rodada seguinte começa de maneira sincronizada para todos os participantes.

## 6.8 Evolução das histórias

Cada nova rodada adiciona exatamente uma posição à sequência de quadrinhos de cada história.

Os desenhos anteriores não são substituídos.

Assim, uma história cresce progressivamente:

**Tema → Quadrinho 1 → Quadrinho 2 → Quadrinho 3 → ... → Quadrinho final**

A quantidade total de posições é estabelecida antes do início da partida.

Quando todas as histórias atingem o número configurado de rodadas, a etapa de criação termina.

A partida passa então para a apresentação coletiva.

## 6.9 Exemplo de partida

Uma sala possui cinco jogadores:

**Ana, Bruno, Carla, Diego e Elisa.**

O anfitrião escolhe cinco quadrinhos por história e dois minutos de desenho por quadrinho.

Cada jogador escreve uma ideia.

Assim, são criadas cinco histórias diferentes.

Durante a primeira rodada, os cinco jogadores desenham simultaneamente o primeiro quadrinho das histórias que receberam.

Na segunda rodada, as histórias são distribuídas novamente.

Cada jogador visualiza os primeiros quadros da nova história recebida, confirma que está pronto e desenha sua continuação sem poder consultar novamente os quadros anteriores.

O processo continua até a quinta rodada.

Ao final, existem cinco histórias, cada uma formada por cinco quadrinhos, totalizando 25 contribuições visuais.

O resultado representa o trabalho coletivo do grupo.

---

# 7. Formato visual das histórias em quadrinhos

A identidade central do jogo está na apresentação dos desenhos como histórias em quadrinhos, e não simplesmente como uma coleção de imagens isoladas.

Cada história possui uma sequência visual de quadros organizada em uma mesma composição.

## 7.1 Organização dos quadrinhos

Os quadrinhos são apresentados em ordem narrativa.

A disposição visual utiliza linhas e colunas, com separações claramente identificáveis entre os quadros.

A composição lembra uma página tradicional de HQ, mantendo margens e espaçamentos consistentes.

Um exemplo de história com cinco quadros:

```text
┌───────────────┬───────────────┐
│               │               │
│   QUADRO 1    │   QUADRO 2    │
│               │               │
├───────────────┼───────────────┤
│               │               │
│   QUADRO 3    │   QUADRO 4    │
│               │               │
├───────────────┴───────────────┤
│                               │
│           QUADRO 5            │
│                               │
└───────────────────────────────┘
```

A organização se adapta à quantidade de quadros selecionada.

A ordem de leitura permanece previsível, independentemente do tamanho da história.

## 7.2 Composição dinâmica

A quantidade de quadros não determina uma única organização visual fixa.

Histórias curtas podem utilizar uma única linha ou uma grade compacta.

Histórias maiores podem utilizar diversas linhas ou páginas, sem prejudicar a leitura ou distorcer as proporções dos desenhos.

O sistema mantém os quadros individualmente identificáveis, mas apresenta a história como uma unidade visual.

## 7.3 Visualização durante a partida

Na etapa de leitura de uma rodada, todos os quadros anteriores daquela história aparecem simultaneamente na composição de HQ.

A visualização permite compreender a continuidade narrativa em uma única tela ou área de leitura.

Depois da confirmação para começar a desenhar, essa composição deixa de estar acessível ao jogador durante a rodada.

Na apresentação final, todos os quadros voltam a aparecer juntos, formando a história completa.

---

# 8. Apresentação final das histórias

A apresentação é a etapa social que encerra a partida.

Seu funcionamento é inspirado na apresentação final do Gartic Phone.

Todos os participantes passam a acompanhar a mesma história, no mesmo momento, com o controle centralizado no anfitrião.

## 8.1 Painel de apresentação

Ao término da última rodada, o jogo entra no estado de apresentação.

A interface de desenho é substituída por um ambiente destinado à visualização dos resultados.

O painel possui uma área principal de exibição dos quadrinhos, informações sobre a história e controles disponíveis ao anfitrião.

Os participantes acompanham o conteúdo sincronizado.

## 8.2 Revelação progressiva

Cada história é apresentada separadamente.

Primeiro, o tema original aparece, permitindo que todos conheçam a premissa que deu origem aos desenhos.

Depois, os quadrinhos são revelados individualmente, respeitando a ordem narrativa.

A cada avanço do anfitrião, o próximo quadrinho é apresentado.

O painel também pode identificar o jogador responsável pelo quadro exibido.

Esse formato permite que os participantes reajam a cada acontecimento, percebam mudanças inesperadas na narrativa e descubram como os demais interpretaram os desenhos anteriores.

## 8.3 Revelação da história completa

Depois que todos os quadrinhos individuais foram apresentados, a história inteira é revelada.

Todos os quadros aparecem simultaneamente, organizados na composição final de HQ.

Essa é a principal visualização do resultado.

Os jogadores conseguem observar a narrativa completa e perceber como a história evoluiu desde o primeiro desenho.

A apresentação permanece nessa composição até que o anfitrião avance.

## 8.4 Controles do anfitrião

O anfitrião controla a progressão da apresentação.

O painel permite:

- Avançar para o próximo quadrinho.
- Voltar para um quadrinho anterior.
- Exibir a história completa.
- Passar para a próxima história.
- Revisitar histórias já apresentadas.
- Encerrar a apresentação.

Todos os participantes visualizam a mesma etapa selecionada.

Nenhum jogador precisa avançar individualmente.

## 8.5 Encerramento

Após a apresentação de todas as histórias, a partida é considerada concluída.

A sala permanece disponível para que o grupo continue reunido.

O anfitrião pode iniciar outra partida, utilizando as configurações existentes ou alterando-as.

Uma nova partida representa um novo conjunto de temas, histórias e desenhos.

---

# 9. Modo 2 — Quadrinhos Individuais

**Modo previsto para uma versão posterior. Não faz parte do foco da primeira versão.**

O segundo modo utiliza os mesmos conceitos de temas, quadros e histórias, mas altera a dinâmica de contribuição.

Em vez de diferentes participantes produzirem sequencialmente os quadrinhos de uma mesma história, cada jogador desenha uma história completa sozinho.

O objetivo é observar como diferentes pessoas interpretam uma mesma ideia.

## 9.1 Criação dos temas

Assim como no primeiro modo, todos os jogadores escrevem um tema ou premissa narrativa.

Cada tema representa uma história independente a ser interpretada.

## 9.2 Distribuição das histórias

Após a criação dos temas, cada jogador recebe uma proposta.

O participante possui um período de tempo para desenhar todos os quadrinhos daquela história.

Diferentemente do modo colaborativo, o jogador controla a narrativa completa, do início ao fim.

Todos os quadros da história ficam disponíveis no ambiente de criação.

## 9.3 Rodadas

Ao término do tempo, o conjunto de quadros produzido pelo jogador é encerrado.

Na rodada seguinte, o participante recebe outro tema.

O processo se repete até que todos os jogadores tenham desenhado uma versão de cada história proposta.

Os temas circulam entre os participantes, mas os desenhos realizados anteriormente por outros jogadores não são utilizados como continuação.

Cada versão é independente.

## 9.4 Configurações

O modo possui configurações próprias relacionadas à quantidade de quadros de cada história e ao tempo total disponível para desenhar a história completa.

O limite temporal se aplica ao conjunto de quadrinhos, e não separadamente a cada quadro.

## 9.5 Resultado final

A apresentação final mantém a estrutura central utilizada pelo primeiro modo.

O anfitrião seleciona uma história produzida por um jogador, revela seus quadros individualmente e depois exibe a composição completa.

Como diversos jogadores interpretaram os mesmos temas, a apresentação também permite observar diferentes versões narrativas de uma mesma ideia.

O resultado enfatiza o contraste entre criatividade, estilo e interpretação.

---

# 10. Estados e fluxo da experiência

A aplicação possui diferentes estados que representam os momentos da interação.

| Estado | Experiência do usuário |
|---|---|
| Entrada | Escolha ou confirmação de nickname e avatar |
| Personalização | Edição visual do avatar |
| Lobby | Reunião dos jogadores e configuração da partida |
| Criação de temas | Cada participante escreve sua ideia |
| Preparação da rodada | Leitura da história e confirmação para desenhar |
| Desenho | Criação do quadrinho dentro do tempo permitido |
| Espera | Participante aguarda o encerramento da rodada |
| Transição | Histórias são redistribuídas para a próxima rodada |
| Apresentação | Resultados revelados pelo anfitrião |
| Encerramento | Retorno ao ambiente da sala para uma nova partida |

A progressão ocorre de maneira sincronizada.

Os jogadores podem estar em estados individuais diferentes, como desenhando ou aguardando, enquanto a sala permanece em uma mesma etapa global.

O andamento da partida é coordenado de maneira centralizada, impedindo divergências na ordem dos quadros, nos tempos de rodada e na apresentação.

---

# 11. Interface e experiência do usuário

A interface segue uma proposta simples, moderna e intuitiva.

O jogo possui poucos ambientes principais, cada um com uma função clara.

## 11.1 Tela inicial

A entrada apresenta a identidade do jogo e dois caminhos principais:

**Criar sala** e **Entrar em sala**.

A identificação do jogador acontece de maneira integrada, sem páginas de autenticação.

## 11.2 Personalização

A interface apresenta uma prévia do avatar e as categorias disponíveis.

A seleção é visual, evitando menus complexos.

O nickname é apresentado junto ao avatar, permitindo que o jogador compreenda como será identificado pelos demais.

## 11.3 Lobby

O lobby apresenta uma coleção de cartões de jogadores com seus avatares e nicknames.

As configurações ficam acessíveis ao anfitrião em uma área específica.

Os demais participantes acompanham as escolhas de configuração sem precisar navegar por diversas telas.

O botão de início da partida é destacado somente para o anfitrião.

## 11.4 Tela de desenho

A maior parte do espaço disponível é destinada ao quadrinho.

As ferramentas de desenho ocupam uma região compacta.

O indicador de tempo permanece visível, assim como uma identificação da rodada e uma referência textual ao tema da história quando aplicável.

A interface evita distrações enquanto o participante está desenhando.

## 11.5 Tela de leitura

A leitura prioriza a apresentação dos quadros já existentes.

A sequência aparece organizada em formato de HQ, seguida de um controle claro para começar a desenhar.

Essa interface é propositalmente diferente da interface de desenho, reforçando que a leitura é uma etapa separada.

## 11.6 Tela de espera

Após concluir um quadrinho, o jogador visualiza um estado de espera.

A interface comunica que sua contribuição foi recebida e que a rodada continua em andamento.

O participante não recebe acesso antecipado aos desenhos dos demais.

## 11.7 Tela de apresentação

A apresentação privilegia imagens grandes, navegação simples e sincronização.

O anfitrião possui controles discretos, enquanto os demais jogadores visualizam os resultados sem elementos desnecessários.

A composição final de cada HQ recebe destaque especial.

---

# 12. Regras de consistência multiplayer

A experiência é baseada em partidas sincronizadas.

Todos os participantes compartilham uma referência comum sobre a etapa atual, o tempo restante, a distribuição de histórias e os resultados.

### Sincronização das rodadas

O encerramento de uma rodada acontece para a sala inteira.

Jogadores que terminam antecipadamente aguardam os demais.

### Integridade das histórias

Cada quadrinho pertence a uma posição determinada de uma história.

A ordem narrativa não depende da velocidade de conexão ou do momento em que o jogador terminou seu desenho.

### Privacidade dos desenhos durante a partida

Um jogador só pode visualizar os desenhos anteriores nos momentos permitidos pelas regras.

Depois de começar a desenhar, os quadros anteriores não ficam acessíveis dentro da sessão daquela rodada.

Os desenhos das demais histórias permanecem ocultos até serem atribuídos ou apresentados.

### Desconexões

Interrupções temporárias de conexão não interrompem automaticamente toda a partida.

A sessão permite a recuperação de participação quando o jogador retorna.

Se uma contribuição não for concluída, o conteúdo recebido até o encerramento da rodada pode permanecer como resultado parcial.

A ausência prolongada de um participante não impede indefinidamente o andamento da partida.

### Controle de tempo

O tempo restante é determinado pelo estado compartilhado da partida, evitando diferenças relevantes entre jogadores.

### Controle do anfitrião

As ações exclusivas do anfitrião são reconhecidas pela sessão que possui essa função.

Os demais jogadores não possuem autorização para alterar arbitrariamente as configurações ou o andamento da apresentação.

---

# 13. Identidade visual e recursos gráficos

O projeto possui duas categorias principais de recursos gráficos:

**Elementos da interface:** botões, menus, cartões de jogador, controles, indicadores de tempo e componentes de navegação.

**Elementos personalizáveis:** artes que compõem os avatares dos jogadores.

Os recursos de avatar são fornecidos posteriormente pelo criador do projeto.

A aparência da interface não depende da finalização desses recursos, e a personalização mantém sua estrutura mesmo com uma coleção inicial pequena de opções.

O jogo também possui uma linguagem visual própria para as páginas de quadrinhos, com margens, divisões e composição de quadros consistentes.

Essa linguagem visual serve como elemento de identidade do produto.

---

# 14. Arquitetura e stack tecnológico

A aplicação é concebida como um produto web multiplayer em tempo real, com separação clara entre interface, regras do jogo, comunicação e armazenamento.

A proposta utiliza uma stack moderna e amplamente consolidada no ecossistema web, com **TypeScript como linguagem principal**.

## 14.1 Stack de referência

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript |
| Interface web | React |
| Ferramenta de build | Vite |
| Estilização | CSS com Tailwind CSS |
| Backend | Node.js com Fastify |
| Multiplayer em tempo real | Socket.IO sobre WebSockets |
| Persistência | PostgreSQL |
| Renderização dos desenhos | Canvas 2D API |
| Testes | Vitest |
| Arquitetura | Monólito modular |

A aplicação apresenta uma estrutura de frontend e backend independentes em suas responsabilidades, mas integrantes de um mesmo produto.

O navegador concentra a interface, personalização e interação com o editor.

O servidor concentra a autoridade sobre sessões, salas, distribuição das histórias, cronômetros e andamento das partidas.

A comunicação em tempo real permite que mudanças relevantes sejam refletidas para todos os jogadores conectados.

O armazenamento contempla dados temporários de partidas e os recursos necessários para sustentar sua continuidade.

## 14.2 Arquitetura modular

O projeto segue o conceito de **monólito modular**.

Os diferentes domínios possuem responsabilidades separadas, sem a complexidade operacional de uma arquitetura de microsserviços.

Os principais domínios conceituais são:

| Domínio | Responsabilidade |
|---|---|
| Identidade de convidado | Nickname, avatar e reconhecimento temporário |
| Salas | Criação, convites, participantes e anfitrião |
| Partidas | Estados gerais e ciclo de vida do jogo |
| Modos de jogo | Regras particulares de cada modalidade |
| Histórias | Temas e sequências narrativas |
| Desenho | Ferramentas, superfície e conteúdo dos quadrinhos |
| Tempo | Duração e sincronização das rodadas |
| Apresentação | Revelação e navegação dos resultados |
| Recursos visuais | Elementos de avatar e demais artes |

A separação dos modos de jogo é especialmente importante para a identidade do projeto.

Ambos compartilham salas, identidade de jogadores, desenho e apresentação, mas possuem regras diferentes para distribuição das histórias e produção dos quadrinhos.

Essa organização permite que cada modalidade possua um comportamento próprio sem duplicar desnecessariamente os sistemas compartilhados.

## 14.3 Clean Code

A organização do código segue os princípios de Clean Code, com ênfase em legibilidade, responsabilidade única, nomes claros, consistência e baixo acoplamento entre módulos.

O comportamento das regras de jogo é independente dos detalhes visuais das interfaces.

As responsabilidades de sessão multiplayer e de apresentação visual também permanecem distintas.

A arquitetura privilegia simplicidade e manutenção, evitando abstrações desnecessárias ou camadas cuja complexidade seja maior do que o benefício real para o projeto.

## 14.4 Integração com site externo

O jogo possui independência de interface e de funcionamento em relação ao site público no qual será integrado.

Ele pode utilizar uma rota própria, como uma seção dedicada, mantendo a identidade e a navegação visual do site principal.

A interface web e a comunicação multiplayer são responsabilidades distintas, permitindo que a apresentação do jogo seja integrada a outro site sem depender de um sistema de contas desse site.

O serviço responsável pelas partidas mantém suas próprias sessões temporárias de convidados.

---

# 15. Dados, privacidade e segurança

A aplicação não exige identificação pessoal, e-mail ou senha.

Os dados necessários à experiência são limitados principalmente a:

- Nickname e configurações do avatar.
- Identificadores temporários de sessão e sala.
- Configurações das partidas.
- Temas escritos pelos jogadores.
- Desenhos e composições de histórias.
- Estados e resultados temporários das partidas.

As informações persistidas no navegador, como preferências do avatar, são distintas dos dados utilizados para coordenar uma partida.

O conteúdo produzido durante uma sessão não é automaticamente publicado no site principal.

As salas são ambientes acessados por convite, embora o convite não represente uma garantia absoluta de privacidade caso o link seja compartilhado.

A comunicação multiplayer considera a validação dos dados recebidos, o controle de acesso às sessões e a proteção contra manipulação indevida dos estados das partidas.

A ausência de contas não elimina os controles necessários sobre participação, ações exclusivas do anfitrião e acesso às informações ocultas durante as rodadas.

O armazenamento dos resultados é temporário por padrão, sem constituir uma biblioteca permanente de histórias vinculada aos usuários.

---

# 16. Escopo funcional da primeira versão

A primeira versão representa um produto jogável completo, concentrado exclusivamente no modo Quadrinhos Colaborativos.

### Funcionalidades incluídas

**Identidade e entrada**
- Nickname sem cadastro.
- Avatar personalizável nas seis categorias definidas.
- Persistência local das preferências de identidade.

**Salas multiplayer**
- Criação de salas.
- Entrada por convite.
- Lobby com participantes.
- Anfitrião e configurações da partida.
- Sessões temporárias.

**Quadrinhos Colaborativos**
- Criação individual de temas.
- Distribuição e circulação de histórias.
- Configuração de quantidade de quadros.
- Quantidade baseada nos participantes.
- Configuração de tempo por quadrinho.
- Leitura dos quadros anteriores.
- Confirmação para iniciar o desenho.
- Bloqueio de retorno aos quadros anteriores.
- Editor de desenho.
- Rodadas sincronizadas.
- Composição das histórias em formato de HQ.

**Apresentação**
- Controle exclusivo do anfitrião.
- Revelação progressiva dos quadrinhos.
- Visualização das histórias completas.
- Navegação entre histórias.
- Encerramento e nova partida.

### Funcionalidades fora da primeira versão

O escopo inicial não contempla contas, perfis públicos, rankings, pontuação, moedas, loja de cosméticos, conquistas, matchmaking público, feed social ou editor profissional de ilustrações.

O modo Quadrinhos Individuais integra a visão geral do produto, mas não o escopo jogável inicial.

Esses limites preservam a proposta principal: oferecer uma experiência multiplayer de desenho de histórias em quadrinhos que seja completa, simples e divertida.

---

# 17. Identidade e diferencial do jogo

O jogo possui semelhanças com Gartic Phone por reunir jogadores em salas, utilizar rodadas de criação e revelar os resultados em uma apresentação controlada pelo anfitrião.

Seu diferencial está na estrutura narrativa.

Os desenhos não são apenas respostas individuais a uma palavra ou frase. Eles representam acontecimentos consecutivos dentro de uma história.

Cada contribuição altera o contexto que será recebido pelo próximo jogador.

A necessidade de memorizar os quadrinhos anteriores acrescenta imprevisibilidade à continuidade narrativa.

A composição visual final transforma essas contribuições em uma história em quadrinhos coletiva, permitindo que todos acompanhem o resultado como uma obra única.

O sistema de avatares reforça a identidade dos participantes e oferece espaço para uma linguagem artística própria.

O formato web, aliado à ausência de cadastro, reduz as barreiras de entrada e favorece partidas espontâneas entre amigos.

## 18. Resumo da proposta

O projeto é um jogo multiplayer de navegador no qual participantes criam histórias em quadrinhos coletivamente.

Cada jogador entra com um nickname e um avatar personalizável, participa de uma sala privada e escreve uma ideia original.

No modo principal, as histórias circulam entre jogadores ao longo de rodadas, recebendo um novo quadrinho de cada participante atribuído.

Antes de desenhar, o jogador consegue visualizar os quadros anteriores organizados como uma HQ. Depois de confirmar o início do desenho, perde acesso a essas referências até o encerramento da partida.

As histórias são construídas gradualmente e apresentadas ao grupo no final, com revelação individual de cada quadro e posterior exibição da composição completa.

A aplicação é estruturada como um produto web independente, baseado em TypeScript, arquitetura modular e princípios de Clean Code, preparado para integração futura com um site público e para receber novos modos de jogo sem comprometer a simplicidade da primeira versão.

**Essência do projeto:** transformar a criatividade e a memória imperfeita de um grupo de amigos em histórias em quadrinhos inesperadas, engraçadas e coletivas.