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
