# Vaaris - Digital Legacy Management Platform

> **"Your Data. Your Wishes. Your Legacy."**

Vaaris empowers you to decide in advance what should happen to your digital assets (emails, social media, cloud files, crypto wallets, important documents) when you are no longer available. It enables secure, verified handover to trusted nominees using **Shamir's Secret Sharing** cryptography and a multi-stage posthumous verification pipeline.

---

## Key Features

- **Secure Authentication** - JWT-based login with bcrypt password hashing
- **Legacy Planner** - Register digital assets with desired actions (Transfer, Archive, Memorialize, Delete)
- **Trusted Nominees** - Designate heirs with unique access tokens and relationship metadata
- **Shamir's Secret Sharing Vault** - Split vault recovery secrets into 3 cryptographic shares (2-of-3 threshold)
- **4-Stage Verification Trigger** - Simulated posthumous pipeline (Trigger > Grace Period > Verification > Handover)
- **WhatsApp Notifications** - Twilio API integration with realistic mock simulator fallback
- **Heir Portal** - Standalone secure view for nominees to receive inherited assets and instructions
- **Interactive Cursor Glow** - Premium ambient lighting that follows cursor movement across all pages

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Lucide Icons |
| Backend | Python 3.11, FastAPI, SQLAlchemy, Pydantic v2 |
| Database | SQLite (zero-config) + Supabase PostgreSQL (production) |
| Crypto | Shamir's Secret Sharing over GF(2^521 - 1) Mersenne Prime |
| Notifications | Twilio WhatsApp API + High-Fidelity Mock Simulator |
| Security | JWT, bcrypt, zero plain-text 3rd party passwords |

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

The backend auto-creates the SQLite database and seeds demo data on first run.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Open in Browser

- **Frontend**: http://localhost:5173
- **Backend API Docs**: http://localhost:8000/docs

### 4. Demo Login

- **Email**: himangi@example.com
- **Password**: legacy2026
- Or click **"Try the demo account"** button for instant access

---

## Complete User Flow

```
Login -> Dashboard Overview -> Add Digital Asset -> Add Nominee
-> Create Legacy Plan -> Configure Shamir Vault (3-way split)
-> Simulate Trigger (4 stages) -> WhatsApp Notification
-> Heir Portal View -> Acknowledge Custody
```

---

## Twilio WhatsApp Setup (Optional)

1. Create a Twilio account at https://www.twilio.com
2. Enable the WhatsApp Sandbox
3. Copy your credentials to `.env`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=+14155238886
```

If Twilio is not configured, the app uses a high-fidelity in-browser WhatsApp simulator.

---

## Supabase Setup (Optional)

1. Create a project at https://supabase.com
2. Run `database/supabase_schema.sql` in the SQL Editor
3. Update `.env`:

```env
DATABASE_TYPE=supabase
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
```

---

## Project Structure

```
vaaris/
+-- backend/
|   +-- app/
|   |   +-- main.py              # FastAPI server
|   |   +-- config.py            # Environment settings
|   |   +-- database.py          # SQLAlchemy engine
|   |   +-- models.py            # ORM models
|   |   +-- schemas.py           # Pydantic schemas
|   |   +-- auth.py              # JWT + bcrypt auth
|   |   +-- seed_data.py         # Demo data seeder
|   |   +-- services/
|   |   |   +-- shamir.py        # Shamir Secret Sharing (GF 2^521-1)
|   |   |   +-- notification_service.py
|   |   |   +-- verification_engine.py
|   |   +-- routers/             # REST API endpoints
|   +-- requirements.txt
+-- frontend/
|   +-- src/
|   |   +-- components/          # Sidebar, Header, Modals
|   |   +-- pages/               # All application pages
|   |   +-- context/             # Auth state management
|   |   +-- services/            # API client
|   |   +-- App.jsx              # Root with cursor glow
|   +-- package.json
|   +-- tailwind.config.js
|   +-- vite.config.js
+-- database/
|   +-- supabase_schema.sql      # PostgreSQL schema with RLS
|   +-- seed_demo.sql
+-- .env.example
+-- README.md
```

---

## Security Principles

- Zero plain-text storage of third-party account passwords
- All access directives use recovery codes, Shamir shares, or safe deposit references
- JWT bearer token authentication with configurable expiry
- Environment variables for all secrets
- Row Level Security (RLS) policies for Supabase deployment

---

## Hackathon Presentation Pitch

**Problem**: When someone passes away, their digital life (emails, social media, cloud files, crypto wallets) remains locked and inaccessible. Physical estates have legal frameworks; digital estates do not.

**Solution**: Vaaris is a privacy-first digital legacy vault that uses Shamir's Secret Sharing cryptography to split recovery secrets across multiple trustees. A 4-stage posthumous verification pipeline ensures no premature handover, and WhatsApp notifications keep nominees informed.

**Innovation**: Real mathematical cryptography (Mersenne prime field polynomial interpolation) applied to estate planning - not just a CRUD app.

---

Built with care for hackathon judges. Every button works. Every flow is real.

**Vaaris** - Your Data. Your Wishes. Your Legacy.
