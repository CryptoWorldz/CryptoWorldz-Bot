# v2 Implementation checklist

This checklist outlines the initial tasks to complete the v2 refactor while preserving current bot behaviour.

- [ ] Create modular src/ layout and move core logic into modules without changing runtime entrypoint.
- [ ] Add tests (Jest) and create representative unit tests for critical modules.
- [ ] Add ESLint config and run linting; fix warnings where safe.
- [ ] Implement safe Supabase migration strategy (non-destructive SQL by default).
- [ ] Create CI workflow to run tests and lint (add after initial scaffold).
- [ ] Document environment variables and do NOT commit secrets.
- [ ] Ensure start script and existing index.js behavior remain unchanged while wiring new modules.

Notes:
- This scaffold intentionally avoids modifying the primary runtime files so the bot continues to work as before.
- Next steps: gradually move code into src/modules and add integration tests; create migrations that are safe for production.
