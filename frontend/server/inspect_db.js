import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

console.log('DB_USER:', process.env.DB_USER);
console.log('DB_DATABASE:', process.env.DB_DATABASE);
console.log('DB_PASSWORD type:', typeof process.env.DB_PASSWORD);

const pool = new Pool({
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
});

const inspectTables = async () => {
  const tables = [
    'STextBooks', 
    'STBChapters', 
    'STBSections', 
    'STBPresentations', 
    'StuSectionProgress', 
    'StudyNotes',
    'StudentSectionProgress',
    'STBBasicNotes'
  ];

  try {
    for (const table of tables) {
      console.log(`--- Table: ${table} ---`);
      const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      if (res.rows.length === 0) {
        console.log(`Table ${table} not found or has no columns.`);
      } else {
        console.table(res.rows);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('Error inspecting tables:', err.message);
    process.exit(1);
  }
};

inspectTables();
