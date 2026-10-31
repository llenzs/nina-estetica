import { Contact, Conversation, MessageDirection, MessageType, StatMetric, TeamMember, Appointment, Deal, KanbanColumn } from "./types";

/**
 * Mock data — Nina Beleza & Estética
 * Vocabulário pensado para clínicas de estética, salões de beleza e profissionais autônomos.
 */

export const STATS: StatMetric[] = [
  { label: 'Atendimentos da Nina hoje', value: '142', trend: '+12%', trendUp: true },
  { label: 'Receita estimada', value: 'R$ 4.250', trend: '+5%', trendUp: true },
  { label: 'Tempo médio de resposta', value: '4m 12s', trend: '-2%', trendUp: true },
  { label: 'Novas clientes interessadas', value: '28', trend: '-5%', trendUp: false },
];

export const MOCK_TEAM: TeamMember[] = [
  {
    id: 't1',
    name: 'Camila Reis',
    email: 'camila@suaclinica.com.br',
    role: 'admin',
    status: 'active',
    avatar: 'https://ui-avatars.com/api/?name=Camila+Reis&background=f43f5e&color=fff',
    lastActive: 'Agora'
  },
  {
    id: 't2',
    name: 'Renata Borges',
    email: 'renata@suaclinica.com.br',
    role: 'manager',
    status: 'active',
    avatar: 'https://ui-avatars.com/api/?name=Renata+Borges&background=f59e0b&color=fff',
    lastActive: 'Há 5 min'
  },
  {
    id: 't3',
    name: 'Júlia Albuquerque',
    email: 'julia@suaclinica.com.br',
    role: 'agent',
    status: 'invited',
    avatar: 'https://ui-avatars.com/api/?name=Julia+Albuquerque&background=ec4899&color=fff',
    lastActive: '-'
  },
];

export const MOCK_CONTACTS: Contact[] = [
  { id: '1', name: 'Ana Silva', phone: '+55 11 99999-0001', email: 'ana@email.com', status: 'customer', lastContact: '2026-05-19' },
  { id: '2', name: 'Mariana Toledo', phone: '+55 11 99999-0002', email: 'mariana@email.com', status: 'lead', lastContact: '2026-05-20' },
  { id: '3', name: 'Beatriz Costa', phone: '+55 11 99999-0003', email: 'bia@email.com', status: 'churned', lastContact: '2026-04-10' },
  { id: '4', name: 'Patrícia Andrade', phone: '+55 11 99999-0004', email: 'patricia@email.com', status: 'lead', lastContact: '2026-05-20' },
  { id: '5', name: 'Fernanda Lima', phone: '+55 11 99999-0005', email: 'nanda@email.com', status: 'customer', lastContact: '2026-05-21' },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    contactName: 'Mariana Toledo',
    contactPhone: '+55 11 99999-0002',
    contactAvatar: 'https://picsum.photos/seed/mariana/200/200',
    lastMessage: 'Vocês fazem botox na testa? Quanto fica?',
    lastMessageTime: '10:46',
    unreadCount: 2,
    tags: ['Interessada', 'Botox'],
    messages: [
      { id: 'm1', content: 'Oi! Vim pelo Instagram, vocês fazem harmonização?', timestamp: '10:30', direction: MessageDirection.INCOMING, type: MessageType.TEXT, status: 'read' },
      { id: 'm2', content: 'Olá Mariana! Que bom ter você por aqui 💖 Fazemos sim! Você está buscando algo mais sutil ou um resultado mais marcante?', timestamp: '10:32', direction: MessageDirection.OUTGOING, type: MessageType.TEXT, status: 'read' },
      { id: 'm3', content: 'Vocês fazem botox na testa? Quanto fica?', timestamp: '10:42', direction: MessageDirection.INCOMING, type: MessageType.TEXT, status: 'delivered' },
      { id: 'm4', content: 'Sim, fazemos com a Dra. Camila. O valor varia conforme a avaliação. Posso encaixar uma avaliação gratuita esta semana?', timestamp: '10:44', direction: MessageDirection.OUTGOING, type: MessageType.TEXT, status: 'read' },
      { id: 'm5', content: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=1200', timestamp: '10:44', direction: MessageDirection.OUTGOING, type: MessageType.IMAGE, status: 'read' },
      { id: 'm6', content: 'Áudio: dúvida sobre indicação', timestamp: '10:46', direction: MessageDirection.INCOMING, type: MessageType.AUDIO, status: 'delivered' },
    ]
  },
  {
    id: 'c2',
    contactName: 'Ana Silva',
    contactPhone: '+55 11 99999-0001',
    contactAvatar: 'https://picsum.photos/seed/ana/200/200',
    lastMessage: 'Obrigada! Amei o resultado da limpeza 💕',
    lastMessageTime: 'Ontem',
    unreadCount: 0,
    tags: ['Cliente', 'Limpeza de Pele'],
    messages: [
      { id: 'm1', content: 'Já recebi as orientações pós-limpeza, obrigada!', timestamp: '14:20', direction: MessageDirection.INCOMING, type: MessageType.TEXT, status: 'read' },
      { id: 'm2', content: 'Que ótimo, Ana! Lembra de evitar exposição solar nas próximas 24h, tá?', timestamp: '14:25', direction: MessageDirection.OUTGOING, type: MessageType.TEXT, status: 'read' },
      { id: 'm3', content: 'Obrigada! Amei o resultado da limpeza 💕', timestamp: '14:26', direction: MessageDirection.INCOMING, type: MessageType.TEXT, status: 'read' },
    ]
  },
  {
    id: 'c3',
    contactName: 'Patrícia Andrade',
    contactPhone: '+55 11 99999-0004',
    contactAvatar: 'https://picsum.photos/seed/patricia/200/200',
    lastMessage: 'Vou conversar com meu marido e te respondo.',
    lastMessageTime: 'Ontem',
    unreadCount: 0,
    tags: ['Avaliação', 'Drenagem'],
    messages: [
      { id: 'm1', content: 'No pacote de 10 sessões de drenagem fica R$ 1.890 à vista.', timestamp: '16:00', direction: MessageDirection.OUTGOING, type: MessageType.TEXT, status: 'read' },
      { id: 'm2', content: 'Vou conversar com meu marido e te respondo.', timestamp: '16:15', direction: MessageDirection.INCOMING, type: MessageType.TEXT, status: 'read' },
    ]
  }
];

// Gera datas dentro do mês atual
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();

const getDateString = (day: number) => {
    return new Date(currentYear, currentMonth, day).toISOString().split('T')[0];
};

export const MOCK_APPOINTMENTS: Appointment[] = [
    {
        id: 'evt1',
        title: 'Avaliação Facial Gratuita',
        date: getDateString(5),
        time: '14:00',
        duration: 60,
        type: 'demo',
        attendees: ['Mariana Toledo'],
        description: 'Avaliação inicial — interesse em harmonização facial e botox.'
    },
    {
        id: 'evt2',
        title: 'Briefing Semanal da Equipe',
        date: getDateString(12),
        time: '10:00',
        duration: 30,
        type: 'meeting',
        description: 'Alinhamento da equipe de esteticistas e recepção.'
    },
    {
        id: 'evt3',
        title: 'Pós-procedimento — Ana',
        date: getDateString(15),
        time: '16:30',
        duration: 45,
        type: 'support',
        attendees: ['Ana Silva'],
        description: 'Retorno após limpeza de pele profunda + orientações.'
    },
    {
        id: 'evt4',
        title: 'Follow-up Patrícia (drenagem)',
        date: getDateString(18),
        time: '11:00',
        duration: 15,
        type: 'followup',
        attendees: ['Patrícia Andrade'],
        description: 'Confirmar fechamento do pacote de 10 sessões.'
    },
     {
        id: 'evt5',
        title: 'Sessão de Botox — Mariana',
        date: getDateString(25),
        time: '15:00',
        duration: 60,
        type: 'demo',
        attendees: ['Mariana Toledo'],
        description: 'Aplicação de toxina botulínica na região frontal.'
    }
];

export const MOCK_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'new', title: 'Novas Interessadas', color: 'border-pink-500', position: 0, isSystem: false, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
  { id: 'qualification', title: 'Avaliação Agendada', color: 'border-rose-500', position: 1, isSystem: false, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
  { id: 'presentation', title: 'Pós-avaliação', color: 'border-fuchsia-500', position: 2, isSystem: false, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
  { id: 'negotiation', title: 'Negociando Pacote', color: 'border-amber-500', position: 3, isSystem: false, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
  { id: 'won', title: 'Cliente Ativa', color: 'border-emerald-500', position: 4, isSystem: true, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
  { id: 'lost', title: 'Não evoluiu', color: 'border-red-500', position: 5, isSystem: true, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
];

export const MOCK_DEALS: Deal[] = [
  {
    id: 'd1',
    title: 'Botox Frontal + Glabela',
    company: 'Mariana Toledo',
    value: 1200,
    stage: 'new',
    ownerAvatar: 'https://ui-avatars.com/api/?name=Camila+Reis&background=f43f5e&color=fff',
    tags: ['Botox', 'Indicação'],
    priority: 'high'
  },
  {
    id: 'd2',
    title: 'Pacote Limpeza de Pele (5x)',
    company: 'Júlia Mendes',
    value: 990,
    stage: 'qualification',
    ownerAvatar: 'https://ui-avatars.com/api/?name=Renata+Borges&background=f59e0b&color=fff',
    tags: ['Pele', 'Pacote'],
    priority: 'medium'
  },
  {
    id: 'd3',
    title: 'Protocolo Anti-flacidez Premium',
    company: 'Beatriz Costa',
    value: 4500,
    stage: 'presentation',
    ownerAvatar: 'https://ui-avatars.com/api/?name=Julia+Albuquerque&background=ec4899&color=fff',
    tags: ['Premium', 'Corporal'],
    priority: 'high',
    dueDate: '2026-06-05'
  },
  {
    id: 'd4',
    title: 'Drenagem Linfática 10 sessões',
    company: 'Patrícia Andrade',
    value: 1890,
    stage: 'negotiation',
    ownerAvatar: 'https://ui-avatars.com/api/?name=Camila+Reis&background=f43f5e&color=fff',
    tags: ['Drenagem', 'Pós-parto'],
    priority: 'medium'
  },
  {
    id: 'd5',
    title: 'Microagulhamento Facial',
    company: 'Camila Brito',
    value: 750,
    stage: 'new',
    ownerAvatar: 'https://ui-avatars.com/api/?name=Renata+Borges&background=f59e0b&color=fff',
    tags: ['Facial'],
    priority: 'low'
  },
  {
    id: 'd6',
    title: 'Pacote Anual Manutenção VIP',
    company: 'Fernanda Lima',
    value: 6800,
    stage: 'won',
    ownerAvatar: 'https://ui-avatars.com/api/?name=Julia+Albuquerque&background=ec4899&color=fff',
    tags: ['VIP', 'Renovação'],
    priority: 'high'
  }
];
