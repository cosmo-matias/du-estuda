// =============================================================================
// DuEstuda — Strict TypeScript Data Models
// Arquitetura: Edital Verticalizado + Cronômetro de Estudos
// =============================================================================

// -----------------------------------------------------------------------------
// User
// Representa o perfil do usuário autenticado no sistema.
// -----------------------------------------------------------------------------
export interface User {
  /** Firestore document ID (mesmo que o Firebase Auth UID) */
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// StudyPlan
// Um plano de estudos vinculado a um usuário.
// Exemplo: "Plano PCDF 2025", "Plano Receita Federal".
// -----------------------------------------------------------------------------
export interface StudyPlan {
  id: string;
  userId: string;
  title: string;
  targetDate: string;
  active: boolean;
  currentCyclePosition?: number;
}

// -----------------------------------------------------------------------------
// Subject
// Uma disciplina dentro de um plano.
// Exemplo: "Direito Constitucional", "Raciocínio Lógico".
// -----------------------------------------------------------------------------
export interface Subject {
  id: string;
  planId: string;
  userId: string;
  title: string;
  /** Cor em HEX ou Tailwind para identificação visual na UI */
  color: string;
}

// -----------------------------------------------------------------------------
// PlanSubject
// Tabela pivô que vincula uma disciplina a um plano de estudos com configurações.
// -----------------------------------------------------------------------------
export interface PlanSubject {
  id: string;
  planId: string;
  subjectId: string;
  weight: number;
  proficiency: string;
}

// -----------------------------------------------------------------------------
// Topic
// Um tópico/item de conteúdo dentro de uma disciplina.
// Exemplo: "Princípios Fundamentais", "Teoria dos Conjuntos".
// -----------------------------------------------------------------------------
export interface Topic {
  id: string;
  planId: string;
  subjectId: string;
  title: string;
  /** Indica se o tópico foi concluído pelo estudante */
  isCompleted: boolean;
}

// -----------------------------------------------------------------------------
// StudyCategory
// Categorias válidas para classificar uma sessão de estudo.
// -----------------------------------------------------------------------------
export type StudyCategory =
  | "Teoria"
  | "Questões"
  | "Revisão"
  | "Leitura de Lei";

// -----------------------------------------------------------------------------
// StudySession
// Registro de uma sessão de estudo cronometrada.
// Vincula tempo, disciplina, tópico e métricas de desempenho.
// -----------------------------------------------------------------------------
export interface StudySession {
  id: string;
  userId: string;
  planId?: string;
  subjectId: string;
  /** Tópico estudado na sessão (opcional) */
  topicId?: string;
  /** Data da sessão — pode ser ISO string (Firestore) ou objeto Date (client) */
  date: string | Date;
  /** Duração total da sessão em segundos */
  durationInSeconds: number;
  /** Categoria da atividade realizada na sessão */
  category: StudyCategory;
  /** Quantidade de questões respondidas (opcional) */
  questionsAnswered?: number;
  questionsTotal?: number;
  /** Quantidade de questões corretas (opcional) */
  questionsCorrect?: number;
  /** Páginas lidas na sessão (opcional) */
  pagesRead?: number;
  /** Anotações livres do estudante sobre a sessão (opcional) */
  notes?: string;
  /** Tempo em que o cronômetro ficou pausado em segundos (opcional) */
  pausedDurationInSeconds?: number;
}

// -----------------------------------------------------------------------------
// Review
// Representa uma revisão agendada no ciclo de estudos.
// -----------------------------------------------------------------------------
export interface Review {
  id: string;
  userId: string;
  planId: string;
  subjectId: string;
  scheduledDate: string;
  completed: boolean;
  step: number;
}

// -----------------------------------------------------------------------------
// StudyCycleConfig
// Configuração customizada do ciclo de estudos gerado pelo wizard.
// Salva no Firestore como subcoleção ou documento do plano.
// -----------------------------------------------------------------------------
export interface CycleBlock {
  id: string;
  subjectId: string;
  durationMinutes: number;
  completed: boolean;
}

export interface StudyCycleConfig {
  planId: string;
  /** Total de horas de estudo por semana */
  weeklyHours: number;
  /** Dias da semana disponíveis: 0=Dom, 1=Seg … 6=Sáb */
  selectedDays: number[];
  /** Duração mínima de um bloco em minutos */
  minBlockMinutes: number;
  /** Duração máxima de um bloco em minutos */
  maxBlockMinutes: number;
  /** Pesos de importância por disciplina */
  subjectWeights: { subjectId: string; weight: number }[];
  /** Sequência final de blocos gerada pelo algoritmo */
  cycleSequence: CycleBlock[];
  /** Contagem de ciclos completados com sucesso */
  completedCyclesCount?: number;
  /** Timestamp Firestore da última atualização */
  updatedAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

