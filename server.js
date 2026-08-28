const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

if (!fs.existsSync('data')) {
  fs.mkdirSync('data', { recursive: true });
}

const app = express();
const db = new Database('data/habits.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

db.exec(`
  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phase TEXT NOT NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'boolean',
    sort_order INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS habit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER,
    date TEXT NOT NULL,
    value TEXT NOT NULL,
    FOREIGN KEY(habit_id) REFERENCES habits(id),
    UNIQUE(habit_id, date)
  );
`);

const existingCount = db.prepare('SELECT COUNT(*) as count FROM habits').get().count;
if (existingCount === 0) {
  const seedStmt = db.prepare('INSERT INTO habits (phase, category, name, type, sort_order) VALUES (?, ?, ?, ?, ?)');
  
  const habitsList = [
    // --- SLEEP ---
    ['Sleep', 'Sleep', 'Screens Off', 'time', 1],
    ['Sleep', 'Sleep', 'Bed', 'time', 2],
    ['Sleep', 'Sleep', 'Wake', 'time', 3],
    ['Sleep', 'Sleep', 'Sleep Opp', 'duration', 4],
    ['Sleep', 'Sleep', 'Snore Score', 'percentage', 5],

    // --- MORNING ---
    ['Morning', 'Supplements', 'B12', 'boolean', 6],
    ['Morning', 'Supplements', 'Flax', 'boolean', 7],
    ['Morning', 'Meditation', 'Sit 1', 'boolean', 8],
    ['Morning', 'Meditation', 'Walk 1', 'boolean', 9],
    ['Morning', 'Meditation', 'Sit 2', 'boolean', 10],
    ['Morning', 'Journal', 'Declutter Mind', 'boolean', 11],
    ['Morning', 'Journal', 'Plan', 'boolean', 12],
    ['Morning', 'Journal', 'Track', 'boolean', 13],
    ['Morning', 'Journal', 'Open Todoist', 'boolean', 14],
    ['Morning', 'Dopamine Detox', 'Physical Labor', 'boolean', 15],
    ['Morning', 'Dopamine Detox', 'No PMO', 'boolean', 16],
    ['Morning', 'Kitchen', 'Cook', 'boolean', 17],

    // --- MIDDLE ---
    ['Middle', 'Meditation', '25/5 Split Sit', 'boolean', 18],
    ['Middle', 'Dopamine Detox', 'PC Work (Pre-Read)', 'boolean', 19],
    ['Middle', 'Dopamine Detox', 'Just Read (Post-PC)', 'boolean', 20],
    ['Middle', 'Dopamine Detox', 'No PMO', 'boolean', 21],
    ['Middle', 'Dopamine Detox', 'Just Eat', 'boolean', 22],

    // --- EVENING ---
    ['Evening', 'Journal', 'Track', 'boolean', 23],
    ['Evening', 'Journal', 'PTT', 'boolean', 24],
    ['Evening', 'Meditation', 'Sit 3', 'boolean', 25],
    ['Evening', 'Meditation', 'Walk 2', 'boolean', 26],
    ['Evening', 'Meditation', 'Sit 4', 'boolean', 27],
    ['Evening', 'Dopamine Detox', 'Just Read', 'boolean', 28],
    ['Evening', 'Dopamine Detox', 'No PMO', 'boolean', 29]
  ];

  habitsList.forEach(h => seedStmt.run(...h));
}

app.get('/api/grid', (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = req.query.month;
  const habits = db.prepare('SELECT * FROM habits ORDER BY sort_order ASC, id ASC').all();
  
  const dates = [];

  if (month === 'all') {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const totalDays = isLeap ? 366 : 365;
    const start = new Date(year, 0, 1);
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
  } else {
    const mIdx = parseInt(month) - 1;
    const daysInMonth = new Date(year, mIdx + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dates.push(dateStr);
    }
  }

  const logs = db.prepare('SELECT * FROM habit_logs WHERE date >= ? AND date <= ?')
                .all(dates[0], dates[dates.length - 1]);

  res.json({ habits, dates, logs });
});

app.post('/api/habits', (req, res) => {
  const { name, phase, category, type } = req.body;
  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM habits').get().max || 0;
  const stmt = db.prepare('INSERT INTO habits (phase, category, name, type, sort_order) VALUES (?, ?, ?, ?, ?)');
  const info = stmt.run(phase || 'Morning', category || 'General', name, type || 'boolean', maxOrder + 1);
  res.json({ id: info.lastInsertRowid, phase, category, name, type });
});

app.delete('/api/habits/:id', (req, res) => {
  db.prepare('DELETE FROM habit_logs WHERE habit_id = ?').run(req.params.id);
  db.prepare('DELETE FROM habits WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/logs', (req, res) => {
  const { habit_id, date, value } = req.body;
  
  if (value === '' || value === null) {
    db.prepare('DELETE FROM habit_logs WHERE habit_id = ? AND date = ?').run(habit_id, date);
  } else {
    const stmt = db.prepare(`
      INSERT INTO habit_logs (habit_id, date, value) 
      VALUES (?, ?, ?)
      ON CONFLICT(habit_id, date) DO UPDATE SET value = excluded.value
    `);
    stmt.run(habit_id, date, value);
  }
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Omarchy Habits V1 running on port ${PORT}`));