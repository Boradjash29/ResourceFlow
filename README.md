# ResourceFlow 🚀

ResourceFlow is an intelligent, AI-powered resource management and booking system designed for modern workspaces. It leverages the PERN stack and RAG (Retrieval-Augmented Generation) to provide intuitive, natural-language booking experiences alongside powerful administrative tools.

## 🌟 Key Features

- **AI Booking Assistant:** Natural language processing for booking rooms, equipment, and vehicles (RAG-powered).
- **Admin Dashboard:** Comprehensive management of resources, users, and system settings.
- **Analytics & Insights:** Real-time visualization of resource utilization and peak hour trends.
- **Audit Logging:** Full accountability with a searchable system audit trail.
- **Session-based Memory:** Intelligent conversation context that persists across server restarts.
- **Robust Persistence:** Reliable data management with PostgreSQL and Prisma.

## 🛠️ Technology Stack

- **Frontend:** React, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend:** Node.js, Express, Prisma ORM.
- **Database:** PostgreSQL with `pgvector` for semantic search.
- **AI/ML:** RAG Orchestration for intent analysis and hybrid search.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL (with `pgvector` extension)
- npm or yarn

### Server Setup

1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your `.env` file (see `.env.example`).
4. Run Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

### Client Setup

1. Navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

## 📂 Project Structure

- `/client`: React frontend application.
- `/server`: Express backend and RAG engine.
  - `/rag`: Intent analysis and embedding orchestration.
  - `/controllers`: API business logic.
  - `/prisma`: Database schema and migrations.

## 📄 License

This project is licensed under the MIT License.
