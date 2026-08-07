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
// Plan
// Um plano de estudos vinculado a um usuário.
// Exemplo: "Plano PCDF 2025", "Plano Receita Federal".
// -----------------------------------------------------------------------------
export interface Plan {
  id: string;
  userId: string;
  title: string;
  /** Data-alvo da prova (opcional, pois o plano pode ser aberto) */
  targetDate?: Date;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Subject
// Uma disciplina dentro de um plano.
// Exemplo: "Direito Constitucional", "Raciocínio Lógico".
// -----------------------------------------------------------------------------
export interface Subject {
  id: string;
  planId: string;
  title: string;
  /** Cor em HEX ou Tailwind para identificação visual na UI */
  color: string;
}

// -----------------------------------------------------------------------------
// Topic
// Um tópico/item de conteúdo dentro de uma disciplina.
// Exemplo: "Princípios Fundamentais", "Teoria dos Conjuntos".
// -----------------------------------------------------------------------------
export interface Topic {
  id: string;
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
  /** Quantidade de questões corretas (opcional) */
  questionsCorrect?: number;
  /** Páginas lidas na sessão (opcional) */
  pagesRead?: number;
  /** Anotações livres do estudante sobre a sessão (opcional) */
  notes?: string;
}
