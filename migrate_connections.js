require('dotenv').config({path: '.env.local'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    console.log('Creating connections table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "connections" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "initiator_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
        "recipient_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
        "status" varchar(20) DEFAULT 'pending',
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "connections_pair_idx" ON "connections" ("initiator_id", "recipient_id");`;
    await sql`CREATE INDEX IF NOT EXISTS "connections_recipient_idx" ON "connections" ("recipient_id");`;

    console.log('Creating direct_chats table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "direct_chats" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_a_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
        "user_b_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
        "connection_id" uuid REFERENCES "connections"("id") ON DELETE set null,
        "last_message_at" timestamp DEFAULT now(),
        "created_at" timestamp DEFAULT now()
      );
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "direct_chats_pair_idx" ON "direct_chats" ("user_a_id", "user_b_id");`;

    console.log('Creating direct_messages table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "direct_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "chat_id" uuid NOT NULL REFERENCES "direct_chats"("id") ON DELETE cascade,
        "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
        "content" text NOT NULL,
        "is_read" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS "direct_messages_chat_idx" ON "direct_messages" ("chat_id");`;
    await sql`CREATE INDEX IF NOT EXISTS "direct_messages_created_idx" ON "direct_messages" ("created_at");`;

    console.log('Migration done');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
