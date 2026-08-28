let gridData = { habits: [], dates: [], logs: [] };
let mobileSelectedDateIndex = null;

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
            localStorage.setItem('cached_grid_' + year + '_' + month, JSON.stringify(gridData));
        } catch (e) {
            loadFromLocalCache(year, month);
        }
    } else {
        loadFromLocalCache(year, month);
    }
    
    if (gridData.dates && gridData.dates.length > 0 && mobileSelectedDateIndex === null) {
        const todayStr = new Date().toISOString().split('T')[0];
        const idx = gridData.dates.indexOf(todayStr);
        mobileSelectedDateIndex = idx !== -1 ? idx : gridData.dates.length - 1;
    }

    renderTable();
    renderMobileView();
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

function formatDateNice(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  const monthStr = dateObj.toLocaleString('en-US', { month: 'short' });
  const dayNum = dateObj.getDate();
  const weekdayStr = dateObj.toLocaleString('en-US', { weekday: 'short' });

  return `${monthStr} ${dayNum} (${weekdayStr})`;
}

function renderMobileView() {
    const container = document.getElementById('mobile-habits-list');
    const titleEl = document.getElementById('mobile-date-title');
    if (!container || !titleEl) return;

    container.innerHTML = '';
    const { habits, dates, logs } = gridData;
    if (!habits || !dates || dates.length === 0) return;

    if (mobileSelectedDateIndex >= dates.length) mobileSelectedDateIndex = dates.length - 1;
    if (mobileSelectedDateIndex < 0) mobileSelectedDateIndex = 0;

    const currentDStr = dates[mobileSelectedDateIndex];
    titleEl.textContent = formatDateNice(currentDStr);

    // Emojis mapping closely to image_b6d2e4.png style
    const phaseConfig = [
        { name: 'Sleep', emoji: '💤' },
        { name: 'Morning', emoji: '🌅' },
        { name: 'Middle', emoji: '☀️' },
        { name: 'Evening', emoji: '🌙' }
    ];
    
    phaseConfig.forEach(phase => {
        const phaseHabits = habits.filter(h => h.phase === phase.name);
        if (phaseHabits.length === 0) return;

        // 1. The Large Phase Card
        const phaseCard = document.createElement('div');
        phaseCard.className = 'mobile-phase-card';

        const phaseHeader = document.createElement('div');
        phaseHeader.className = 'mobile-phase-header';
        phaseHeader.textContent = `${phase.emoji} ${phase.name}`;
        phaseCard.appendChild(phaseHeader);

        const categories = [...new Set(phaseHabits.map(h => h.category))];

        categories.forEach(catName => {
            const catHabits = phaseHabits.filter(h => h.category === catName);

            // 2. The Category Wrapper inside the Phase Card
            const catSection = document.createElement('div');
            catSection.className = 'mobile-category-section';

            const catTitle = document.createElement('div');
            catTitle.className = 'mobile-category-title';
            catTitle.textContent = catName;
            catSection.appendChild(catTitle);

            // 3. The wrapping flex container for compact habits
            const habitsWrap = document.createElement('div');
            habitsWrap.className = 'mobile-habits-wrap';

            catHabits.forEach(h => {
                const isBoolean = h.type === 'boolean';
                
                const habitItem = document.createElement('div');
                habitItem.className = `mobile-habit-item ${isBoolean ? 'boolean-type' : 'input-type'}`;

                const nameEl = document.createElement('span');
                nameEl.className = 'mobile-habit-name';
                nameEl.textContent = h.name;
                habitItem.appendChild(nameEl);

                const log = logs.find(l => l.habit_id === h.id && l.date === currentDStr);
                const val = log ? log.value : '';

                if (isBoolean) {
                    const btn = document.createElement('button');
                    btn.className = `mobile-habit-control ${val === '✓' ? 'state-yes' : (val === '✗' ? 'state-no' : (val === '-' ? 'state-skip' : ''))}`;
                    btn.textContent = val || '+';

                    btn.onclick = () => {
                        let next = '✓';
                        if (val === '✓') next = '✗';
                        else if (val === '✗') next = '-';
                        else if (val === '-') next = '';
                        saveLog(h.id, currentDStr, next);
                        renderMobileView();
                    };
                    habitItem.appendChild(btn);
                } else {
                    const input = document.createElement('input');
                    input.className = 'cell-input mobile-habit-control';
                    input.value = val;
                    input.onblur = (e) => saveLog(h.id, currentDStr, e.target.value);
                    input.onkeydown = (e) => { if (e.key === 'Enter') input.blur(); };
                    habitItem.appendChild(input);
                }

                habitsWrap.appendChild(habitItem);
            });

            catSection.appendChild(habitsWrap);
            phaseCard.appendChild(catSection);
        });

        container.appendChild(phaseCard);
    });
}

document.getElementById('mobile-prev-day').onclick = () => {
    if (mobileSelectedDateIndex > 0) {
        mobileSelectedDateIndex--;
        renderMobileView();
    }
};

document.getElementById('mobile-next-day').onclick = () => {
    if (gridData.dates && mobileSelectedDateIndex < gridData.dates.length - 1) {
        mobileSelectedDateIndex++;
        renderMobileView();
    }
};

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
    renderMobileView();

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