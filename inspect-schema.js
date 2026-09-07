const fs = require("fs");
const env = fs
  .readFileSync(".env.local", "utf8")
  .split(/\r?\n/)
  .filter((l) => l && !l.startsWith("#"));
const get = (k) =>
  env
    .find((l) => l.startsWith(k + "="))
    ?.replace(k + "=", "")
    .trim();

const ipv6 = "2600:1f18:441a:8902:8c1d:658c:4a0:bfff";
const password = encodeURIComponent(get("DATABASE_URL").split("@")[0].split("://")[1].split(":")[1]);
const user = get("DATABASE_URL").split("://")[1].split(":")[0];

const { Client } = require("pg");
const conn = new Client({
  host: ipv6,
  port: 5432,
  user,
  password: decodeURIComponent(password),
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await conn.connect();
  const res = await conn.query(`
    select table_name, column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'public'
    order by table_name, ordinal_position;
  `);
  for (const r of res.rows) {
    console.log(`${r.table_name} | ${r.column_name} | ${r.data_type} | null=${r.is_nullable}`);
  }
  const fk = await conn.query(`
    select tc.table_name as t, kcu.column_name as c, ccu.table_name as ref
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu using (constraint_name, table_schema)
    join information_schema.constraint_column_usage ccu using (constraint_name, table_schema)
    where tc.constraint_type='FOREIGN KEY' and tc.table_schema='public';
  `);
  console.log("\n=== FKs ===");
  for (const r of fk.rows) console.log(`${r.t}.${r.c} -> ${r.ref}`);
  await conn.end();
}
main().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});