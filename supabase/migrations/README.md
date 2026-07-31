# Supabase migrations (scaffold)

This folder is intentionally non-destructive. Add SQL files that use IF NOT EXISTS to avoid destructive changes during early development.

Guidelines:
- Name files using an ordered numeric prefix (e.g., 0001_create_messages_table.sql).
- Use "CREATE ... IF NOT EXISTS" and "ALTER TABLE ... IF EXISTS" as appropriate.
- Do not include secrets or environment-specific data.

