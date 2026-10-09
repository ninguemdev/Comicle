import { MAX_PLAYERS, MIN_PLAYERS, type ErrorCode } from '@comicle/shared';

import type { DrawingColorId } from '../features/drawing/engine/palette';

const SECONDS_PER_MINUTE = 60;

/** 90 → "1 min 30 s". */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const rest = seconds % SECONDS_PER_MINUTE;
  if (minutes === 0) {
    return `${String(rest)} s`;
  }
  return rest === 0 ? `${String(minutes)} min` : `${String(minutes)} min ${String(rest)} s`;
}

/** Final text of each error code; the server `message` is only a fallback (protocolo §2). */
export const errorMessages = {
  INVALID_PAYLOAD: 'Algo no pedido não estava certo. Tente de novo.',
  UNAUTHORIZED: 'Sua sessão expirou. Recarregue a página.',
  RATE_LIMITED: 'Calma! Muitas ações seguidas. Aguarde um instante.',
  ROOM_NOT_FOUND: 'Sala não encontrada. Confira o código.',
  ROOM_FULL: 'Esta sala já está cheia.',
  ROOM_CLOSED: 'Esta sala foi encerrada.',
  KICKED: 'Você foi removido desta sala pelo anfitrião.',
  NOT_IN_ROOM: 'Você não está nesta sala.',
  NOT_HOST: 'Só o anfitrião pode fazer isso.',
  FORBIDDEN: 'Você não pode ver isso agora.',
  PANEL_NOT_FOUND: 'Quadro não encontrado.',
  INVALID_STATE: 'Isso não pode ser feito agora.',
  NOT_ENOUGH_PLAYERS: `Precisa de pelo menos ${String(MIN_PLAYERS)} jogadores.`,
  DEADLINE_PASSED: 'O tempo acabou.',
  IMAGE_INVALID: 'Não foi possível ler o desenho.',
  IMAGE_TOO_LARGE: 'O desenho ficou grande demais para enviar.',
  INTERNAL: 'Algo deu errado. Tente de novo.',
} as const satisfies Record<ErrorCode, string>;

export const strings = {
  app: {
    title: 'Comicle',
    tagline: 'Histórias em quadrinhos feitas a muitas mãos',
  },
  connection: {
    reconnecting: 'Reconectando…',
    offline: 'Sem conexão com o servidor.',
    retry: 'Tentar de novo',
    serverUnreachable: 'Não foi possível falar com o servidor.',
    ackTimeout: 'O servidor demorou para responder. Tente de novo.',
  },
  ui: {
    close: 'Fechar',
    timer: {
      label: 'Tempo restante',
      secondsLeft: (seconds: number) => `Faltam ${String(seconds)} segundos`,
      timeUp: 'Tempo esgotado!',
    },
    progress: {
      ready: (done: number, total: number) => `${String(done)}/${String(total)} prontos`,
    },
    player: {
      host: 'Anfitrião',
      self: '(você)',
      disconnected: 'desconectado',
      working: 'em andamento',
      done: 'pronto',
    },
  },
  home: {
    editProfile: 'Editar perfil',
    noNickname: 'Escolha um apelido para jogar',
    createRoom: 'Criar sala',
    creating: 'Criando…',
    joinTitle: 'Entrar em sala',
    codeLabel: 'Código da sala',
    codePlaceholder: 'EX.: K7PQ2M',
    join: 'Entrar',
  },
  avatar: {
    of: (nickname: string) => `Avatar de ${nickname}`,
    preview: 'Prévia do seu avatar',
    parts: 'Partes do avatar',
    none: 'Nenhum',
    random: 'Aleatório',
  },
  profile: {
    title: 'Seu perfil',
    nicknameLabel: 'Apelido',
    nicknamePlaceholder: 'Como a turma vai te chamar?',
    nicknameCounter: (length: number, max: number) => `${String(length)}/${String(max)}`,
    nicknameEmpty: 'Escolha um apelido.',
    nicknameTooLong: (max: number) => `Use no máximo ${String(max)} caracteres.`,
    save: 'Salvar',
    cancel: 'Cancelar',
  },
  room: {
    title: (code: string) => `Sala ${code}`,
    joining: 'Entrando na sala…',
    inviteLabel: 'Link de convite',
    copyInvite: 'Copiar convite',
    inviteCopied: 'Convite copiado!',
    copyFailed: 'Não deu para copiar. Selecione o link e copie.',
    players: (count: number) => `Jogadores (${String(count)}/${String(MAX_PLAYERS)})`,
    leave: 'Sair da sala',
    editProfile: 'Editar perfil',
    start: 'Iniciar partida',
    kick: (nickname: string) => `Expulsar ${nickname}`,
    kickTitle: 'Expulsar jogador?',
    kickBody: (nickname: string) =>
      `${nickname} sai da sala e não consegue voltar enquanto ela existir.`,
    kickConfirm: 'Expulsar',
    cancel: 'Cancelar',
    spectating: 'Partida em andamento: você entra na próxima.',
    retry: 'Tentar de novo',
    settings: {
      title: 'Configurações',
      hostOnly: 'Só o anfitrião muda as configurações.',
      panelCount: 'Quantidade de quadros',
      perPlayer: 'Baseada nos jogadores',
      perPlayerHint: '(um quadro por jogador)',
      fixed: 'Fixa',
      fixedValue: 'Quadros por história',
      panels: (count: number) => `${String(count)} quadros`,
      drawingSeconds: 'Tempo por quadrinho',
      duration: formatDuration,
      mode: 'Modo',
      collaborative: 'Colaborativo',
      individual: 'Individual',
      soon: 'Em breve',
    },
    problems: {
      notFound: {
        title: 'Sala não encontrada',
        message: 'Confira o código ou peça um convite novo.',
      },
      full: {
        title: 'Sala cheia',
        message: `Esta sala já tem ${String(MAX_PLAYERS)} jogadores.`,
      },
      kicked: {
        title: 'Você foi removido',
        message: 'O anfitrião tirou você desta sala.',
      },
      closed: {
        title: 'Sala encerrada',
        message: 'Esta sala foi encerrada.',
      },
      replaced: {
        title: 'Sala aberta em outro lugar',
        message: 'Você entrou nesta sala em outra aba ou aparelho. Continue por lá.',
      },
      failed: {
        title: 'Não deu para entrar',
        message: 'Algo deu errado ao entrar na sala.',
      },
    },
  },
  notFound: {
    code: '404',
    title: 'Página não encontrada',
    bubble: 'Ops! Esta página saiu do quadrinho.',
  },
  routeError: {
    title: 'Algo deu errado',
    bubble: 'Um borrão de tinta estragou esta página.',
  },
  navigation: {
    backHome: 'Voltar ao início',
  },
  drawing: {
    canvas: 'Área de desenho',
    toolbar: 'Ferramentas de desenho',
    tools: 'Ferramenta',
    history: 'Histórico',
    brush: 'Pincel (B)',
    eraser: 'Borracha (E)',
    colors: 'Cores',
    showColors: 'Escolher cor',
    customColor: 'Cor livre',
    colorNames: {
      black: 'Preto',
      white: 'Branco',
      gray: 'Cinza',
      silver: 'Cinza-claro',
      red: 'Vermelho',
      orange: 'Laranja',
      yellow: 'Amarelo',
      green: 'Verde',
      cyan: 'Ciano',
      blue: 'Azul',
      indigo: 'Anil',
      purple: 'Roxo',
      pink: 'Rosa',
      brown: 'Marrom',
      skin: 'Pele',
      darkBrown: 'Marrom-escuro',
    } satisfies Record<DrawingColorId, string>,
    sizes: 'Espessura ([ e ])',
    size: (pixels: number) => `Espessura ${String(pixels)}`,
    undo: 'Desfazer (Ctrl+Z)',
    redo: 'Refazer (Ctrl+Shift+Z)',
    clear: 'Limpar',
    clearTitle: 'Limpar o quadro?',
    clearBody: 'Tudo o que está na tela some. Dá para desfazer depois.',
    clearConfirm: 'Limpar',
    cancel: 'Cancelar',
  },
  devEditor: {
    title: 'Editor de desenho',
    intro: 'Editor isolado da partida, visível só em desenvolvimento.',
    export: 'Exportar PNG',
    empty: 'Quadro vazio: nada a exportar.',
    exported: (width: number, height: number, bytes: number) =>
      `PNG de ${String(width)}×${String(height)}, ${(bytes / 1024).toFixed(1)} KB`,
    preview: 'PNG exportado',
    useAsBase: 'Usar como base',
    disable: 'Desabilitar',
    enable: 'Habilitar',
    revision: (revision: number) => `Revisão ${String(revision)}`,
  },
  devUi: {
    title: 'Componentes',
    intro: 'Vitrine do design system, visível só em desenvolvimento.',
    sections: {
      buttons: 'Botões',
      card: 'Cartão',
      dialog: 'Diálogo',
      timer: 'Tempo',
      progress: 'Progresso',
      speechBubble: 'Balão de fala',
      players: 'Jogadores',
      toast: 'Aviso',
      connection: 'Faixa de conexão',
      avatars: 'Avatares',
    },
    avatars: {
      shuffle: 'Sortear outro',
      sizes: 'Tamanhos: 32, 64, 160 e 256 px',
      catalog: 'Todas as artes do catálogo',
    },
    buttons: {
      primary: 'Criar sala',
      secondary: 'Entrar em sala',
      danger: 'Expulsar',
      ghost: 'Cancelar',
      disabled: 'Iniciar',
    },
    card: {
      title: 'Quadro 3 de 5',
      body: 'Um cientista descobre que o gato dele fala, mas só às terças.',
    },
    dialog: {
      open: 'Abrir diálogo',
      title: 'Sair da sala?',
      body: 'Você pode voltar pelo convite enquanto a sala existir.',
      cancel: 'Cancelar',
      confirm: 'Sair',
    },
    timer: {
      restartLong: 'Reiniciar com 90 s',
      restartShort: 'Reiniciar com 12 s',
    },
    speechBubble: 'Guarde bem na memória… você não verá estes quadros de novo!',
    players: ['Ana', 'Bruno', 'Carla', 'Diego'],
    toast: {
      show: 'Mostrar aviso',
      showError: 'Mostrar erro',
      message: 'Convite copiado!',
    },
  },
} as const;
