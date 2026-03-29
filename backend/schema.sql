-- ============================================================
-- Textile Agency Management System — PostgreSQL Schema
-- Run this in your Supabase SQL Editor or psql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(255)  UNIQUE NOT NULL,
  password    VARCHAR(255)  NOT NULL,
  role        VARCHAR(20)   NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLIENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(150)  NOT NULL,
  phone       VARCHAR(20),
  type        VARCHAR(20)   NOT NULL CHECK (type IN ('supplier', 'receiver')),
  balance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  type        VARCHAR(5)    NOT NULL CHECK (type IN ('IN', 'OUT')),
  cloth_type  VARCHAR(100)  NOT NULL,
  quantity    NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  rate        NUMERIC(10,2) NOT NULL CHECK (rate >= 0),
  total       NUMERIC(12,2) NOT NULL,
  date        DATE          NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_client  ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date    ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type    ON transactions(type);

-- ============================================================
-- PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status      VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending')),
  date        DATE          NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_date   ON payments(date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================================
-- ACTIVITY LOG TABLE (Bonus)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID          REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(50)   NOT NULL,
  entity_type VARCHAR(50)   NOT NULL,
  entity_id   UUID,
  details     JSONB,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user   ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_time   ON activity_log(created_at);

-- ============================================================
-- SEED: Default admin user (password: admin123)
-- Hash generated with bcryptjs, 10 rounds
-- ============================================================
INSERT INTO users (name, email, password, role)
VALUES (
  'Admin',
  'admin@textile.com',
  '$2a$10$2HwNyBWrPhXGV/HZx88J7eJowPPbeqPOIIW2Gk2yBu41BttfgVbi2',
  'admin'
) ON CONFLICT (email) DO NOTHING;
