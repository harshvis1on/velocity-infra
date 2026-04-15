# Legacy SQL Files

These SQL files are superseded by `migrations/001-full-migration.sql`.

Do NOT run these against the database. They exist only for historical reference.

- `schema.sql` — Original v1 schema (users, machines, rentals, transactions)
- `host-agent-schema.sql` — Incremental Docker fields for old rentals model
- `setup-trigger.sql` — Original user profile trigger

The canonical migration is: `../migrations/001-full-migration.sql`
