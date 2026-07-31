-- 0001_create_messages_table.sql
-- Non-destructive example migration for v2 scaffold.

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  chat_id text NOT NULL,
  message_text text,
  created_at timestamptz DEFAULT now()
);
