# Matrika CRM

React / Vite / TypeScript frontend and .NET 8 / MySQL backend. Matrika Technology, Bangalore.

## Completed pages

| Route | Purpose |
| --- | --- |
| `/login` | Staff email/password sign-in |
| `/` | Live CRM summary, revenue, pipeline and pending follow-ups |
| `/crm/leads` | Existing lead management and conversion |
| `/crm/customers` | Existing customer/contact management |
| `/crm/deals` | Existing pipeline and approvals |
| `/crm/activities` | Existing activities and tasks |
| `/crm/support` | Customer access administration and support inbox |
| `/crm/reports` | Date-filtered CRM analytics, charts and CSV export |
| `/customer/login` | Separate customer email/password sign-in |
| `/portal` | Own deals, progress, support requests and conversations |
| `/entity`, `/branch` | Existing entity and branch masters |
| `/roles`, `/designation`, `/users`, `/pages` | Existing access and configuration masters |
| `/profile`, `/changePassword` | Account information and password change |

All routes share the black/violet design system, responsive vertical navigation and Matrika identity. The live header clock and its interval logic are removed. Business dates such as activity deadlines remain because they are part of CRM records. Existing CRM CRUD workflows and masters are retained. Static raster branding has been removed; uploaded customer/user records are not deleted.

## Historical database export

The repository contains `dump-matrika-crm.sql`. Historical SQL statements and customer data were rebranded in GitHub; the export appends four portal/support tables and idempotent Page Master inserts for all 15 staff routes, including Reports. This is a historical export, not an automatically migrated live database.

For an existing installation, import the revised SQL into a **new or backed-up** MySQL database, configure `ConnectionStrings__DefaultConnection` for that database and preserve the matching `Security__EncryptionKeyHex` for encrypted data. Then run the explicit `--setup-matrika` command below to set the intended existing superadmin's email/password and current entity branding. Do not import an old export over a working database.

## Fresh local installation (Docker Desktop)

For a new empty CRM on your own computer, install Docker Desktop and PowerShell, then run from the repository root:

```powershell
.\scripts\configure-local.ps1
# Enter your chosen superadmin password at the prompt.
docker compose build
docker compose run --rm api --init-local
docker compose up -d
```

Open **http://localhost:5173/login**. The superadmin email is **matrika843@gmail.com** and the password is the one entered at the prompt. Customer sign-in is **http://localhost:5173/customer/login**. The API listens at **http://localhost:5007**. Later starts need only `docker compose up -d`; stop with `docker compose stop`.

The initializer requires an empty database and Development mode. It creates the core CRM schema, the Bangalore entity/branch, the superadmin and page masters. Customers, leads, deals, activities and tickets start empty. It never installs sample business records. Local passwords and generated keys are stored in the ignored `.env` file; retain it and the database volume. These Docker files are for local development, not public production hosting. Docker itself was unavailable in the implementation environment; the same schema, initialization and app were tested directly with MariaDB and .NET.

With your own empty MySQL/MariaDB database instead, set the connection, JWT/encryption keys and `Matrika__AdminPassword`, set `ASPNETCORE_ENVIRONMENT=Development`, and run `dotnet run --project server-dotnet/Matrika.Api.csproj -- --init-local` before starting the API and frontend.

## Run against an existing database

Requirements: Node.js 20+ with npm, .NET SDK 8, and your existing MySQL/MariaDB CRM database.

1. Configure the existing backend connection and encryption/JWT settings using deployment secrets or environment variables. Keep the existing encryption key for existing encrypted data. Environment keys include `ConnectionStrings__DefaultConnection`, `Security__EncryptionKeyHex`, `Jwt__Key`, `Jwt__Issuer`, `Jwt__Audience`.
2. Run `npm ci` in `client`. Copy `client/.env.example` to `client/.env` if needed.
3. Complete the one-time setup below against the intended database.
4. Run `dotnet run --project server-dotnet/Matrika.Api.csproj`. The existing launch profile uses `http://localhost:5007`.
5. Run `npm run dev` in `client`.

## One-time Matrika setup

Back up the database first. This explicit command changes the selected existing superadmin and its entity; normal server startup never resets passwords. It requires the existing `users`, `roles`, `entity`, `pages`, `session` and CRM tables. It does not import or overwrite the historical SQL dump.

On Windows PowerShell from the repository root:

```powershell
# Set the database connection securely in your environment first.
.\scripts\setup-matrika.ps1
# If more than one superadmin exists, specify the intended existing IDs:
.\scripts\setup-matrika.ps1 -EntityId <entity-id> -AdminUserId <user-id>
```

Enter the password requested for this project at the secure prompt. No password is shipped in source, the browser, or the database migration. The setup sets the email to `matrika843@gmail.com`, display name to `Matrika`, entity name to `Matrika Technology Bangalore`, and address to `Bangalore`, hashes the password with BCrypt, revokes previous sessions, removes old entity branding references, and sets Matrika app metadata. It creates the customer portal/support tables and adds all missing registered staff routes to Page Master. Existing roles and CRM records are retained. Do not run setup repeatedly unless you intentionally want to reset the chosen admin password.

On other systems, set `Matrika__AdminPassword` in the process environment, optionally `Matrika__EntityId` and `Matrika__AdminUserId`, then run:

```sh
dotnet run --project server-dotnet/Matrika.Api.csproj -- --setup-matrika
```

A separate clean local database was initialized and the requested superadmin login was verified. Your existing/deployed database was not accessed or migrated; it still requires the explicit setup command.

## Staff email migration

The legacy `user_name` storage/API field is retained for compatibility, but now holds a normalized email address. Staff sign-in accepts `{ "email": "...", "password": "..." }`; usernames are not accepted. After setup, use **Team access → Edit user** to assign a valid unique email to each existing non-email staff account. New users require email and a password of at least eight characters. Account edits revoke existing sessions. Password changes verify the current password.

## Customer access and support

1. Create/select a customer using the existing Customers page.
2. As superadmin/admin, open **Customer support → Customer portal access**.
3. Select the customer, enter their login email and initial password, and select **Save access**. Share credentials securely; no emails are sent automatically.
4. Customers sign in at `/customer/login` and see only deals linked to their customer and entity, plus their support tickets.
5. Customers can create requests, set priority, read/reply to conversations and reopen resolved requests by replying.
6. Staff use the support inbox to reply and set Open, In progress, Waiting for customer, Resolved or Closed. Status changes appear in the conversation.
7. Admins can reset access or disable it. Password resets revoke all customer sessions; disabled accounts cannot access the portal.

Non-admin support staff need `/crm/support` page access in Roles and update permission to reply/change status. Customer accounts are separate from staff roles and cannot authenticate to staff APIs. Portal queries derive customer/entity identity from the stored session; internal CRM notes are never included in customer deal responses. Sessions expire after 12 hours; only token hashes are stored in the database.

## Reports and Page Master

Staff open **Reports & insights** at `/crm/reports`. Choose a date range up to 24 months, switch the workspace entity/branch, and use **Export CSV** for the same period. The page shows customer, lead, deal and activity breakdowns, monthly acquisition and pipeline charts, lead sources, conversion counts, overdue activities and support requests. These are aggregates of live CRM records; there is no sample report data. The date filter uses each record's creation date and displays its current status/stage. Deal value is the sum of amounts for deals created in the period. Tickets have no branch field, so their charts are clearly marked entity-wide.

The idempotent [`003_reports_page.sql`](server-dotnet/Migrations/003_reports_page.sql) registers `/crm/reports` in the Page Master UI. For an **existing** database already migrated for customer support, run this file once against the intended database without resetting the superadmin password, for example `mysql -u USER -p DATABASE < server-dotnet/Migrations/003_reports_page.sql`. New local installations and explicit Matrika setup also apply it. Superadmins and admins can open reports; give other staff `/crm/reports` access from Roles and permissions. Customer portal accounts cannot open staff reports.

## Verification

```sh
cd client
npm ci
npm run typecheck
npm run build
npx playwright install chromium --only-shell
cd ..
node scripts/ui-smoke.cjs
dotnet build server-dotnet/Matrika.Api.csproj
dotnet run --project server-tests/Matrika.Tests.csproj
```

The browser script uses isolated API fixtures to verify layout/navigation and request contracts; it does not prove production database integration. The backend checks cover anonymous/foreign-customer denial, staff authorization, public-field scoping, email binding/validation and BCrypt hashing of JSON-submitted user passwords. Screenshots default to `/tmp/crm-ui` (override `CRM_SCREENSHOT_DIR`).

Before production use, test setup on a database backup; sign in as the selected admin; create a staff user with an email and verify login; provision two customers and ensure each sees only its own deals/tickets; send replies from customer and staff accounts; disable/reset access and verify older sessions fail. Configure the frontend API URL and HTTPS for deployment.

## Scope and remaining integration work

No production database migration or deployment was performed. Automated email invitations/recovery, Google OAuth, attachments, billing, and live push notifications are not implemented. Pre-existing frontend controls for missing password-recovery, profile-upload and 2FA endpoints have been replaced with supported account controls and administrator assistance. Accounts with existing 2FA enabled remain blocked until a working verification backend is configured; security settings are not silently disabled. Existing offline facilities are retained for staff pages; the customer portal is online-only. No production records or dashboard metrics are hardcoded.

## Follow-up cleanup and checks

Page Master reads the database page catalog. After the migration or setup, all registered staff routes appear in its table, including Overview, Customer support and Reports. Adding a page through the superadmin form refreshes the table immediately; the new URL appears there. A URL record controls access metadata; a new screen still requires its React route and component in the application. Public customer routes (`/customer/login`, `/portal`) stay outside staff role permissions.

Entity master now shows business/contact/address/access-expiry columns and six editable fields. Banking, storage credentials, image uploads and unrelated integration controls are removed from that form. Existing values in those database columns are preserved, but entity responses no longer expose them. Entity writes require a superadmin, validate input and accept JSON for both add and edit. All entities are listed for superadmins; other users can read only their own entity. Backend project/namespace naming is now `Matrika.Api`; existing installations must keep an explicit connection string pointing at their original database.

Role changes now persist page/action/branch access transactionally and invalidate affected sessions. Staff cannot change roles, and admins cannot grant or edit superadmin roles. Modal overlays appear above the sidebar with a visible, labelled close button.

`scripts/local-integration.cjs` is an opt-in test for an isolated local instance (API on 5007 and Vite on 5173). It uses `Matrika__AdminEmail`/`Matrika__AdminPassword` from the environment. Never run it against production. Browser fixture checks remain separate from genuine database integration checks.
