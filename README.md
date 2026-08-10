# 📚 DuEstuda

> Uma plataforma inteligente e imersiva para gestão de estudos, ciclos personalizados e revisões espaçadas.

O **DuEstuda** é um ecossistema completo focado em maximizar a retenção de aprendizado e a constância. Com um design limpo e funcional, ele permite que estudantes planejem suas metas semanais, executem sessões com foco total e acompanhem seu desempenho através de métricas detalhadas.

---

## 🤝 A Construção: Parceria Humano-IA (Prompt-Driven Development)

Este projeto não foi construído da maneira tradicional. O **DuEstuda** é o resultado de uma colaboração direta e contínua entre **Inteligência Humana e Inteligência Artificial**, demonstrando o potencial do desenvolvimento guiado por prompts em cenários reais de produção.

* **🧠 O Arquiteto Humano (Product Manager & Designer):**
  Toda a idealização, lógica de negócios, design de produto, tomada de decisões arquiteturais e orquestração do fluxo de trabalho foram conduzidas por um ser humano. Com a visão analítica e estruturada de um educador da área de matemática, o humano guiou a IA passo a passo, definindo as regras da esteira de estudos, a curadoria de conteúdos e a experiência do usuário (UX).

* **🤖 A IA (Engenharia & Execução):**
  Atuando sob a persona de um Desenvolvedor Sênior Full-Stack, a Inteligência Artificial (Modelos Gemini interagindo via agentes de terminal) foi responsável por traduzir a visão arquitetural em código fonte. A IA executou a criação dos componentes em React, a estilização com Tailwind CSS, a integração com o banco de dados Firebase e os deploys automatizados em produção.

**O resultado?** Um aplicativo de alto nível construído em tempo recorde, onde a criatividade e a direção humana se uniram à velocidade e capacidade de execução da inteligência artificial.

---

## ✨ Principais Funcionalidades

* ⏱️ **Cronômetro com Modo Foco (Zen Mode):** Uma interface imersiva em tela cheia (com *backdrop blur*) que elimina distrações, permitindo incremento rápido de tempo (+1, +5, +15 min) e rastreio de pausas.
* 🔄 **Ciclo de Estudos Inteligente:** Criação de ciclos com cálculo de peso proporcional por matéria, interface drag-and-drop para reordenação e esteira automatizada que avança conforme as sessões são concluídas.
* 🧠 **Revisões Espaçadas Automáticas:** Agendamento em lote (+1d, +7d, +15d, +30d) gerado automaticamente ao concluir um estudo, organizado em uma *Timeline* interativa com abas de status (Programadas, Atrasadas, Concluídas).
* 📊 **Dashboard & Estatísticas Globais:** Monitoramento em tempo real com gráficos iterativos (Recharts), rastreador de constância (habit tracker de 14 dias), taxas de acerto e mapas de calor de rendimento por matéria.
* 💡 **Pílulas de Inspiração:** Um widget dinâmico que rotaciona mensalmente 31 citações motivacionais e educacionais curadas (com destaque especial para o livro *Educação* de Ellen G. White).

---

## 🛠️ Tecnologias Utilizadas

* **Framework:** [Next.js](https://nextjs.org/) (App Router)
* **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
* **Ícones & Gráficos:** [Lucide React](https://lucide.dev/) e [Recharts](https://recharts.org/)
* **Backend as a Service:** [Firebase](https://firebase.google.com/) (Firestore para banco de dados NoSQL)
* **Hospedagem:** Firebase Hosting

---

## 🚀 Como executar localmente

Se você deseja explorar ou contribuir com o projeto localmente:

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/cosmo-matias/du-estuda.git
   ```
2. **Instale as dependências:**
   ```bash
   cd du-estuda
   npm install
   ```
3. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env.local` na raiz do projeto com as credenciais do seu projeto Firebase (apiKey, authDomain, projectId, etc).
4. **Execute o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
5. **Acesse no navegador:**
   Abra [http://localhost:3000](http://localhost:3000) no seu navegador.
