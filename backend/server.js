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
  if (!pool) {
    return res.status(500).json({ error: 'CRITICAL: DATABASE_URL is missing!' });
  }
  next();
};

async function initDB() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        name TEXT,
        category TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        worker_id TEXT,
        date TEXT,
        shift TEXT,
        status TEXT,
        CONSTRAINT unique_worker_date_shift UNIQUE (worker_id, date, shift)
      );
    `);

    // Safely upgrade the database to support Late In and Early Out
    await pool.query(`
      ALTER TABLE attendance 
      ADD COLUMN IF NOT EXISTS late_in BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS early_out BOOLEAN DEFAULT false;
    `);

    console.log('Connected to Neon PostgreSQL database and upgraded tables.');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}
initDB();

// API Routes
app.get('/api/workers', requireDB, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workers ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/workers', requireDB, async (req, res) => {
  const { id, name, category } = req.body;
  try {
    await pool.query(
      'INSERT INTO workers (id, name, category) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category',
      [id, name, category]
    );
    res.json({ message: 'Worker saved successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/workers/bulk', requireDB, async (req, res) => {
  const workers = req.body;
  try {
    for (const w of workers) {
      await pool.query(
        'INSERT INTO workers (id, name, category) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category',
        [w.id, w.name, w.category]
      );
    }
    res.json({ message: `Successfully imported ${workers.length} employees!` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/workers/:id', requireDB, async (req, res) => {
  try {
    await pool.query('UPDATE workers SET name = $1, category = $2 WHERE id = $3', [req.body.name, req.body.category, req.params.id]);
    res.json({ message: 'Worker updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/workers/:id', requireDB, async (req, res) => {
  try {
    await pool.query('DELETE FROM workers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Worker deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/attendance', requireDB, async (req, res) => {
  const { worker_id, date, shift, status, late_in = false, early_out = false } = req.body;
  try {
    await pool.query(`
      INSERT INTO attendance (worker_id, date, shift, status, late_in, early_out) 
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (worker_id, date, shift) 
      DO UPDATE SET status = EXCLUDED.status, late_in = EXCLUDED.late_in, early_out = EXCLUDED.early_out
    `, [worker_id, date, shift, status, late_in, early_out]);
    res.json({ message: 'Attendance saved successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/attendance', requireDB, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM attendance WHERE date = $1 AND shift = $2', [req.query.date, req.query.shift]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/dashboard-stats', requireDB, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const workerRes = await pool.query('SELECT COUNT(*) FROM workers');
    const attRes = await pool.query('SELECT status, COUNT(*) FROM attendance WHERE date = $1 GROUP BY status', [today]);
    let present = 0, absent = 0;
    attRes.rows.forEach(row => {
      if (row.status === 'PRESENT') present = parseInt(row.count);
      if (row.status === 'ABSENT') absent = parseInt(row.count);
    });
    res.json({ total: parseInt(workerRes.rows[0].count), present, absent });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/', (req, res) => res.send('Attendance API is running live on Vercel!'));

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running locally on port ${PORT}`));
}
module.exports = app;