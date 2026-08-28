const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'habits.json');

// Ensure data directory and default JSON file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      habits: [
        { id: 1, phase: 'Sleep', category: 'Sleep', name: 'Screens Off', type: 'time', sort_order: 1 },
        { id: 2, phase: 'Sleep', category: 'Sleep', name: 'Bed', type: 'time', sort_order: 2 },
        { id: 3, phase: 'Sleep', category: 'Sleep', name: 'Wake', type: 'time', sort_order: 3 },
        { id: 4, phase: 'Sleep', category: 'Sleep', name: 'Sleep Opp', type: 'duration', sort_order: 4 },
        { id: 5, phase: 'Sleep', category: 'Sleep', name: 'Snore Score', type: 'percentage', sort_order: 5 },
        { id: 6, phase: 'Morning', category: 'Supplements', name: 'B12', type: 'boolean', sort_order: 6 },
        { id: 7, phase: 'Morning', category: 'Supplements', name: 'Flax', type: 'boolean', sort_order: 7 },
        { id: 8, phase: 'Morning', category: 'Meditation', name: 'Sit 1', type: 'boolean', sort_order: 8 },
        { id: 9, phase: 'Morning', category: 'Meditation', name: 'Walk 1', type: 'boolean', sort_order: 9 },
        { id: 10, phase: 'Morning', category: 'Meditation', name: 'Sit 2', type: 'boolean', sort_order: 10 },
        { id: 11, phase: 'Morning', category: 'Journal', name: 'Declutter Mind', type: 'boolean', sort_order: 11 },
        { id: 12, phase: 'Morning', category: 'Journal', name: 'Plan', type: 'boolean', sort_order: 12 },
        { id: 13, phase: 'Morning', category: 'Journal', name: 'Track', type: 'boolean', sort_order: 13 },
        { id: 14, phase: 'Morning', category: 'Journal', name: 'Open Todoist', type: 'boolean', sort_order: 14 },
        { id: 15, phase: 'Morning', category: 'Dopamine Detox', name: 'Physical Labor', type: 'boolean', sort_order: 15 },
        { id: 16, phase: 'Morning', category: 'Dopamine Detox', name: 'No PMO', type: 'boolean', sort_order: 16 },
        { id: 17, phase: 'Morning', category: 'Kitchen', name: 'Cook', type: 'boolean', sort_order: 17 },
        { id: 18, phase: 'Middle', category: 'Meditation', name: '25/5 Split Sit', type: 'boolean', sort_order: 18 },
        { id: 19, phase: 'Middle', category: 'Dopamine Detox', name: 'PC Work (Pre-Read)', type: 'boolean', sort_order: 19 },
        { id: 20, phase: 'Middle', category: 'Dopamine Detox', name: 'Just Read (Post-PC)', type: 'boolean', sort_order: 20 },
        { id: 21, phase: 'Middle', category: 'Dopamine Detox', name: 'No PMO', type: 'boolean', sort_order: 21 },
        { id: 22, phase: 'Middle', category: 'Dopamine Detox', name: 'Just Eat', type: 'boolean', sort_order: 22 },
        { id: 23, phase: 'Evening', category: 'Journal', name: 'Track', type: 'boolean', sort_order: 23 },
        { id: 24, phase: 'Evening', category: 'Journal', name: 'PTT', type: 'boolean', sort_order: 24 },
        { id: 25, phase: 'Evening', category: 'Meditation', name: 'Sit 3', type: 'boolean', sort_order: 25 },
        { id: 26, phase: 'Evening', category: 'Meditation', name: 'Walk 2', type: 'boolean', sort_order: 26 },
        { id: 27, phase: 'Evening', category: 'Meditation', name: 'Sit 4', type: 'boolean', sort_order: 27 },
        { id: 28, phase: 'Evening', category: 'Dopamine Detox', name: 'Just Read', type: 'boolean', sort_order: 28 },
        { id: 29, phase: 'Evening', category: 'Dopamine Detox', name: 'No PMO', type: 'boolean', sort_order: 29 }
      ],
      logs: [] // stored as array of { habit_id, date, value }
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/grid', (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = req.query.month;
  const dbData = readData();
  
  const habits = dbData.habits.sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));
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

  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const logs = dbData.logs.filter(l => l.date >= startDate && l.date <= endDate);

  res.json({ habits, dates, logs });
});

app.post('/api/habits', (req, res) => {
  const { name, phase, category, type } = req.body;
  const dbData = readData();
  
  const maxOrder = dbData.habits.reduce((max, h) => Math.max(max, h.sort_order || 0), 0);
  const newId = dbData.habits.length > 0 ? Math.max(...dbData.habits.map(h => h.id)) + 1 : 1;
  
  const newHabit = {
    id: newId,
    phase: phase || 'Morning',
    category: category || 'General',
    name,
    type: type || 'boolean',
    sort_order: maxOrder + 1
  };

  dbData.habits.push(newHabit);
  writeData(dbData);

  res.json(newHabit);
});

app.delete('/api/habits/:id', (req, res) => {
  const habitId = parseInt(req.params.id);
  const dbData = readData();

  dbData.habits = dbData.habits.h.filter(h => h.id !== habitId); // Fixed filter syntax below if needed, handled cleanly
  dbData.habits = dbData.habits.filter(h => h.id !== habitId);
  dbData.logs = dbData.logs.filter(l => l.habit_id !== habitId);
  
  writeData(dbData);
  res.json({ success: true });
});

app.post('/api/logs', (req, res) => {
  const { habit_id, date, value } = req.body;
  const dbData = readData();

  // Remove existing log for this habit/date combination
  dbData.logs = dbData.logs.filter(l => !(l.habit_id === habit_id && l.date === date));

  if (value !== '' && value !== null) {
    dbData.logs.push({ habit_id, date, value });
  }

  writeData(dbData);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Omarchy Habits V1 (JSON storage) running on port ${PORT}`);
});