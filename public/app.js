let gridData = { habits: [], dates: [], logs: [] };

function initSelectors() {
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    yearSelect.innerHTML = '';
    for (let y = currentYear - 2; y <= currentYear + 3; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    monthSelect.value = currentMonth.toString();
    monthSelect.onchange = loadGrid;
    yearSelect.onchange = loadGrid;

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    updateConnectionStatus();
}

function updateConnectionStatus() {
    const badge = document.getElementById('connection-badge');
    if (navigator.onLine) {
        badge.textContent = 'Online & Synced';
        badge.className = 'sync-status sync-online';
        syncPendingChanges();
    } else {
        badge.textContent = 'Offline Mode';
        badge.className = 'sync-status sync-offline';
    }
}

async function loadGrid() {
    const year = document.getElementById('year-select').value;
    const month = document.getElementById('month-select').value;
    
    if (navigator.onLine) {
        try {
            const res = await fetch(`/api/grid?year=${year}&month=${month}`);
            gridData = await res.json();
            // Cache locally for offline viewing
            localStorage.setItem('cached_grid_' + year + '_' + month, JSON.stringify(gridData));
        } catch (e) {
            loadFromLocalCache(year, month);
        }
    } else {
        loadFromLocalCache(year, month);
    }
    renderTable();
}

function loadFromLocalCache(year, month) {
    const cached = localStorage.getItem('cached_grid_' + year + '_' + month);
    if (cached) {
        gridData = JSON.parse(cached);
    }
}

function getCategoryClass(catName) {
    return 'cat-' + catName.replace(/\s+/g, '-');
}

// Helper to format "YYYY-MM-DD" into "Jun 1 (Mon)"
function formatDateNice(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  const monthStr = dateObj.toLocaleString('en-US', { month: 'short' });
  const dayNum = dateObj.getDate();
  const weekdayStr = dateObj.toLocaleString('en-US', { weekday: 'short' });

  return `${monthStr} ${dayNum} (${weekdayStr})`;
}

function renderTable() {
    const table = document.getElementById('grid-table');
    table.innerHTML = '';

    const { habits, dates, logs } = gridData;
    if (!habits || !dates) return;

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    ['Phase', 'Category', 'Habit'].forEach((label) => {
        const th = document.createElement('th');
        th.className = `sticky-header col-${label.toLowerCase()}`;
        th.textContent = label;
        headerRow.appendChild(th);
    });

    dates.forEach(dStr => {
        const th = document.createElement('th');
        th.className = 'date-header';
        // Updated to use your preferred format: "Jun 1 (Mon)"
        th.textContent = formatDateNice(dStr);
        headerRow.appendChild(th);
    });

    const sumTh = document.createElement('th');
    sumTh.className = 'summary-header';
    sumTh.textContent = 'Summary';
    headerRow.appendChild(sumTh);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    let currentPhase = null;
    let currentCategory = null;

    habits.forEach((h, hIdx) => {
        const tr = document.createElement('tr');
        const catClass = getCategoryClass(h.category);

        if (h.phase !== currentPhase) {
            currentPhase = h.phase;
            const phaseCount = habits.filter(x => x.phase === currentPhase).length;
            const tdPhase = document.createElement('td');
            tdPhase.className = `sticky-header col-phase phase-${h.phase}`;
            tdPhase.rowSpan = phaseCount;
            tdPhase.textContent = h.phase;
            tr.appendChild(tdPhase);
        }

        if (h.category !== currentCategory || habits[hIdx - 1]?.phase !== h.phase) {
            currentCategory = h.category;
            const catCount = habits.filter(x => x.phase === h.phase && x.category === currentCategory).length;
            const tdCat = document.createElement('td');
            tdCat.className = `sticky-header col-category ${catClass}`;
            tdCat.rowSpan = catCount;
            tdCat.textContent = h.category;
            tr.appendChild(tdCat);
        }

        const tdHabit = document.createElement('td');
        tdHabit.className = `sticky-header col-habit ${catClass}`;
        tdHabit.textContent = h.name;
        tr.appendChild(tdHabit);

        const habitLogs = [];

        dates.forEach(dStr => {
            const td = document.createElement('td');
            const log = logs.find(l => l.habit_id === h.id && l.date === dStr);
            const val = log ? log.value : '';
            if (val) habitLogs.push(val);

            if (h.type === 'boolean') {
                td.className = `cell-boolean ${val === '✓' ? 'state-yes' : (val === '✗' ? 'state-no' : (val === '-' ? 'state-skip' : ''))}`;
                td.textContent = val;

                td.onclick = () => {
                    let next = '✓';
                    if (val === '✓') next = '✗';
                    else if (val === '✗') next = '-';
                    else if (val === '-') next = '';
                    saveLog(h.id, dStr, next);
                };
            } else {
                const input = document.createElement('input');
                input.className = 'cell-input';
                input.value = val;
                input.onblur = (e) => saveLog(h.id, dStr, e.target.value);
                input.onkeydown = (e) => { if (e.key === 'Enter') input.blur(); };
                td.appendChild(input);
            }
            tr.appendChild(td);
        });

        const tdSummary = document.createElement('td');
        tdSummary.className = 'summary-cell';
        tdSummary.textContent = computeSummary(h.type, habitLogs);
        tr.appendChild(tdSummary);

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
}

function computeSummary(type, values) {
    if (!values || values.length === 0) return '-';
    if (type === 'boolean') {
        const count = values.filter(v => v === '✓').length;
        return `${count} ✓`;
    }
    return values.length;
}

async function saveLog(habit_id, date, value) {
    // 1. Update local UI & data state immediately
    let existing = gridData.logs.find(l => l.habit_id === habit_id && l.date === date);
    if (existing) {
        existing.value = value;
    } else {
        gridData.logs.push({ habit_id, date, value });
    }
    
    const year = document.getElementById('year-select').value;
    const month = document.getElementById('month-select').value;
    localStorage.setItem('cached_grid_' + year + '_' + month, JSON.stringify(gridData));
    renderTable();

    // 2. Try sending to server, otherwise queue it up
    const payload = { habit_id, date, value };
    if (navigator.onLine) {
        try {
            await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            queueOfflineChange(payload);
        }
    } else {
        queueOfflineChange(payload);
    }
}

function queueOfflineChange(payload) {
    let queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    queue.push(payload);
    localStorage.setItem('sync_queue', JSON.stringify(queue));
}

async function syncPendingChanges() {
    let queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    if (queue.length === 0) return;

    const remainingQueue = [];
    for (let item of queue) {
        try {
            await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
        } catch (e) {
            remainingQueue.push(item);
        }
    }
    localStorage.setItem('sync_queue', JSON.stringify(remainingQueue));
}

// Habit creation handlers
document.getElementById('save-habit-btn').onclick = async () => {
    const name = document.getElementById('habit-name').value;
    const phase = document.getElementById('habit-phase').value;
    const category = document.getElementById('habit-category').value;
    const type = document.getElementById('habit-type').value;

    if (!name) return;

    await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phase, category, type })
    });

    document.getElementById('habit-name').value = '';
    document.getElementById('habit-category').value = '';
    document.getElementById('add-modal').classList.add('hidden');
    loadGrid();
};

document.getElementById('add-modal-btn').onclick = () => document.getElementById('add-modal').classList.toggle('hidden');
document.getElementById('cancel-habit-btn').onclick = () => document.getElementById('add-modal').classList.add('hidden');

initSelectors();
loadGrid();