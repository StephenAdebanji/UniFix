# UniFix — University Maintenance Request System

**Project Report**
MIT 8333 — Advanced Web Application Development (Virtual Lab)
2026/2027 Academic Session — Continuous Assessment
Author: Stephen Adebanji

---

## 1. Introduction and Problem Statement

Universities typically handle facility maintenance complaints — faulty electrical
wiring, leaking pipes, damaged furniture, internet outages, broken classroom
equipment, hostel maintenance issues — through informal, disconnected channels:
phone calls, paper forms, WhatsApp messages, and in-person office visits. This
creates several recurring problems:

- **Delays** — requests get lost in someone's inbox or forgotten on a paper form.
- **No tracking** — a student who reports a fault has no way to check its status
  without physically following up.
- **Poor accountability** — there is no record of who was assigned a job, when,
  or whether it was actually completed.
- **No reporting** — administrators have no aggregate view of request volume,
  category breakdown, or officer workload, making it hard to plan resourcing.

UniFix replaces this manual process with a single, role-aware digital platform:
students and staff submit requests with structured details (and optional photo
evidence), maintenance officers see only what's assigned to them and update
progress, and administrators assign work, monitor the whole system, and export
reports — all backed by a persistent audit trail of every status change.

## 2. System Objectives

1. Allow students and staff to submit a maintenance request with category,
   location, priority, description, and optional photo evidence.
2. Let submitters track the real-time status and full history of their own
   requests without contacting anyone.
3. Give maintenance officers a scoped view of only the jobs assigned to them,
   with the ability to update status and add notes.
4. Give administrators full visibility: assign requests to officers, manage
   user roles, monitor system-wide status, and export data.
5. Enforce strict role-based access control so users can only see and do what
   their role permits.
6. Maintain a complete, timestamped audit trail of every request's lifecycle.
7. Deploy a working, publicly accessible version connected to a live database.

## 3. Requirement Analysis

The assignment specifies three user roles with distinct capabilities:

| Role | Capabilities |
|---|---|
| Student / Staff | Register, submit requests, track own requests, view own activity log |
| Maintenance Officer | View requests assigned to them, update status, add notes |
| Administrator | View all requests, assign requests to officers, manage user roles, view reports, export CSV |

Functionally this requires: authentication with password hashing, role-based
authorization at the API layer (not just hidden UI), full CRUD on service
requests, a many-to-one assignment relationship between requests and officers,
and an append-only status log that doubles as an audit trail. Non-functional
requirements: the system must be usable by non-technical staff (clear
navigation, validation, feedback messages), and must run against a real,
persistent, network-accessible database rather than local-only storage.

## 4. Frontend Technologies Used

- **Next.js 16** (App Router, TypeScript) — chosen for its file-based routing,
  built-in font optimization, and first-class Vercel deployment support.
- **React 19**
- **Tailwind CSS v4** — utility-first styling used to implement the navy/gold/
  cream visual design (serif display headings via `next/font/google`
  (Playfair Display + Inter), consistent status/priority badges, card-based
  layouts).
- **React Context API** (`AuthProvider`) for global auth state, rather than a
  heavier state library — the app's shared state surface (current user,
  tokens) is small enough that Redux/Zustand would be unjustified overhead.
- **React Testing Library + Jest** for component tests.

Client-side routing guards (`RequireAuth`) redirect unauthenticated users to
sign-in and redirect users without the required role away from pages they
shouldn't access, in addition to the backend's own enforcement.

## 5. Backend Technologies Used

- **NestJS** (TypeScript) — a structured, modular framework that maps cleanly
  onto the assignment's domain boundaries (auth, users, categories, service
  requests, reports, uploads each as their own Nest module).
- **Prisma ORM 7** with the `pg` driver adapter, targeting **PostgreSQL**
  hosted on **Neon**.
- **Passport JWT** (`@nestjs/passport`, `passport-jwt`) for access-token
  authentication; a custom `RolesGuard` + `@Roles()` decorator for RBAC.
- **bcrypt** for password hashing (10 salt rounds) and for hashing stored
  refresh tokens (so a leaked database dump doesn't expose usable tokens).
- **class-validator / class-transformer** for request DTO validation, wired
  through a global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`,
  `transform`) — invalid or unexpected fields are rejected before reaching any
  handler.
- **Multer** (via `@nestjs/platform-express`) for evidence file uploads, with
  file-type/size restrictions enforced server-side.
- **@nestjs/swagger** for interactive, auto-generated API documentation.
- **Jest + Supertest** for unit and end-to-end tests.

### Error handling note
Centralized error handling is provided by NestJS's built-in exception layer:
domain errors are thrown as typed HTTP exceptions (`ConflictException`,
`UnauthorizedException`, `NotFoundException`, etc.) from services, and Nest's
framework-level exception filter converts them into a consistent JSON error
shape (`statusCode`, `message`, `error`) across every endpoint, with the
global `ValidationPipe` doing the same for validation failures. This was
achieved through Nest's default filter rather than a hand-authored custom
`ExceptionFilter` class, since the default behavior already satisfies the
"centralized, consistent error responses" goal without introducing an
unnecessary abstraction.

## 6. Database Used and Relationship Types

**PostgreSQL**, hosted on **Neon** (serverless Postgres), accessed through
**Prisma ORM**. Six entities, matching the assignment's minimum requirement:

| Entity | Purpose |
|---|---|
| `roles` | The three fixed roles: `STUDENT_STAFF`, `MAINTENANCE_OFFICER`, `ADMINISTRATOR` |
| `users` | Accounts — name, email, hashed password, hashed refresh token, department, role |
| `request_categories` | Fixed lookup list: Electricity, Plumbing, Furniture, Internet/Network, Classroom Equipment, Hostel Maintenance, Other |
| `service_requests` | The core request record — title, description, location, status, priority, evidence URL, submitter, category, current assignee |
| `assignments` | Append-only history of assignment events (who assigned, to whom, when) |
| `status_updates` | Append-only audit trail of every status transition, with an optional note |

**Relationships:**

- `Role` **1 — many** `User` (each user has exactly one role; a role has many users)
- `User` **1 — many** `ServiceRequest` (as submitter, via `submittedBy`)
- `User` **1 — many** `ServiceRequest` (as current assignee, via `currentAssignee` — a
  denormalized pointer to "who has this request right now," kept separate
  from the full assignment history for fast "assigned to me" queries)
- `RequestCategory` **1 — many** `ServiceRequest`
- `ServiceRequest` **1 — many** `Assignment` (full reassignment history)
- `User` **1 — many** `Assignment` (twice: as the assigned officer, and as the
  admin who made the assignment)
- `ServiceRequest` **1 — many** `StatusUpdate`
- `User` **1 — many** `StatusUpdate` (as the user who made the change)

All relationships are enforced via foreign keys at the database level through
Prisma's schema (`schema.prisma`), with three migrations applied against the
live Neon instance.

## 7. API Documentation

Full interactive documentation is generated with Swagger and served at
**`/docs`** on the deployed API (`https://unifix-production.up.railway.app/docs`),
including request/response schemas and a bearer-token auth flow for testing
protected routes directly from the browser.

### Endpoint summary

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a new Student/Staff account |
| POST | `/auth/login` | Public | Sign in, receive access + refresh tokens |
| POST | `/auth/refresh` | Public (valid refresh token) | Rotate tokens |
| POST | `/auth/logout` | Authenticated | Invalidate stored refresh token |
| GET | `/auth/me` | Authenticated | Current user profile |
| GET | `/users` | Administrator | List all users |
| PATCH | `/users/:id/role` | Administrator | Change a user's role |
| GET | `/categories` | Authenticated | List request categories |
| POST | `/requests` | Authenticated | Submit a new service request |
| GET | `/requests` | Authenticated (role-scoped) | List requests — own / assigned / all, with search, status/category filter, pagination |
| GET | `/requests/export` | Administrator | CSV export of all requests |
| GET | `/requests/:id` | Authenticated (ownership-checked) | Full request detail + activity log |
| PATCH | `/requests/:id/assign` | Administrator | Assign a request to an officer |
| PATCH | `/requests/:id/status` | Officer (assigned) / Administrator | Update status, optional note |
| GET | `/reports/summary` | Administrator | Aggregate stats: by status, by category, officer workload |
| GET | `/reports/export` | Administrator | CSV export of the summary |
| POST | `/uploads/evidence` | Authenticated | Upload a fault photo, returns a URL |

All routes except registration/login/refresh require a valid JWT bearer
access token; role-restricted routes additionally require the caller's role
(read from the token payload) to match via the `RolesGuard`.

## 8. Screenshots of Major Interfaces

> **[Insert screenshots here before submission — see notes below]**

- `[SCREENSHOT: Landing page]`
- `[SCREENSHOT: Sign-in page]`
- `[SCREENSHOT: Registration page]`
- `[SCREENSHOT: Student/Staff dashboard]`
- `[SCREENSHOT: Maintenance Officer dashboard]`
- `[SCREENSHOT: Administrator dashboard]`
- `[SCREENSHOT: New request submission form]`
- `[SCREENSHOT: Request list — "My requests" / "Assigned to me" / "All service requests"]`
- `[SCREENSHOT: Request detail / tracking page with activity log]`
- `[SCREENSHOT: Officer status-update panel]`
- `[SCREENSHOT: Admin user management page]`
- `[SCREENSHOT: Admin reports & analytics page]`
- `[SCREENSHOT: Swagger API docs at /docs]`

*Note: capture these from the live deployment
(`https://uni-fix-lake.vercel.app`) using the demo accounts
below, so the screenshots reflect the actual deployed system rather than the
design mockups.*

## 9. Testing Evidence

### Backend (`unifix-api`)

- **Unit tests** (Jest): `npm test`
  ```
  Test Suites: 3 passed, 3 total
  Tests:       13 passed, 13 total
  ```
  Covers: `AuthService` (registration conflict, login success/failure,
  refresh-token rotation, logout) and `RolesGuard` (allow/deny paths for each
  role combination).

- **End-to-end tests** (Jest + Supertest, against the live Neon database):
  `npm run test:e2e`
  ```
  Test Suites: 1 passed, 1 total
  Tests:       16 passed, 16 total
  ```
  Covers: validation error responses, full auth flow (register → login →
  `/me` → refresh), RBAC 403 enforcement across roles, and the full request
  lifecycle (create → assign → status updates → activity log ordering).

### Frontend (`unifix-web`)

- **Component tests** (Jest + React Testing Library): `npm test`
  ```
  Test Suites: 4 passed, 4 total
  Tests:       17 passed, 17 total
  ```
  Covers: sign-in form validation and submission, registration form
  validation (password confirmation mismatch, required fields), role-based
  navigation rendering, and request-status/priority badge rendering.

### Manual verification against production

After deployment, the following was verified against the **live** URLs (not
localhost):

- `GET /` on the deployed API returns `200` and the app logs "Connected to
  database" against Neon.
- `POST /auth/login` with the seeded administrator account
  (`admin@uni.edu`) succeeds against the live database and returns valid
  tokens.
- The deployed frontend's compiled JavaScript bundle was inspected directly
  and confirmed to contain the correct production API URL
  (`unifix-production.up.railway.app`), confirming the `NEXT_PUBLIC_API_URL`
  environment variable was correctly baked in at build time.

### Manual Test Cases (Positive / Negative / Edge)

The following test cases were designed against the actual validation rules,
guards, and service logic implemented in `unifix-api` (DTOs under
`src/*/dto/*.dto.ts`, `RolesGuard`, `JwtAuthGuard`, and each module's
service). They were executed manually via **Swagger UI** (`/docs`) and the
deployed frontend using the seeded demo accounts. Record the actual
outcome and a screenshot reference for each row before submission.

**Legend:** P = Positive, N = Negative, E = Edge

#### 1. Authentication (`/auth`)

| ID | Type | Steps / Input | Expected Result | Actual Result |
|---|---|---|---|---|
| AUTH-01 | P | `POST /auth/register` with a new, unique email, name ≥ 2 chars, password ≥ 8 chars | `201`, response contains `user` (role `STUDENT_STAFF`) + `accessToken` + `refreshToken` | |
| AUTH-02 | N | Register again with the **same** email | `409 Conflict` — "An account with this email already exists" | |
| AUTH-03 | N | Register with `email: "not-an-email"` | `400 Bad Request` (email validation) | |
| AUTH-04 | N | Register with `password: "short"` (< 8 chars) | `400 Bad Request` | |
| AUTH-05 | E | Register with `department` field omitted (it's optional) | `201`, `department: null` in response | |
| AUTH-06 | E | Register with an extra unexpected field, e.g. `role: "ADMINISTRATOR"` in the body | `400 Bad Request` — rejected by global `ValidationPipe` (`forbidNonWhitelisted`); role cannot be self-assigned | |
| AUTH-07 | P | `POST /auth/login` with a seeded account's correct email/password | `200`, valid `accessToken` + `refreshToken` returned | |
| AUTH-08 | N | Login with correct email, wrong password | `401 Unauthorized` — "Invalid email or password" | |
| AUTH-09 | N | Login with an email that doesn't exist | `401 Unauthorized` — same generic message as AUTH-08 (confirms no user-enumeration leak) | |
| AUTH-10 | P | `POST /auth/refresh` with a valid, unexpired refresh token | `200`, new access/refresh token pair issued | |
| AUTH-11 | N | Refresh with a garbage/tampered token string | `401 Unauthorized` — "Invalid or expired refresh token" | |
| AUTH-12 | E | Call `/auth/logout`, then immediately try `/auth/refresh` with the **old** (now-invalidated) refresh token | `401 Unauthorized` — "Session expired, please sign in again" (confirms logout revokes the stored refresh token) | |
| AUTH-13 | P | `GET /auth/me` with a valid access token in the `Authorization` header | `200`, returns the caller's own profile | |
| AUTH-14 | N | `GET /auth/me` with no `Authorization` header | `401 Unauthorized` | |

#### 2. Role-Based Access Control (RBAC)

| ID | Type | Steps / Input | Expected Result | Actual Result |
|---|---|---|---|---|
| RBAC-01 | P | Admin token → `GET /users` | `200`, full user list | |
| RBAC-02 | N | Student/Staff token → `GET /users` | `403 Forbidden` | |
| RBAC-03 | N | Maintenance Officer token → `GET /users` | `403 Forbidden` | |
| RBAC-04 | N | Student/Staff token → `GET /requests/export` | `403 Forbidden` | |
| RBAC-05 | N | Maintenance Officer token → `PATCH /requests/:id/assign` | `403 Forbidden` | |
| RBAC-06 | N | Student/Staff token → `PATCH /requests/:id/status` | `403 Forbidden` (role not in the allowed list for this route) | |
| RBAC-07 | E | No `Authorization` header at all → any protected route | `401 Unauthorized` (authentication failure, distinct from the `403` authorization failures above) | |
| RBAC-08 | E | Malformed/random string as bearer token → any protected route | `401 Unauthorized` | |

#### 3. Service Request Submission (`POST /requests`)

| ID | Type | Steps / Input | Expected Result | Actual Result |
|---|---|---|---|---|
| REQ-01 | P | Student/Staff submits with valid `title`, `categoryId`, `location`, `description` (≥10 chars) | `201`, generated `code` like `REQ-0001`, `status: PENDING` | |
| REQ-02 | N | `title: "ab"` (< 3 chars) | `400 Bad Request` | |
| REQ-03 | N | `description: "too short"` (< 10 chars) | `400 Bad Request` | |
| REQ-04 | N | `categoryId: 9999` (does not exist) | `400 Bad Request` — "Unknown category" | |
| REQ-05 | N | `location` field omitted entirely | `400 Bad Request` | |
| REQ-06 | E | `priority` omitted | `201`, defaults to `MEDIUM` | |
| REQ-07 | E | `evidenceFileUrl` omitted (no photo attached) | `201`, `evidenceFileUrl: null`, request still created | |

#### 4. Listing, Search, Filter, Pagination (`GET /requests`)

| ID | Type | Steps / Input | Expected Result | Actual Result |
|---|---|---|---|---|
| LIST-01 | P | Student/Staff calls `GET /requests` | Only requests **they submitted** are returned | |
| LIST-02 | P | Maintenance Officer calls `GET /requests` | Only requests **currently assigned to them** are returned | |
| LIST-03 | P | Administrator calls `GET /requests` | **All** requests returned, unscoped | |
| LIST-04 | P | `GET /requests?status=RESOLVED` | Only `RESOLVED` requests in the result set | |
| LIST-05 | P | `GET /requests?search=projector` | Only requests whose code/title/location contain "projector" (case-insensitive) | |
| LIST-06 | E | `GET /requests?page=2&limit=1` against a set with ≥2 records | Correct single-item slice for page 2, `total` reflects full count | |
| LIST-07 | N | `GET /requests?page=0` | `400 Bad Request` (`page` must be ≥ 1) | |
| LIST-08 | N | `GET /requests?page=abc` | `400 Bad Request` (non-numeric page) | |
| LIST-09 | E | Search term matching no records | `200`, `items: []`, `total: 0` | |

#### 5. Request Detail & Activity Log (`GET /requests/:id`)

| ID | Type | Steps / Input | Expected Result | Actual Result |
|---|---|---|---|---|
| DET-01 | P | Owner (Student/Staff) views their own request | `200`, includes chronological `activity` array | |
| DET-02 | N | A **different** Student/Staff account requests someone else's request id | `403 Forbidden` — "You do not have access to this request" | |
| DET-03 | N | Officer requests an id **not** assigned to them | `403 Forbidden` | |
| DET-04 | P | Administrator views any request id | `200`, full detail regardless of ownership | |
| DET-05 | N | `GET /requests/999999` (non-existent id) | `404 Not Found` — "Service request not found" | |
| DET-06 | E | `GET /requests/abc` (non-numeric id) | `400 Bad Request` (`ParseIntPipe`) | |

#### 6. Assignment (`PATCH /requests/:id/assign`, Administrator only)

| ID | Type | Steps / Input | Expected Result | Actual Result |
|---|---|---|---|---|
| ASG-01 | P | Admin assigns a `PENDING` request to a valid Maintenance Officer id | `200`, `status: ASSIGNED`, assignee set, activity log gains an "Assigned to …" entry | |
| ASG-02 | N | `officerId` belongs to a Student/Staff or Administrator account | `400 Bad Request` — "Target user is not a maintenance officer" | |
| ASG-03 | N | `officerId` does not exist | `400 Bad Request` — same message as ASG-02 | |
| ASG-04 | N | Assign a non-existent request id | `404 Not Found` — "Service request not found" | |
| ASG-05 | E | Re-assign an already-`ASSIGNED` request to a **different** officer | `200`, current assignee updates to the new officer; the **original** assignment remains in history (append-only `assignments` table, not overwritten) | |

#### 7. Status Update (`PATCH /requests/:id/status`)

| ID | Type | Steps / Input | Expected Result | Actual Result |
|---|---|---|---|---|
| STA-01 | P | Assigned officer sets `status: IN_PROGRESS` with a `note` | `200`, status updates, note recorded in activity log | |
| STA-02 | P | Assigned officer sets `status: RESOLVED` | `200`, request marked resolved | |
| STA-03 | P | Administrator updates status on a request **not** assigned to them | `200` (admin bypasses the assignment check) | |
| STA-04 | N | Officer attempts to update a request assigned to a **different** officer | `403 Forbidden` — "This request is not assigned to you" | |
| STA-05 | N | `status: "PENDING"` or `"ASSIGNED"` (not in the manually-settable enum) | `400 Bad Request` (`IsIn` restricts to `IN_PROGRESS` / `RESOLVED` / `REJECTED`) | |
| STA-06 | E | Status update with `note` omitted (optional field) | `200`, activity entry recorded with `note: null` | |

#### 8. Evidence File Upload (`POST /uploads/evidence`)

| ID | Type | Steps / Input | Expected Result | Actual Result |
|---|---|---|---|---|
| UPL-01 | P | Upload a valid `.jpg` or `.png`, under 2 MB | `200`, returns an accessible `url` | |
| UPL-02 | N | Upload a `.pdf` or other non-image file | `400 Bad Request` — "Only JPG or PNG images are allowed" | |
| UPL-03 | N | Upload an image file larger than 2 MB | Rejected by Multer's file-size limit | |
| UPL-04 | N | Call the endpoint with no file attached | `400 Bad Request` — "No file uploaded" | |
| UPL-05 | N | Call the endpoint with no `Authorization` header | `401 Unauthorized` | |

#### 9. User Management (`/users`, Administrator only)

| ID | Type | Steps / Input | Expected Result | Actual Result |
|---|---|---|---|---|
| USR-01 | P | Admin calls `GET /users` | `200`, all users across all three roles | |
| USR-02 | P | Admin sets `PATCH /users/:id/role` with `role: "MAINTENANCE_OFFICER"` on a Student/Staff account | `200`, user's role updated; they gain officer-scoped access on next login/token refresh | |
| USR-03 | N | `role: "SUPERADMIN"` (not a valid enum value) | `400 Bad Request` | |
| USR-04 | N | `PATCH /users/999999/role` (non-existent user id) | `404 Not Found` — "User not found" | |
| USR-05 | N | Non-admin calls either `/users` endpoint | `403 Forbidden` | |

#### 10. Categories (`GET /categories`)

| ID | Type | Steps / Input | Expected Result | Actual Result |
|---|---|---|---|---|
| CAT-01 | P | Any authenticated role calls `GET /categories` | `200`, seeded list (Electricity, Plumbing, Furniture, Internet/Network, Classroom Equipment, Hostel Maintenance, Other) | |
| CAT-02 | N | Call with no token | `401 Unauthorized` | |

#### 11. Reports & CSV Export (Administrator only)

| ID | Type | Steps / Input | Expected Result | Actual Result |
|---|---|---|---|---|
| REP-01 | P | Admin calls `GET /reports/summary` | `200`, aggregate counts by status, category, and officer workload | |
| REP-02 | N | Non-admin calls `GET /reports/summary` | `403 Forbidden` | |
| REP-03 | P | Admin calls `GET /reports/export` | `200`, `Content-Type: text/csv`, downloadable file with correct header row | |
| REP-04 | P | Admin calls `GET /requests/export` | `200`, CSV of **all** requests system-wide (unscoped, unlike the officer/student view) | |
| REP-05 | E | Export endpoints called when the database has zero matching requests | `200`, CSV containing only the header row, no data rows | |

## 10. Deployment Information

| Component | Platform | URL |
|---|---|---|
| Frontend | Vercel | `https://uni-fix-lake.vercel.app` |
| Backend API | Railway | `https://unifix-production.up.railway.app` |
| API Docs | Railway (Swagger) | `https://unifix-production.up.railway.app/docs` |
| Database | Neon (PostgreSQL, EU-West-2) | Connected via `DATABASE_URL`, never committed to source control |

**Demo accounts** (password `password123` for all):

| Role | Email |
|---|---|
| Administrator | `admin@uni.edu` |
| Maintenance Officer | `officer@uni.edu` |
| Student / Staff | `student@uni.edu` |

Secrets (database connection string, JWT signing secrets) are supplied via
platform environment variables on both Railway and Vercel — never committed
to the repository. `.env.example` files are provided in both `unifix-api/`
and `unifix-web/` documenting the required variables without real values.

## 11. Challenges Encountered and Solutions

1. **Corrupted npm cache (root-owned files).** A prior npm bug had left some
   globally-cached files owned by `root`, blocking every local install.
   *Solution:* one-time `sudo chown -R` on the npm cache directory, as
   recommended by npm's own error output.

2. **Prisma 7's new TypeScript-first client generator.** Recent Prisma
   versions changed how the client is generated and configured — the
   `datasource.url` can no longer live in `schema.prisma`, and the generated
   client requires an explicit driver adapter (`@prisma/adapter-pg`) rather
   than a bare connection string. The generator also defaults to emitting
   ESM-style imports incompatible with the rest of the NestJS project's
   CommonJS build. *Solution:* moved the connection string to
   `prisma.config.ts`, added the `pg` driver adapter, and set
   `moduleFormat = "cjs"` on the generator so the emitted client compiles
   cleanly alongside the rest of the app.

3. **Seeding with Prisma's new NodeNext-style generated imports.** The
   generated client's relative imports use an explicit `.js` extension
   (valid under TypeScript's NodeNext module resolution) that `ts-node`
   could not resolve when running the seed script directly. *Solution:*
   switched the Prisma seed runner to `tsx`, which resolves this import style
   correctly.

4. **Railway free-tier project limit.** Railway's free plan caps the number
   of *projects* an account can create, and a second/third project triggered
   an upgrade prompt. *Solution:* rather than upgrading to a paid plan,
   the backend was added as an additional **service** inside an existing,
   unused free project — services within a project are not subject to the
   same cap.

5. **Production crash: `Cannot find module '/app/dist/main'`.** After the
   first Railway deploy, the container crash-looped because `nest build`
   was emitting the compiled entry point to `dist/src/main.js` rather than
   the conventional `dist/main.js`. This happened because the app imports
   the Prisma-generated client from a directory (`generated/prisma/`)
   *outside* `src/`, which shifts TypeScript's automatically-computed output
   root up to the project root, nesting the rest of the compiled output
   under `dist/src/`. This was missed locally because only `tsc --noEmit`
   (type-checking) had been run, not a full production build.
   *Solution:* corrected the `start:prod` script to point at
   `dist/src/main`, verified by running the actual compiled output locally
   before redeploying.

6. **Vercel Deployment Protection blocking public access.** The frontend
   returned `302` redirects to Vercel's SSO login for all visitors, because
   the hosting team's default "Vercel Authentication" setting gates every
   deployment behind a login. *Solution:* disabled "Require Log In" under
   the project's Deployment Protection settings, since UniFix needs to be
   publicly reachable by students and staff, not just team members.

## 12. Conclusion

UniFix demonstrates a complete, production-shaped solution to the
university's manual maintenance-tracking problem: a NestJS/Prisma/PostgreSQL
backend enforcing authentication and role-based authorization at the API
layer, a Next.js frontend presenting three distinct role-scoped experiences,
and a persistent audit trail giving full accountability over every request's
lifecycle from submission to resolution. Beyond the four required advanced
features, the system implements seven (JWT auth, RBAC, file upload,
search/filter/pagination, audit trail, Swagger documentation, and CSV
export). Both unit and end-to-end tests pass against the live database, and
the application is deployed and publicly reachable, with its production
build verified to be correctly wired to that live database rather than a
local development instance. The main engineering challenges were not in the
application's business logic but in toolchain integration — Prisma's newer
generator conventions, and platform-specific deployment quirks on Railway
and Vercel — all of which were diagnosed from first principles and resolved
without working around the underlying issue.
