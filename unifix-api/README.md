# UniFix API

Backend for **UniFix** — a university maintenance request system built with
NestJS, Prisma, and PostgreSQL (Neon). See the [project report](../PROJECT_REPORT.md)
for full architecture, schema, and testing details.

## Live Deployment

- **Frontend:** https://uni-fix-lake.vercel.app/
- **Backend API:** https://unifix-production.up.railway.app
- **API Docs (Swagger):** https://unifix-production.up.railway.app/docs

Demo accounts (password `password123` for all):

| Role | Email |
|---|---|
| Administrator | `admin@uni.edu` |
| Maintenance Officer | `officer@uni.edu` |
| Student / Staff | `student@uni.edu` |

## Local Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and JWT secrets
npx prisma migrate dev
npx prisma db seed
```

## Running

```bash
# development (watch mode)
npm run start:dev

# production build
npm run build
npm run start:prod
```

## Tests

```bash
# unit tests
npm run test

# end-to-end tests (hits the configured database)
npm run test:e2e

# coverage
npm run test:cov
```
