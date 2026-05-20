import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('URL:', process.env.DATABASE_URL);
const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  const res = await sql`SELECT 1 as connected`;
  console.log('Connected:', res);
}

main().catch(console.error).finally(() => sql.end());
