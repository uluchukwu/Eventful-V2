# Eventful

Event ticketing platform built for the AltSchool Africa backend assessment. Node.js + TypeScript + Express + PostgreSQL (Prisma ORM).

## Features Implemented

- **Auth**: Registration, login, JWT-based sessions, bcrypt password hashing
- **Roles**: CREATOR and EVENTEE, enforced via middleware + resource ownership checks
- **Events**: Full CRUD, creator-owned, publicly browsable
- **Tickets**: Purchase flow protected against race conditions using PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) inside a transaction — verified with concurrent-request testing
- **Payments**: Real Paystack integration (initialize + server-side verify)
- **QR Codes**: Generated on payment confirmation, single-use scan verification (creator-only)
- **Security**: Rate limiting (global + stricter on auth routes), passwords never returned in API responses, input never trusted from JWT for sensitive fields

## Setup

1. Clone the repo, `cd` into it
2. `npm install`
3. Copy `.env.example` to `.env` and fill in real values:
   - `DATABASE_URL` — your PostgreSQL connection string
   - `JWT_SECRET` — any long random string
   - `PAYSTACK_SECRET_KEY` — from your Paystack dashboard (test mode)
4. `npx prisma migrate dev`
5. `npm run build:watch` (terminal 1), `npm run dev` (terminal 2)
6. Server runs on `http://localhost:3000`

## API Endpoints

### Auth
- `POST /api/auth/register` — `{ name, email, password, role }`
- `POST /api/auth/login` — `{ email, password }` → `{ token }`

### Events
- `POST /events` — creator only, requires auth
- `GET /events` — public
- `GET /events/:id` — public
- `PUT /events/:id` — creator, owner only
- `DELETE /events/:id` — creator, owner only

### Tickets
- `POST /events/:eventId/tickets` — authenticated eventee, race-condition-safe

### Payments
- `POST /api/payments/:ticketId/initialize` — returns Paystack checkout URL
- `GET /api/payments/verify/:reference` — confirms payment, issues QR code
- `POST /api/payments/scan/:qrToken` — creator only, marks ticket as scanned

## Known Limitations / Technical Debt

- Notifications (reminders) and analytics endpoints are designed (Notification model exists) but not yet implemented — deferred post-submission
- No caching layer yet — events list hits the database directly on every request
- Test coverage is currently limited to manual verification of the ticket race condition; automated test suite is a post-submission priority
- Windows PostgreSQL service requires manual `pg_ctl start` — the native service registration has an unresolved startup issue