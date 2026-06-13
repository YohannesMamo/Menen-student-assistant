import pool from './db.js';

const checkDuplicateFunctions = async () => {
  try {
    const res = await pool.query(`
      SELECT 
        n.nspname as schema,
        p.proname as name,
        pg_get_function_arguments(p.oid) as args,
        pg_get_function_result(p.oid) as result
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'get_student_textbook_progress';
    `);
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

checkDuplicateFunctions();
