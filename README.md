# Node Auth: Password Reset & Email Verification

Custom Node.js/TypeScript auth starter with real-world email verification and password reset flows using Express, Prisma (SQLite), bcrypt, and Mailtrap transactional email.

## How It Works

1. User registers with name, email, and password.
2. App hashes password (`bcrypt`) and stores user in SQLite via Prisma.
3. App issues a secure verification token (`crypto.randomBytes`), stores only token hash, signs link with HMAC, and sends verification email via Mailtrap.
4. User clicks verification link; app validates signature, checks token expiry/single-use, and sets `emailVerifiedAt`.
5. User can log in and get JWT, but unverified users are blocked from protected routes.
6. Password reset flow issues a time-limited signed reset link; user clicks link, submits new password, and expired/invalid/used tokens are rejected gracefully.

## Features

- Registration with verification email
- Login with JWT issuance
- Protected route middleware that blocks unverified users
- Forgot password flow with secure random token generation
- Time-limited, single-use reset tokens
- Signed links (HMAC-SHA256)
- HTML + text email templates for verification and reset
- Mailtrap transactional API integration for all outgoing email
- Graceful invalid/expired/used token responses

## Prerequisites

- Node.js 20+
- npm 10+
- Mailtrap account and API token

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Set required env values in `.env`:

```env
PORT=3000
APP_BASE_URL=http://localhost:3000
APP_SECRET=replace-with-a-strong-secret

JWT_SECRET=replace-with-a-strong-jwt-secret
JWT_EXPIRES_IN=7d

DATABASE_URL="file:./dev.db"

MAILTRAP_API_TOKEN=your_mailtrap_api_token
MAIL_FROM_ADDRESS=hello@yourdomain.com
MAIL_FROM_NAME=Auth Team

VERIFY_TOKEN_TTL_MINUTES=1440
RESET_TOKEN_TTL_MINUTES=60
```

4. Run Prisma migration:

```bash
npx prisma migrate dev --name init
```

5. Start development server:

```bash
npm run dev
```

## API Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/verify-email`
- `POST /auth/forgot-password`
- `GET /auth/reset-password/confirm`
- `POST /auth/reset-password`
- `GET /protected/me`
- `GET /health`

## Request Examples

### Register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"Password123"}'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"Password123"}'
```

### Access protected route (replace TOKEN)

```bash
curl http://localhost:3000/protected/me \
  -H "Authorization: Bearer TOKEN"
```

### Forgot password

```bash
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com"}'
```

### Reset password

Use values from reset email link:

```bash
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","token":"TOKEN","sig":"SIG","exp":1735689600000,"newPassword":"NewStrongPass123"}'
```

## Error Contract

- `400` invalid token/signature
- `410` expired token (request a new link)
- `409` already used token
- `404` forgot-password always returns generic success message to avoid user enumeration

## Project Structure

```text
prisma/
  schema.prisma
src/
  app.ts
  server.ts
  config/env.ts
  lib/prisma.ts
  middleware/requireVerifiedUser.ts
  routes/
    auth.ts
    protected.ts
  services/
    authService.ts
    mailService.ts
    tokenService.ts
  templates/
    verificationEmail.ts
    resetEmail.ts
```

## Acceptance Checklist

- [x] `npm install` works
- [x] `npm run dev` starts app
- [x] Register sends verification email via Mailtrap
- [x] Verification link sets `emailVerifiedAt` in SQLite
- [x] Unverified users cannot access `GET /protected/me`
- [x] Forgot password sends time-limited token email
- [x] Reset link and reset endpoint update password
- [x] Expired tokens are rejected
- [x] All email delivery uses Mailtrap transactional API
- [x] HTML emails provided for both flows
- [x] Invalid/expired/used token errors are user-friendly
