# FRACTTO FLOW - Suas Finanças, Peça por Peça

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)

Plataforma completa de gestão financeira pessoal com **assistente IA integrado (GUTA)**.

## 🚀 Módulos Principais

### 💰 Finanças
- Transações (simples, parceladas, recorrentes)
- Carteiras (contas e cartões de crédito)
- Faturas automáticas
- Orçamentos com rollover
- Metas financeiras
- Investimentos
- Relatórios e projeções
- Importação CSV

### 🤖 GUTA (Assistente IA)
- Chat inteligente com linguagem natural
- Gestão de tarefas
- Calendário de eventos (+ Google Calendar)
- Sistema de hábitos
- Lembretes com push notifications
- Memória persistente
- Onboarding guiado por IA

## 🛠️ Tecnologias

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Fastify (Node.js) + Prisma + Supabase Postgres
- **IA:** OpenAI (API)
- **Integrações:** Google Calendar, Web Push

## Como rodar localmente

Pré-requisitos: Node.js + npm.

```sh
npm i

# Frontend + backend em paralelo
./dev.sh
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (PostgreSQL + Edge Functions)
- Deno (Edge Functions)
- OpenAI (API)

## How can I deploy this project?

Este projeto é auto-hospedado. Faça o build do frontend e execute o backend na sua infraestrutura (VPS/containers). Ajuste variáveis de ambiente conforme `.env` e `server/.env`.

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [DOCUMENTATION.md](./DOCUMENTATION.md) | Documentação técnica completa |
| [OPERATIONS.md](./OPERATIONS.md) | Procedimentos operacionais |
| [JORNADA_CLIENTE.md](./JORNADA_CLIENTE.md) | Jornada do usuário |
| [APRESENTACAO_COMERCIAL.md](./APRESENTACAO_COMERCIAL.md) | Apresentação comercial |

---

**URL Produção:** (definir domínio)
