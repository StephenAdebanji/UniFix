# UniFix Web

Frontend for **UniFix** — a university maintenance request system built with
Next.js. See the [project report](../PROJECT_REPORT.md) for full
architecture and testing details.

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
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL to your backend URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Tests

```bash
npm run test
```
