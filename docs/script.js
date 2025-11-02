// Lightweight client-side signup/login demo using localStorage

function qs(sel) { return document.querySelector(sel); }

// Ensure a demo user exists with Shift In Charge role for demo/testing
(() => {
  try {
    const users = JSON.parse(localStorage.getItem('ac_users') || '[]');
    const demo = users.find(u => u.username === 'demo');
    if (!demo) {
      users.push({ username: 'demo', password: 'demo', surname: 'Demo', othername: '', title: 'Shift', phone: '', branch: 'Store', role: 'shift' });
      localStorage.setItem('ac_users', JSON.stringify(users));
    }
    // if no current user, set demo as current so dashboard is accessible
    if (!localStorage.getItem('ac_current')) {
      localStorage.setItem('ac_current', JSON.stringify({ username: 'demo', branch: 'Store', role: 'shift' }));
    }
  } catch (e) { /* ignore */ }
})();

// Signup handler
const signupForm = qs('#signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const surname = qs('#surname').value.trim();
    const othername = qs('#othername').value.trim();
    const title = qs('#title').value.trim();
    const phone = qs('#phone').value.trim();
    const username = qs('#username').value.trim();
    const password = qs('#password').value;
    const confirm = qs('#confirm_password').value;
    const msg = qs('#signupMsg');

    if (password !== confirm) {
      msg.textContent = 'Passwords do not match.';
      msg.classList.add('error');
      return;
    }

    if (!username) {
      msg.textContent = 'Please choose a username.';
      msg.classList.add('error');
      return;
    }

    const users = JSON.parse(localStorage.getItem('ac_users') || '[]');
    if (users.find(u => u.username === username)) {
      msg.textContent = 'Username already taken.';
      msg.classList.add('error');
      return;
    }

    const branch = qs('#branch') ? qs('#branch').value : '';
    const role = qs('#role') ? qs('#role').value : 'staff';

    users.push({ username, password, surname, othername, title, phone, branch, role });
    localStorage.setItem('ac_users', JSON.stringify(users));
    msg.textContent = 'Account created. You can now login.';
    msg.classList.remove('error');
    msg.classList.add('success');
    signupForm.reset();
  });
}

// Login handler
const loginForm = qs('#loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = qs('#login_username').value.trim();
    const password = qs('#login_password').value;
    const msg = qs('#loginMsg');

    const users = JSON.parse(localStorage.getItem('ac_users') || '[]');
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      msg.textContent = 'Login successful. Welcome ' + (user.surname || user.username) + '!';
      msg.classList.remove('error');
      msg.classList.add('success');

      localStorage.setItem('ac_current', JSON.stringify({ username: user.username, branch: user.branch || '', role: user.role || '' }));
      setTimeout(() => { window.location.href = 'inventory.html'; }, 400);
    } else {
      msg.textContent = 'Invalid username or password.';
      msg.classList.add('error');
    }
  });
}

/* ---------- Inventory management (localStorage-based demo) ---------- */
function getStore() { return JSON.parse(localStorage.getItem('ac_store') || '[]'); }
function saveStore(items) { localStorage.setItem('ac_store', JSON.stringify(items)); }

function refreshStoreTable() {
  const table = qs('#storeTable'); if (!table) return;
  const tbody = table.querySelector('tbody'); tbody.innerHTML = '';
  const items = getStore();
  items.forEach(it => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${it.name}</td><td>${it.category}</td><td>${it.units}</td><td>${it.quantity}</td>`;
    tbody.appendChild(tr);
  });
}

function populateSelects() {
  const items = getStore();
  const marina = qs('#marinaSelect'); const bb = qs('#bbSelect'); const stockSel = qs('#stockSelect');
  [marina, bb, stockSel].forEach(s => { if (!s) return; s.innerHTML = '<option value="">-- select item --</option>'; });
  items.forEach(it => {
    const opt = (val) => { const o = document.createElement('option'); o.value = JSON.stringify(it); o.textContent = `${it.name} (${it.units}) — ${it.quantity}`; return o; };
    if (marina) marina.appendChild(opt());
    if (bb) bb.appendChild(opt());
    if (stockSel) stockSel.appendChild(opt());
  });
}

function addStockRecord(data) {
  const cur = getCurrentUser(); if (cur && cur.username) data.createdBy = cur.username;
  const items = getStore();
  const existing = items.find(i => i.name.toLowerCase() === data.name.toLowerCase() && i.units === data.units);
  if (existing) {
    existing.quantity = parseInt(existing.quantity,10) + parseInt(data.qty,10);
  } else {
    items.push({ name: data.name, category: data.category, units: data.units, quantity: parseInt(data.qty,10) });
  }
  saveStore(items); refreshStoreTable();
  const hist = JSON.parse(localStorage.getItem('ac_stock') || '[]');
  hist.unshift(data); localStorage.setItem('ac_stock', JSON.stringify(hist)); refreshStockTable(); populateSelects();
}

function recordOutgoing(branchKey, data) {
  const cur = getCurrentUser(); if (cur && cur.username) data.createdBy = cur.username;
  const items = getStore();
  const it = items.find(i => i.name.toLowerCase() === data.name.toLowerCase() && i.units === data.units);
  if (it && parseInt(it.quantity,10) < parseInt(data.qty,10)) {
    return { ok: false, available: it.quantity };
  }
  const history = JSON.parse(localStorage.getItem(branchKey) || '[]');
  history.unshift(data);
  localStorage.setItem(branchKey, JSON.stringify(history));
  if (it) {
    it.quantity = Math.max(0, parseInt(it.quantity,10) - parseInt(data.qty,10));
    saveStore(items);
  }
  refreshStoreTable(); refreshBranchTables();
  return { ok: true };
}

function showMessage(id, text, isError = true) {
  const el = qs(id); if (!el) return; el.textContent = text; el.classList.toggle('error', isError); el.classList.toggle('success', !isError);
  setTimeout(() => { if (el) el.textContent = ''; }, 4000);
}

function setFormSubmitting(form, isSubmitting) {
  if (!form) return;
  const btn = form.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.disabled = !!isSubmitting;
  btn.textContent = isSubmitting ? 'Processing...' : (form.id === 'stockForm' ? 'Add to Store' : 'Record');
}

function refreshBranchTables() {
  const marina = JSON.parse(localStorage.getItem('ac_marina') || '[]');
  const bb = JSON.parse(localStorage.getItem('ac_bb') || '[]');
  const marinaT = qs('#marinaTable tbody'); const bbT = qs('#bbTable tbody');
  const canManage = canManageRecords();
  if (marinaT) {
    marinaT.innerHTML = '';
    marina.forEach((r, idx) => {
      const tr = document.createElement('tr');
      const actions = canManage ? `<button class="btn small" data-branch="ac_marina" data-idx="${idx}" data-action="edit">Edit</button> <button class="btn outline small" data-branch="ac_marina" data-idx="${idx}" data-action="delete">Delete</button>` : '';
      tr.innerHTML = `<td>${r.date}</td><td>${r.name}</td><td>${r.category}</td><td>${r.units}</td><td>${r.qty}</td><td>${r.createdBy || ''}</td><td>${actions}</td>`;
      marinaT.appendChild(tr);
    });
  }
  if (bbT) {
    bbT.innerHTML = '';
    bb.forEach((r, idx) => {
      const tr = document.createElement('tr');
      const actions = canManage ? `<button class="btn small" data-branch="ac_bb" data-idx="${idx}" data-action="edit">Edit</button> <button class="btn outline small" data-branch="ac_bb" data-idx="${idx}" data-action="delete">Delete</button>` : '';
      tr.innerHTML = `<td>${r.date}</td><td>${r.name}</td><td>${r.category}</td><td>${r.units}</td><td>${r.qty}</td><td>${r.createdBy || ''}</td><td>${actions}</td>`;
      bbT.appendChild(tr);
    });
  }
  document.querySelectorAll('#marinaTable button[data-action], #bbTable button[data-action]').forEach(b => b.addEventListener('click', (ev) => {
    const btn = ev.currentTarget; const action = btn.getAttribute('data-action'); const branchKey = btn.getAttribute('data-branch'); const idx = parseInt(btn.getAttribute('data-idx'),10);
  if (action === 'edit') openEditModal(branchKey, idx);
    if (action === 'delete') deleteOutgoing(branchKey, idx);
  }));
}

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('ac_current') || 'null'); } catch (e) { return null; }
}

function canManageRecords() {
  const cur = getCurrentUser(); if (!cur) return false; const role = (cur.role || '').toLowerCase();
  const allowed = ['boss','shift','shift in charge','manager'];
  return allowed.includes(role);
}

function deleteOutgoing(branchKey, index) {
  if (!canManageRecords()) { alert('You are not authorized to delete records.'); return; }
  const history = JSON.parse(localStorage.getItem(branchKey) || '[]');
  if (!history[index]) return;
  const rec = history[index];
  if (!confirm(`Delete record for ${rec.name} (${rec.qty}) on ${rec.date}? This will return ${rec.qty} to store.`)) return;
  const items = getStore();
  const it = items.find(i => i.name.toLowerCase() === rec.name.toLowerCase() && i.units === rec.units);
  if (it) it.quantity = parseInt(it.quantity,10) + parseInt(rec.qty,10);
  saveStore(items);
  history.splice(index,1);
  localStorage.setItem(branchKey, JSON.stringify(history));
  refreshStoreTable(); refreshBranchTables(); populateSelects();
}

function editOutgoing(branchKey, index) {
  openEditModal(branchKey, index);
}

function openEditModal(branchKey, index) {
  if (!canManageRecords()) { alert('You are not authorized to edit records.'); return; }
  const history = JSON.parse(localStorage.getItem(branchKey) || '[]');
  const rec = history[index]; if (!rec) return;
  const modal = qs('#editModal'); const form = qs('#editForm');
  modal.dataset.branch = branchKey; modal.dataset.index = index;
  qs('#editDate').value = rec.date || '';
  qs('#editName').value = rec.name || '';
  qs('#editQty').value = rec.qty || 0;
  modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false');
}

function closeEditModal() {
  const modal = qs('#editModal'); if (!modal) return;
  modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true');
}

// handle modal actions
document.addEventListener('DOMContentLoaded', () => {
  const editForm = qs('#editForm');
  if (editForm) {
    editForm.addEventListener('submit', (e) => {
      e.preventDefault(); const modal = qs('#editModal'); const branchKey = modal.dataset.branch; const idx = parseInt(modal.dataset.index,10);
      const newQty = parseInt(qs('#editQty').value,10); if (isNaN(newQty) || newQty < 0) { alert('Invalid quantity'); return; }
      const history = JSON.parse(localStorage.getItem(branchKey) || '[]'); const rec = history[idx]; if (!rec) { closeEditModal(); return; }
      const oldQty = parseInt(rec.qty,10);
      const diff = newQty - oldQty; // positive -> increase outgoing
      const items = getStore(); const it = items.find(i => i.name.toLowerCase() === rec.name.toLowerCase() && i.units === rec.units);
      if (diff > 0 && it && parseInt(it.quantity,10) < diff) { alert(`Insufficient stock to increase by ${diff}. Available: ${it.quantity}`); return; }
      if (it) { it.quantity = parseInt(it.quantity,10) - diff; if (it.quantity < 0) it.quantity = 0; saveStore(items); }
      rec.qty = newQty; rec.editedBy = (getCurrentUser() && getCurrentUser().username) || '';
      rec.editedAt = new Date().toISOString();
      history[idx] = rec; localStorage.setItem(branchKey, JSON.stringify(history));
      refreshStoreTable(); refreshBranchTables(); populateSelects(); closeEditModal();
    });
  }
  const cancelBtn = qs('#editCancel'); if (cancelBtn) cancelBtn.addEventListener('click', closeEditModal);
  const deleteBtn = qs('#editDeleteBtn'); if (deleteBtn) deleteBtn.addEventListener('click', () => {
    if (!confirm('Delete this record? This will return the quantity to store.')) return; const modal = qs('#editModal'); const branchKey = modal.dataset.branch; const idx = parseInt(modal.dataset.index,10);
    deleteOutgoing(branchKey, idx);
    closeEditModal();
  });
});

function refreshStockTable() {
  const hist = JSON.parse(localStorage.getItem('ac_stock') || '[]');
  const t = qs('#stockTable tbody'); if (!t) return; t.innerHTML = '';
  const canManage = canManageRecords();
  hist.forEach((r, idx) => {
    const tr = document.createElement('tr');
    const actions = canManage ? `<button class="btn small" data-action="delete-stock" data-idx="${idx}">Delete</button>` : '';
    tr.innerHTML = `<td>${r.date}</td><td>${r.name}</td><td>${r.category}</td><td>${r.units}</td><td>${r.qty}</td><td>${r.createdBy || ''}</td><td>${actions}</td>`;
    t.appendChild(tr);
  });
  document.querySelectorAll('#stockTable button[data-action="delete-stock"]').forEach(b => b.addEventListener('click', (ev) => {
    const idx = parseInt(ev.currentTarget.getAttribute('data-idx'),10);
    deleteStock(idx);
  }));
}

function deleteStock(index) {
  if (!canManageRecords()) { alert('Not authorized'); return; }
  const hist = JSON.parse(localStorage.getItem('ac_stock')||'[]'); if (!hist[index]) return;
  const rec = hist[index];
  if (!confirm(`Delete stock record ${rec.name} (${rec.qty}) on ${rec.date}? This will remove ${rec.qty} from store.`)) return;
  const items = getStore();
  const it = items.find(i => i.name.toLowerCase() === rec.name.toLowerCase() && i.units === rec.units);
  if (it) {
    if (parseInt(it.quantity,10) < parseInt(rec.qty,10)) { alert('Cannot delete: store has less quantity than this record.'); return; }
    it.quantity = Math.max(0, parseInt(it.quantity,10) - parseInt(rec.qty,10));
    saveStore(items);
  }
  hist.splice(index,1); localStorage.setItem('ac_stock', JSON.stringify(hist));
  refreshStockTable(); refreshStoreTable(); populateSelects();
}

// CSV helpers
function arrayToCsv(rows) {
  return rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function exportStoreCsv() {
  const rows = [['name','category','units','quantity']];
  getStore().forEach(i => rows.push([i.name,i.category,i.units,i.quantity]));
  downloadCsv('store.csv', arrayToCsv(rows));
}

function exportHistoryCsv(key, filename) {
  const rows = [['date','name','category','units','qty','createdBy']];
  const hist = JSON.parse(localStorage.getItem(key) || '[]');
  hist.forEach(r => rows.push([r.date||'', r.name||'', r.category||'', r.units||'', r.qty||'', r.createdBy||'']));
  downloadCsv(filename, arrayToCsv(rows));
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines.map(line => {
    const cols = [];
    let cur = ''; let inQ = false;
    for (let i=0;i<line.length;i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
      else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; } else cur += ch;
    }
    cols.push(cur);
    return cols.map(c => c.replace(/^"|"$/g,''));
  });
}

function importCsvFile(file, handler) {
  const reader = new FileReader(); reader.onload = (e) => { try { const rows = parseCsv(String(e.target.result)); handler(rows); } catch (err) { alert('Failed to parse CSV'); } };
  reader.readAsText(file);
}

// Hook inventory page forms
document.addEventListener('DOMContentLoaded', () => {
  const curEl = qs('#currentUser');
  try {
    const cur = JSON.parse(localStorage.getItem('ac_current') || 'null');
  if (cur && cur.username && curEl) curEl.textContent = `User: ${cur.username}` + (cur.branch ? ` — ${cur.branch}` : '');
    else if (curEl) curEl.textContent = '';
  } catch (e) { if (curEl) curEl.textContent = ''; }

  refreshStoreTable(); refreshBranchTables(); populateSelects(); refreshStockTable();

  const stockForm = qs('#stockForm'); if (stockForm) {
    stockForm.addEventListener('submit', (e) => {
      e.preventDefault(); const f = e.target;
      let name = f.name.value.trim(); let category = f.category.value.trim(); let units = f.units.value.trim();
      if (f.itemSelect && f.itemSelect.value) { const it = JSON.parse(f.itemSelect.value); name = it.name; category = it.category; units = it.units; }
      const d = { date: f.date.value, name, category, units, qty: parseInt(f.qty.value,10) };
      addStockRecord(d); f.reset();
    });
  }

  const marinaForm = qs('#marinaForm'); if (marinaForm) {
    marinaForm.addEventListener('submit', (e) => {
      e.preventDefault(); const f = e.target;
      const selVal = (f.itemSelect && f.itemSelect.value) ? f.itemSelect.value : '';
      let name = f.name.value.trim(); let category = f.category.value.trim(); let units = f.units.value.trim();
      const qty = parseInt(f.qty.value,10);
      if (!f.date.value) { showMessage('#marinaMsg','Please choose a date.'); f.querySelector('input[name="date"]').focus(); return; }
      if (!selVal && !name) { showMessage('#marinaMsg','Please select an item or enter a name.'); f.querySelector('input[name="name"]').focus(); return; }
      if (isNaN(qty) || qty < 1) { showMessage('#marinaMsg','Please enter a quantity of 1 or more.'); f.querySelector('input[name="qty"]').focus(); return; }
      if (selVal) { const it = JSON.parse(selVal); name = it.name; category = it.category; units = it.units; }
      const d = { date: f.date.value, name, category, units, qty };
      setFormSubmitting(f, true);
      setTimeout(() => {
        const res = recordOutgoing('ac_marina', d);
        if (!res.ok) {
          showMessage('#marinaMsg', `Insufficient stock — only ${res.available || 0} available`);
        } else {
          showMessage('#marinaMsg', 'Recorded outgoing', false);
          populateSelects();
          f.reset();
        }
        setFormSubmitting(f, false);
      }, 250);
    });
  }

  const bbForm = qs('#bbForm'); if (bbForm) {
    bbForm.addEventListener('submit', (e) => {
      e.preventDefault(); const f = e.target;
      const selVal = (f.itemSelect && f.itemSelect.value) ? f.itemSelect.value : '';
      let name = f.name.value.trim(); let category = f.category.value.trim(); let units = f.units.value.trim();
      const qty = parseInt(f.qty.value,10);
      if (!f.date.value) { showMessage('#bbMsg','Please choose a date.'); f.querySelector('input[name="date"]').focus(); return; }
      if (!selVal && !name) { showMessage('#bbMsg','Please select an item or enter a name.'); f.querySelector('input[name="name"]').focus(); return; }
      if (isNaN(qty) || qty < 1) { showMessage('#bbMsg','Please enter a quantity of 1 or more.'); f.querySelector('input[name="qty"]').focus(); return; }
      if (selVal) { const it = JSON.parse(selVal); name = it.name; category = it.category; units = it.units; }
      const d = { date: f.date.value, name, category, units, qty };
      setFormSubmitting(f, true);
      setTimeout(() => {
        const res = recordOutgoing('ac_bb', d);
        if (!res.ok) {
          showMessage('#bbMsg', `Insufficient stock — only ${res.available || 0} available`);
        } else {
          showMessage('#bbMsg', 'Recorded outgoing', false);
          populateSelects();
          f.reset();
        }
        setFormSubmitting(f, false);
      }, 250);
    });
  }

  const logout = qs('#logoutBtn'); if (logout) logout.addEventListener('click', () => { localStorage.removeItem('ac_current'); window.location.href = 'index.html'; });
  const expStore = qs('#exportStore'); if (expStore) expStore.addEventListener('click', exportStoreCsv);
  const expMar = qs('#exportMarina'); if (expMar) expMar.addEventListener('click', () => exportHistoryCsv('ac_marina','marina.csv'));
  const expBB = qs('#exportBB'); if (expBB) expBB.addEventListener('click', () => exportHistoryCsv('ac_bb','businessbay.csv'));
  const expStock = qs('#exportStock'); if (expStock) expStock.addEventListener('click', () => exportHistoryCsv('ac_stock','stock.csv'));
  const impStore = qs('#importStore'); if (impStore) impStore.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) importCsvFile(f, (rows) => { rows.slice(1).forEach(cols => { const [name,category,units,quantity] = cols; const items = getStore(); const existing = items.find(i=>i.name===name && i.units===units); if (existing) existing.quantity = parseInt(existing.quantity,10) + parseInt(quantity||0,10); else items.push({ name, category, units, quantity: parseInt(quantity||0,10) }); saveStore(items); }); refreshStoreTable(); populateSelects(); e.target.value = ''; }); });
  const impMar = qs('#importMarina'); if (impMar) impMar.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) importCsvFile(f, (rows) => { const hist = JSON.parse(localStorage.getItem('ac_marina')||'[]'); rows.slice(1).forEach(cols => { const [date,name,category,units,qty,createdBy] = cols; hist.unshift({ date, name, category, units, qty: parseInt(qty||0,10), createdBy: createdBy||'' }); }); localStorage.setItem('ac_marina', JSON.stringify(hist)); refreshBranchTables(); populateSelects(); e.target.value = ''; }); });
  const impBB = qs('#importBB'); if (impBB) impBB.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) importCsvFile(f, (rows) => { const hist = JSON.parse(localStorage.getItem('ac_bb')||'[]'); rows.slice(1).forEach(cols => { const [date,name,category,units,qty,createdBy] = cols; hist.unshift({ date, name, category, units, qty: parseInt(qty||0,10), createdBy: createdBy||'' }); }); localStorage.setItem('ac_bb', JSON.stringify(hist)); refreshBranchTables(); populateSelects(); e.target.value = ''; }); });
  const impStock = qs('#importStock'); if (impStock) impStock.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) importCsvFile(f, (rows) => { const hist = JSON.parse(localStorage.getItem('ac_stock')||'[]'); rows.slice(1).forEach(cols => { const [date,name,category,units,qty,createdBy] = cols; hist.unshift({ date, name, category, units, qty: parseInt(qty||0,10), createdBy: createdBy||'' }); }); localStorage.setItem('ac_stock', JSON.stringify(hist)); refreshStockTable(); populateSelects(); e.target.value = ''; }); });
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(b => b.addEventListener('click', () => {
    const target = b.getAttribute('data-target');
    document.querySelectorAll('.dashboard .panel, .dashboard section').forEach(s => s.classList.add('section-hidden'));
    const el = document.getElementById(target);
    if (el) el.classList.remove('section-hidden');
    const fi = el.querySelector('input'); if (fi) fi.focus();
  }));
});
