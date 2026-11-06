# Agent Context

## Project

oci-catcher — a Cloudflare Worker on a one-minute cron that launches an OCI instance as soon as host capacity exists, then pushes an ntfy notification.
Temporary by design: delete the Worker once the instance exists.

Before working, read `.nvmrc` (Node version), `.dev.vars.example` (secrets), `package.json` scripts, `wrangler.toml` and `wrangler.test.toml`, and `vitest.config.ts`. Checks: `npm run lint`, `npx tsc --noEmit`, `CI=true npx vitest run`.

## Constraints

- Launch settings come only from config (`wrangler.toml` `[vars]` and secrets). Never hardcode a launch value in code.
- Tenancy-specific values (OCIDs, fingerprint, availability domain, ssh key, ntfy topic, private key) are Worker secrets, listed in `.dev.vars.example`. Never put them in `wrangler.toml`.
- Signing (OCI signature version 1): sign and send the exact same body string. `x-content-sha256` is computed from it. Keys must be PKCS#8 (`BEGIN PRIVATE KEY`); Web Crypto cannot import PKCS#1.
- The capacity report takes the **tenancy** OCID as `compartmentId`, not the instance's compartment.
- Every launch sends `opc-retry-token: <name>-<scheduled epoch ms>`, so a retried request cannot create a second instance.
- Notifications: a launch always notifies (`urgent`); 429, 5xx and out of capacity are silent; any other failure notifies (`high`) only on the `:00` run. A failed ntfy publish fails the run.
- The OCI user may only create instances (`where request.permission = 'INSTANCE_CREATE'`). A `404 NotAuthorizedOrNotFound` on launch points at the policy first; never fix it with an admin key.
- Workers Free plan allows 10 ms CPU per run. Key import plus three signatures measured about 4 ms; keep crypto work per run at that level.

## Stack

- Runtime: Cloudflare Workers (cron trigger only, no fetch handler)
- Language: TypeScript (strict, ESNext, bundler module resolution)
- Bundler: Wrangler
- Testing: Vitest with `@cloudflare/vitest-pool-workers`
- Linting: ESLint with `typescript-eslint`
- Dependencies: `safe-wrapper`. No OCI SDK (Node-only); requests are signed with Web Crypto.

## Code Texture

### Naming

- `snake_case` for variables, functions, methods, properties, parameters, file names.
- `PascalCase` for classes and type names.
- Type names end with `Type` (e.g. `CatchOutcomeType`, `OciLaunchDetailsType`, `ErrorCodeType`).
- OCI request and response bodies keep OCI's camelCase field names (`compartmentId`, `lifecycleState`).
- File names: `kebab-case` for multi-word files (e.g. `base-error.ts`, `context-store.ts`).
- Logger labels match the module path: `loggerFor('clients/oci')`, `loggerFor('services/catcher')`.

### Imports

- Extensionless imports. No `.ts` extensions.
- Single quotes. Semicolons.
- `import type` for type-only imports. `export type` for type-only re-exports.
- Import order: external packages first, then internal modules grouped by layer (clients, common, config, errors, siblings, types).
- Barrel `index.ts` in every directory. Named exports only. No default exports except `worker.ts`.

### Classes

- One class per file. File name matches the class concept in kebab-case.
- Class methods are arrow function properties: `run = async (scheduled: Date) => { ... };`.
- Constructor assigns to `private readonly` fields. No parameter property shorthand. Dependencies are positional.
- Private helpers are arrow properties: `private attempt = async (...) => { ... };`.
- Services read settings from the `config` module, not from constructor arguments.

### Types

- `type` keyword, not `interface`.
- Types split by concern: `catcher.ts`, `config.ts`, `context.ts`, `env.ts`, `errors.ts`, `oci.ts`. All re-exported from `types/index.ts`.

### Errors

- One error class per file. Every error takes `(message, payload?)`.
- `BaseError` extends `Error` with `code: ErrorCodeType` and `payload: ErrorPayloadType`.
- `OciRequestFailed` payload carries `method`, `path`, `status`, `service_code`, `request_id`.

### Control Flow

- Early returns and guard clauses over nested if/else.
- Single-line `if` for throws and returns.
- `safe` from `safe-wrapper` wraps every external call (client methods are `name = safe(async (...) => { ... })`). Callers destructure `[error, result]` and guard: `if (list_error) return settle(list_error);`.

### Architecture

- **Layers:** `worker.ts` (scheduled handler) → services → clients.
- **Service locator.** `ServiceRegistry` in `services/locator.ts` with typed `register()` / `resolve()` / `seal()`. `bootstrap()` wires clients and services after `config` is bootstrapped. Runs once per isolate.
- **Clients** (`clients/`) wrap outside systems: `OciSigner`, `OciClient`, `NtfyClient`.
- **Services** hold the run logic: `CatcherService`.
- **Context store.** Each cron run executes inside `context_store.run({ run_id })` (AsyncLocalStorage); the logger prints the `run_id`, the scheduled minute.

### General

- `const` over `let`. No `var`.
- No comments in code unless explaining a non-obvious constraint.
- No unused imports, no unused variables.
- Max line length 200.

## Commit Style

One line, lowercase, imperative, trailing period. No conventional-commit prefixes, no scopes, no bodies.
Verb vocabulary: init, setup, configure, implement, include, update, refine, consolidate, harden, support, disable, bump, document.
