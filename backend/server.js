require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

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
  } catch (err) { console.error(err); }
}
initDB();

// Core API Routes
app.get('/api/workers', requireDB, async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM workers ORDER BY id')).rows); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/workers', requireDB, async (req, res) => {
  try {
    await pool.query('INSERT INTO workers (id, name, category, worker_group) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, worker_group = EXCLUDED.worker_group', [req.body.id, req.body.name, req.body.category, req.body.worker_group || '']);
    res.json({ message: 'Saved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/workers/bulk', requireDB, async (req, res) => {
  try {
    for (const w of req.body) await pool.query('INSERT INTO workers (id, name, category) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category', [w.id, w.name, w.category]);
    res.json({ message: `Successfully imported ${req.body.length} employees!` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/workers/:id', requireDB, async (req, res) => {
  try {
    await pool.query('UPDATE workers SET name = $1, category = $2, worker_group = $3 WHERE id = $4', [req.body.name, req.body.category, req.body.worker_group || '', req.params.id]);
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/workers/:id', requireDB, async (req, res) => {
  try {
    await pool.query('DELETE FROM workers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/attendance', requireDB, async (req, res) => {
  try {
    await pool.query('INSERT INTO attendance (worker_id, date, shift, status, late_in, early_out) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (worker_id, date, shift) DO UPDATE SET status = EXCLUDED.status, late_in = EXCLUDED.late_in, early_out = EXCLUDED.early_out', [req.body.worker_id, req.body.date, req.body.shift, req.body.status, req.body.late_in || false, req.body.early_out || false]);
    res.json({ message: 'Saved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/attendance', requireDB, async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM attendance WHERE date = $1 AND shift = $2', [req.query.date, req.query.shift])).rows); } catch (err) { res.status(500).json({ error: err.message }); }
});

// FEATURE: Date Range Dashboard Stats
app.get('/api/dashboard-stats', requireDB, async (req, res) => {
  const start = req.query.start || new Date().toISOString().split('T')[0];
  const end = req.query.end || new Date().toISOString().split('T')[0];
  try {
    const workerRes = await pool.query('SELECT COUNT(*) FROM workers');
    const attRes = await pool.query('SELECT status, COUNT(*) FROM attendance WHERE date >= $1 AND date <= $2 GROUP BY status', [start, end]);
    let present = 0, absent = 0;
    attRes.rows.forEach(row => {
      if (row.status === 'PRESENT') present += parseInt(row.count);
      if (row.status === 'ABSENT') absent += parseInt(row.count);
    });
    res.json({ total: parseInt(workerRes.rows[0].count), present, absent });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FEATURE: Full Excel/CSV Export Report
app.get('/api/reports/attendance', requireDB, async (req, res) => {
  const { start, end } = req.query;
  try {
    const result = await pool.query(`
      SELECT a.date, a.shift, w.id, w.name, w.category, w.worker_group, a.status, a.late_in, a.early_out
      FROM attendance a JOIN workers w ON a.worker_id = w.id
      WHERE a.date >= $1 AND a.date <= $2
      ORDER BY a.date DESC, a.shift, w.id
    `, [start, end]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/', (req, res) => res.send('Attendance API is running live!'));

if (process.env.NODE_ENV !== 'production') app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = app;