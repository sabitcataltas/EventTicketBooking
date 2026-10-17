## Monorepo Structure

This is a monorepo managed with npm workspaces. Each package lives in its own top-level directory and is listed under `workspaces` in the root `package.json`.

- `api/` — backend API (Node.js, TypeScript run natively via `node`, tests with `node --test`)

Shared tooling lives at the root and applies to all workspaces:

- `tsconfig.json` — base TypeScript config; each workspace extends it (`"extends": "../tsconfig.json"`)
- `eslint.config.js` — single ESLint config for the whole repo
- Prettier, ESLint and TypeScript are root devDependencies; do not add them to workspaces

Conventions:

- Install dependencies from the root: `npm install <pkg> -w <workspace>`
- Run workspace scripts from the root: `npm run <script> -w <workspace>`
- Root scripts: `npm run dev`, `npm test`, `npm run lint`, `npm run format`, `npm run type:check`
- When adding a new workspace, create its directory with its own `package.json` and `tsconfig.json` extending the root config, then add it to `workspaces` in the root `package.json`

## Code Quality

After modifying any file, always run:

- `npx eslint --fix <filename>`
- `npx prettier --write <filename>`

Never finish a task with lint errors.

Do not write comments.

Keep code changes minimal. Only change what the task requires.

## Testing

APIs are built with Test-Driven Development (TDD):

1. Write a failing test for the API behavior first.
2. Write the minimal code to make the test pass.
3. Refactor while keeping tests green.
