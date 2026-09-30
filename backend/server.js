import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import pg from 'pg';
const { Pool } = pg;
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

const requireDB = (req, res, next) => {
  if (!pool) return res.status(500).json({ error: 'CRITICAL: DATABASE_URL is missing!' });
  next();
};

async function initDB() {
  if (!pool) return;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS workers (id TEXT PRIMARY KEY, name TEXT, category TEXT, worker_group TEXT DEFAULT '');`);
    await pool.query(`CREATE TABLE IF NOT EXISTS attendance (id SERIAL PRIMARY KEY, worker_id TEXT, date TEXT, shift TEXT, status TEXT, late_in BOOLEAN DEFAULT false, early_out BOOLEAN DEFAULT false, CONSTRAINT unique_worker_date_shift UNIQUE (worker_id, date, shift));`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS date_of_joining TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;`);
    await pool.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS late_in_time TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS early_out_time TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS ot_hours NUMERIC DEFAULT 0;`);
    
    // NEW: Table to track locked shifts
    await pool.query(`CREATE TABLE IF NOT EXISTS shift_locks (date TEXT, shift TEXT, group_name TEXT, is_locked BOOLEAN DEFAULT true, PRIMARY KEY (date, shift, group_name));`);
  } catch (err) { console.error(err); }
}
initDB();

// --- NEW LOCKING APIs ---
app.get('/api/shift-lock', requireDB, async (req, res) => {
  try {
    const { date, shift, group } = req.query;
    const result = await pool.query('SELECT is_locked FROM shift_locks WHERE date = $1 AND shift = $2 AND group_name = $3', [date, shift, group]);
    res.json({ isLocked: result.rows.length > 0 ? result.rows[0].is_locked : false });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/shift-lock', requireDB, async (req, res) => {
  try {
    const { date, shift, group, is_locked } = req.body;
    await pool.query('INSERT INTO shift_locks (date, shift, group_name, is_locked) VALUES ($1, $2, $3, $4) ON CONFLICT (date, shift, group_name) DO UPDATE SET is_locked = EXCLUDED.is_locked', [date, shift, group, is_locked]);
    res.json({ message: 'Lock status updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ------------------------

app.get('/api/workers', requireDB, async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM workers ORDER BY id')).rows); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/workers', requireDB, async (req, res) => {
  try {
    await pool.query('INSERT INTO workers (id, name, category, worker_group, date_of_joining) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, worker_group = EXCLUDED.worker_group, date_of_joining = EXCLUDED.date_of_joining', [req.body.id, req.body.name, req.body.category, req.body.worker_group || '', req.body.date_of_joining || '']);
    res.json({ message: 'Saved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/workers/bulk', requireDB, async (req, res) => {
  const defaultDate = new Date().toISOString().split('T')[0];
  try {
    for (const w of req.body) await pool.query('INSERT INTO workers (id, name, category, date_of_joining) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category', [w.id, w.name, w.category, w.date_of_joining || defaultDate]);
    res.json({ message: `Successfully imported ${req.body.length} employees!` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/workers/:id', requireDB, async (req, res) => {
  try {
    await pool.query('UPDATE workers SET name = $1, category = $2, worker_group = $3, date_of_joining = $4, is_archived = $5 WHERE id = $6', [req.body.name, req.body.category, req.body.worker_group || '', req.body.date_of_joining || '', req.body.is_archived || false, req.params.id]);
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/workers/:id', requireDB, async (req, res) => {
  try {
    await pool.query('UPDATE workers SET is_archived = true WHERE id = $1', [req.params.id]);
    res.json({ message: 'Archived successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/attendance', requireDB, async (req, res) => {
  const { worker_id, date, shift, status, late_in = false, early_out = false, late_in_time = '', early_out_time = '', ot_hours = 0 } = req.body;
  try {
    await pool.query(
      'INSERT INTO attendance (worker_id, date, shift, status, late_in, early_out, late_in_time, early_out_time, ot_hours) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (worker_id, date, shift) DO UPDATE SET status = EXCLUDED.status, late_in = EXCLUDED.late_in, early_out = EXCLUDED.early_out, late_in_time = EXCLUDED.late_in_time, early_out_time = EXCLUDED.early_out_time, ot_hours = EXCLUDED.ot_hours', 
      [worker_id, date, shift, status, late_in, early_out, late_in_time, early_out_time, ot_hours || 0]
    );
    res.json({ message: 'Saved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/attendance/record', requireDB, async (req, res) => {
  const { worker_id, date, shift } = req.query;
  try {
    await pool.query('DELETE FROM attendance WHERE worker_id = $1 AND date = $2 AND shift = $3', [worker_id, date, shift]);
    res.json({ message: 'Record cleared' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/attendance', requireDB, async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM attendance WHERE date = $1 AND shift = $2', [req.query.date, req.query.shift])).rows); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/dashboard-stats', requireDB, async (req, res) => {
  const { start, end } = req.query;
  try {
    const workerRes = await pool.query('SELECT COUNT(*) FROM workers WHERE is_archived = false');
    const attRes = await pool.query('SELECT status, COUNT(*) FROM attendance WHERE date >= $1 AND date <= $2 GROUP BY status', [start, end]);
    let present = 0, absent = 0;
    attRes.rows.forEach(row => {
      if (row.status === 'PRESENT') present += parseInt(row.count);
      if (row.status === 'ABSENT') absent += parseInt(row.count);
    });
    res.json({ total: parseInt(workerRes.rows[0].count), present, absent });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/dashboard/today-list', requireDB, async (req, res) => {
  const { date } = req.query;
  try {
    const result = await pool.query(`
      SELECT a.shift, a.status, w.id, w.name, w.worker_group, a.late_in, a.early_out, a.ot_hours 
      FROM attendance a JOIN workers w ON a.worker_id = w.id 
      WHERE a.date = $1 ORDER BY w.name
    `, [date]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/reports/attendance', requireDB, async (req, res) => {
  const { start, end } = req.query;
  try {
    const result = await pool.query(`SELECT a.date, a.shift, w.id, w.name, w.category, w.worker_group, a.status, a.late_in, a.early_out, a.late_in_time, a.early_out_time, a.ot_hours FROM attendance a JOIN workers w ON a.worker_id = w.id WHERE a.date >= $1 AND a.date <= $2 ORDER BY a.date DESC, a.shift, w.id`, [start, end]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/reports/employee-summary', requireDB, async (req, res) => {
  const { start, end } = req.query;
  try {
    const result = await pool.query(`
      SELECT w.id, w.name, w.category, w.worker_group, w.date_of_joining, w.is_archived,
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as total_present,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as total_absent,
        COUNT(CASE WHEN a.late_in = true THEN 1 END) as total_late_in,
        COUNT(CASE WHEN a.early_out = true THEN 1 END) as total_early_out,
        COALESCE(SUM(a.ot_hours), 0) as total_ot_hours
      FROM workers w LEFT JOIN attendance a ON w.id = a.worker_id AND a.date >= $1 AND a.date <= $2
      GROUP BY w.id, w.name, w.category, w.worker_group, w.date_of_joining, w.is_archived ORDER BY w.id
    `, [start, end]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/', (req, res) => res.send('API Live!'));
if (process.env.NODE_ENV !== 'production') app.listen(PORT, () => console.log(`Server on ${PORT}`));
export default app;