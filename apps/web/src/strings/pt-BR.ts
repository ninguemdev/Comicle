import { MIN_PLAYERS, type ErrorCode } from '@comicle/shared';

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
    comingSoon: 'Em breve: crie uma sala e chame os amigos para desenhar.',
    editProfile: 'Editar perfil',
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
    comingSoon: 'O lobby chega em breve.',
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
