# STREAM Ecosystem Portal

A full-stack multi-role educational platform built with React, Express, PostgreSQL, and Prisma.

**🌐 Live Website:** [Your Website Link Here](https://sreamweb-front.onrender.com/)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS v3 |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT + bcrypt + RBAC Middleware |
| Validation | Zod (shared schemas) |
| File Storage | Multer + Sharp |
| Reports | ExcelJS + PDFKit |

## Getting Started

### Prerequisites

- **Node.js** v18+ and npm
- **PostgreSQL** running locally or a cloud-hosted instance

### 1. Clone and Install

```bash
cd stream-ecosystem
npm install
```

### 2. Configure Environment

Edit `server/.env` with your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/stream_ecosystem"
JWT_SECRET="your-secret-key-change-this"
```

### 3. Setup Database

```bash
# Create the database in PostgreSQL first, then:
npm run db:migrate    # Run Prisma migrations
npm run db:seed       # Seed demo users
```

### 4. Start Development Servers

```bash
npm run dev           # Starts both frontend (5173) and backend (5000)
```

Or start individually:

```bash
npm run dev:server    # Express on http://localhost:5000
npm run dev:client    # Vite on http://localhost:5173
```

### 5. Login

| Role | Email | Password |
|---|---|---|
| Admin | admin@stream.edu | Admin@123 |
| Expert | expert@stream.edu | Demo@123 |
| STREAM Hub | lab@stream.edu | Demo@123 |
| iLab School | ilab@stream.edu | Demo@123 |
| Creative Corner | creative@stream.edu | Demo@123 |

## API Endpoints

### Auth
- `POST /api/auth/login` — Login
- `POST /api/auth/register` — Register
- `GET /api/auth/me` — Current user profile

### Users (Admin)
- `GET /api/users` — List all users
- `POST /api/users` — Create user
- `GET /api/users/:id` — Get user
- `PATCH /api/users/:id` — Update user
- `DELETE /api/users/:id` — Deactivate user

### Uploads
- `POST /api/uploads/avatar` — Upload avatar
- `GET /api/uploads/:filename` — Serve file

### Reports (Admin)
- `GET /api/reports/users/excel` — Download Excel
- `GET /api/reports/users/pdf` — Download PDF

## Project Structure

```
stream-ecosystem/
├── client/          # React + Vite frontend
├── server/          # Express backend
├── shared/          # Shared Zod schemas
└── package.json     # Root workspace config
```
