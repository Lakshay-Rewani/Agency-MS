# Textile Agency Management System
Last updated: May 15, 2026

A full-stack web application for managing a raw cloth agency business — clients, transactions, inventory, and payments.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| Auth | JWT + bcrypt |
| Charts | Recharts |

## 📁 Project Structure

```
textile-agency/
├── backend/
│   ├── src/
│   │   ├── config/db.js          # PostgreSQL connection
│   │   ├── middleware/auth.js     # JWT + RBAC middleware
│   │   ├── routes/
│   │   │   ├── auth.js           # Login/register
│   │   │   ├── users.js          # User management (admin)
│   │   │   ├── clients.js        # Client CRUD
│   │   │   ├── transactions.js   # Transaction CRUD + inventory
│   │   │   ├── payments.js       # Payment CRUD
│   │   │   └── reports.js        # Dashboard/daily/monthly reports
│   │   ├── utils/activityLogger.js
│   │   └── index.js              # Express server
│   ├── schema.sql                # PostgreSQL DDL
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/           # Sidebar, Modal, Pagination
    │   ├── pages/                # All page components
    │   ├── context/AuthContext.jsx
    │   ├── services/api.js
    │   ├── App.jsx               # Router + protected routes
    │   └── App.css               # Complete design system
    ├── index.html
    └── package.json
```

## 🚀 Quick Start

### 1. Database Setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `backend/schema.sql`
3. Copy your database connection string from **Settings → Database**

### 2. Backend

```bash
cd backend

# Configure environment
cp .env.example .env
# Edit .env with your Supabase DATABASE_URL and a JWT_SECRET

# Install & run
npm install
npm run dev
```

Server starts at `http://localhost:5000`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:3000` (proxies API to backend)

### 4. Default Login

```
Email: admin@textile.com
Password: admin123
```
> ⚠️ The seed user in schema.sql uses a placeholder hash. You'll need to register a new admin via the API or update the hash. To create a proper admin, temporarily make the register endpoint public, or use the Supabase SQL editor to insert a user with a proper bcrypt hash.

## 👥 User Roles

| Role | Permissions |
|------|------------|
| **Admin** | Full CRUD on all modules, user management, delete operations |
| **Staff** | View clients, add/view transactions & payments, no delete, no user management |

## 📊 Features

- **Dashboard**: Stats cards, bar/pie charts, recent transactions
- **Clients**: CRUD with search, type filter (supplier/receiver)
- **Transactions**: IN/OUT with date range, client, type filters
- **Inventory**: Auto-calculated stock from transaction data
- **Payments**: Track paid/pending with client balance updates
- **Reports**: Daily, monthly, and client-wise with charts
- **User Management**: Admin-only staff management
- **Activity Log**: Tracks who did what (bonus feature)

## 🚢 Deployment

| Service | Component |
|---------|----------|
| **Render** | Backend (Node.js web service) |
| **Netlify/Vercel** | Frontend (static build from `npm run build`) |
| **Supabase** | PostgreSQL database |

### Frontend Build

```bash
cd frontend
npm run build
# Output in dist/ — deploy this folder
```

Set the environment variable `VITE_API_URL` to your deployed backend URL.

## 🔐 Security

- JWT token authentication on all protected routes
- Role-based authorization middleware
- Password hashing with bcrypt (10 rounds)
- Input validation with express-validator
- CORS enabled
