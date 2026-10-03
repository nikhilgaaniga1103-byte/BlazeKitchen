/* ============================================================
   BLAZE KITCHEN — admin.js  (Admin Panel Logic)
   ============================================================ */
'use strict';

const API = 'http://localhost:5000/api';

/* ── State ── */
let adminState = {
  token: localStorage.getItem('blaze_admin_token') || '',
  user: null,
  section: 'dashboard',
  timeFormat: localStorage.getItem('blaze_admin_tf') || '12',
  notifications: [],
  charts: {},
  pollTimer: null,
  autoSchedule: true,
  usersCache: [],
  menuCache: [],
  moodCategoriesCache: [],
  moodItemsCache: [],
  moodMenuSourceCache: [],
  ordersCache: [],
  reviewsCache: [],
  orderFilter: 'all',
  sseSource: null,   // EventSource for real-time push
};

/* ═══════════ INIT ═══════════ */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  if (adminState.token) {
    verifyToken();
  } else {
    showLogin();
  }
  setupListeners();
});

/* ═══════════ AUTH ═══════════ */
function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminShell').style.display  = 'none';
}

function showShell() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminShell').style.display  = 'flex';
  updateAccountUI();
  loadDashboard();
  startClock();
  startPolling();
  connectSSE();           // ⚡ real-time order events
  restoreTimeFormat();
  if (adminState.autoSchedule) startScheduleWatcher();
  initKitchenStatus();
}

/* ═══════════ KITCHEN STATUS CONTROL ═══════════ */
const KS_KEY = 'blaze_kitchen_override'; // 'auto' | 'open' | 'closed'

function getKitchenMode() {
  return localStorage.getItem(KS_KEY) || 'auto';
}

function isKitchenOpenByTime() {
  const h = new Date().getHours();
  return h >= 8 && h < 23;
}

function resolveKitchenOpen() {
  const mode = getKitchenMode();
  if (mode === 'open')   return true;
  if (mode === 'closed') return false;
  return isKitchenOpenByTime();
}

function setKitchenMode(mode) { // 'auto' | 'open' | 'closed'
  localStorage.setItem(KS_KEY, mode);
  renderKitchenStatus();
  const modeLabels = { auto: 'Auto (time-based)', open: 'Force Open', closed: 'Force Closed' };
  showToast(`Kitchen set to: ${modeLabels[mode]}`, mode === 'closed' ? 'error' : mode === 'open' ? 'success' : 'info');
}

function toggleKitchen() {
  const isOpen = resolveKitchenOpen();
  setKitchenMode(isOpen ? 'closed' : 'open');
}

function renderKitchenStatus() {
  const mode   = getKitchenMode();
  const isOpen = resolveKitchenOpen();

  const card       = document.getElementById('ksCard');
  const toggle     = document.getElementById('ksToggle');
  const statusTxt  = document.getElementById('ksStatusText');
  const modeTxt    = document.getElementById('ksModeText');
  const lbl        = document.getElementById('ksToggleLabel');
  const thumbIcon  = document.getElementById('ksThumbIcon');
  const pill       = document.getElementById('topbarKsPill');
  const pillTxt    = document.getElementById('topbarKsTxt');

  // Mode buttons highlight
  document.getElementById('ksModeAuto')?.classList.toggle('ks-btn-active-auto',   mode === 'auto');
  document.getElementById('ksModeOpen')?.classList.toggle('ks-btn-active-open',   mode === 'open');
  document.getElementById('ksModeClosed')?.classList.toggle('ks-btn-active-closed', mode === 'closed');

  const modeLabels = { auto: 'Auto (time-based)', open: 'Force Open — overriding hours', closed: 'Force Closed — overriding hours' };
  if (modeTxt) modeTxt.textContent = modeLabels[mode] || '';

  if (isOpen) {
    card?.classList.remove('ks-closed');
    toggle?.classList.remove('ks-off');
    if (statusTxt) statusTxt.textContent = 'Open for Orders';
    if (lbl)       lbl.textContent = 'OPEN';
    if (thumbIcon) { thumbIcon.className = 'fas fa-fire'; thumbIcon.style.color = 'var(--orange)'; }
    pill?.classList.remove('pill-closed');
    if (pillTxt) pillTxt.textContent = 'OPEN';
  } else {
    card?.classList.add('ks-closed');
    toggle?.classList.add('ks-off');
    if (statusTxt) statusTxt.textContent = 'Closed — Not Taking Orders';
    if (lbl)       lbl.textContent = 'CLOSED';
    if (thumbIcon) { thumbIcon.className = 'fas fa-moon'; thumbIcon.style.color = 'var(--danger)'; }
    pill?.classList.add('pill-closed');
    if (pillTxt) pillTxt.textContent = 'CLOSED';
  }
}

function initKitchenStatus() {
  renderKitchenStatus();
  // Re-render every minute to catch auto time changes
  setInterval(renderKitchenStatus, 60000);
}

function showToast(msg, type = 'info') {
  // Use existing toast if available, else console
  const tc = document.getElementById('toastContainer');
  if (!tc) { console.log(msg); return; }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  const text = document.createElement('span');
  text.textContent = String(msg || '');
  t.appendChild(text);
  t.style.cssText = 'padding:12px 18px;border-radius:10px;margin-bottom:8px;font-size:.85rem;font-weight:600;animation:fadeInUp .3s ease;';
  const colors = { success:'#22c55e', error:'#ef4444', info:'#3b82f6', warn:'#f59e0b' };
  t.style.background = colors[type] || colors.info;
  t.style.color = '#fff';
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
/* ═════════════════════════════════════════════ */

async function verifyToken() {
  try {
    const res = await apiFetch('/auth/me');
    if (res.success && res.data.user.role === 'admin') {
      adminState.user = res.data.user;
      showShell();
    } else {
      logout();
    }
  } catch { logout(); }
}

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    }).then(r => r.json());

    if (!res.success) { errEl.textContent = res.message || 'Login failed'; return; }
    if (res.data.user.role !== 'admin') { errEl.textContent = 'Access denied. Admin only.'; return; }

    adminState.token = res.token;
    adminState.user  = res.data.user;
    localStorage.setItem('blaze_admin_token', res.token);
    showShell();
  } catch (err) {
    errEl.textContent = 'Server unreachable. Make sure backend is running.';
  }
});

function logout() {
  adminState.token = '';
  adminState.user  = null;
  localStorage.removeItem('blaze_admin_token');
  if (adminState.pollTimer) clearInterval(adminState.pollTimer);
  disconnectSSE();
  stopPendingAlert();
  if (window._scheduleWatcherTimer) { clearInterval(window._scheduleWatcherTimer); window._scheduleWatcherTimer = null; window._lastSlotLabel = null; }
  showLogin();
}

function updateAccountUI() {
  if (!adminState.user) return;
  const name = adminState.user.name || 'Admin';
  document.getElementById('sbName').textContent = name;
  document.getElementById('sbAvatar').textContent = name.charAt(0).toUpperCase();
}

/* ═══════════ API HELPER ═══════════ */
async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (adminState.token) headers['Authorization'] = `Bearer ${adminState.token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers: { ...headers, ...opts.headers } });
  if (res.status === 401) {
    // Parse the body to determine if this is a genuine token/session failure.
    // Only call logout() for auth-level 401s (expired token, no token, invalid token).
    // Application-level 401s (e.g. wrong current password) must NOT trigger logout.
    let body = {};
    try { body = await res.clone().json(); } catch { /* ignore parse error */ }
    const msg = (body.message || '').toLowerCase();
    const isTokenFailure = msg.includes('token') || msg.includes('session') || msg.includes('no longer exists') || msg.includes('access denied');
    if (isTokenFailure) { logout(); }
    throw new Error(body.message || 'Unauthorized');
  }
  return res.json();
}

/* ═══════════ NAVIGATION ═══════════ */
function setupListeners() {
  // Sidebar links
  document.querySelectorAll('.sb-link').forEach(link => {
    link.addEventListener('click', () => {
      const sec = link.dataset.section;
      switchSection(sec);
    });
  });

  // Sidebar toggle (mobile)
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Notifications
  document.getElementById('notifBtn')?.addEventListener('click', () => {
    document.getElementById('notifPanel').classList.toggle('open');
  });
  document.getElementById('clearNotifs')?.addEventListener('click', clearNotifications);

  // Theme button
  document.getElementById('themeBtn')?.addEventListener('click', toggleTheme);
  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  // Settings — theme options
  document.querySelectorAll('[data-theme-opt]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-theme-opt]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setTheme(btn.dataset.themeOpt);
    });
  });

  // Settings — time format
  document.querySelectorAll('[data-time-opt]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-time-opt]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      adminState.timeFormat = btn.dataset.timeOpt;
      localStorage.setItem('blaze_admin_tf', adminState.timeFormat);
      updateTimePreview();
    });
  });

  // Captcha
  document.getElementById('captchaCheck')?.addEventListener('change', (e) => {
    if (e.target.checked) showCaptchaChallenge();
  });
  document.getElementById('captchaSubmit')?.addEventListener('click', verifyCaptcha);

  // Change password form
  document.getElementById('changePassForm')?.addEventListener('submit', changePassword);

  // Site settings form
  document.getElementById('siteSettingsForm')?.addEventListener('submit', saveSiteSettings);

  // Global search
  document.getElementById('globalSearch')?.addEventListener('input', globalSearch);

  // Section searches
  document.getElementById('userSearch')?.addEventListener('input', filterUsers);
  document.getElementById('menuSearch')?.addEventListener('input', filterMenu);
  document.getElementById('moodSearch')?.addEventListener('input', filterMoodItems);
  document.getElementById('orderSearch')?.addEventListener('input', filterOrders);
  document.getElementById('reviewSearch')?.addEventListener('input', filterReviews);
}

function switchSection(name) {
  adminState.section = name;
  document.querySelectorAll('.sb-link').forEach(l => l.classList.toggle('active', l.dataset.section === name));
  document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === `sec-${name}`));
  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');

  // Load data for section
  switch (name) {
    case 'dashboard':  loadDashboard(); break;
    case 'users':      loadUsers(); break;
    case 'menu':       loadMenu(); break;
    case 'menu-items': loadMenuItems(); break;
    case 'mood':       loadMoodManagement(); break;
    case 'orders':     loadOrders(); break;
    case 'activities': loadActivities(); break;
    case 'analytics':  loadAnalytics(); break;
    case 'sales-summary': renderSalesSummary(); break;
    case 'feedback':   loadFeedbacks(); break;
    case 'reviews':    loadReviews(); break;
    case 'settings':   updateTimePreview(); loadLoginLogs(); loadSiteSettings(); loadAdminList(); break;
  }
}

function renderSalesSummary() {
  const businessDate = document.getElementById('salesBusinessDate');
  const generatedAt = document.getElementById('salesGeneratedAt');
  const dateInput = document.getElementById('salesDateInput');
  if (!businessDate || !generatedAt) return;

  const now = new Date();
  const selected = dateInput?.value ? new Date(dateInput.value + 'T00:00:00') : now;
  if (dateInput && !dateInput.value) {
    dateInput.value = now.toISOString().slice(0, 10);
  }
  businessDate.textContent = now.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  generatedAt.textContent = now.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  businessDate.textContent = selected.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  if (dateInput && !dateInput.dataset.bound) {
    dateInput.addEventListener('change', () => renderSalesSummary());
    dateInput.dataset.bound = 'true';
  }

  loadSalesSummary(dateInput?.value || now.toISOString().slice(0, 10));
}

function fmtCurrency(value) {
  const n = Number(value) || 0;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function loadSalesSummary(dateStr) {
  try {
    const res = await apiFetch(`/admin/sales-summary?date=${encodeURIComponent(dateStr)}`);
    if (!res.success) return;
    const d = res.data || {};
    const so = d.salesOverview || {};
    const ps = d.paymentSummary || {};
    const sm = d.salesMetrics || {};
    const ts = d.taxSummary || {};
    const cs = d.chargeSummary || {};
    const gt = d.grandTotals || {};

    setText('srGrossSales', fmtCurrency(so.grossSales));
    setText('srSalesReturn', fmtCurrency(so.salesReturn));
    setText('srDiscounts', fmtCurrency(so.discounts));
    setText('srDirectCharges', fmtCurrency(so.directCharges));
    setText('srNetSales', fmtCurrency(so.netSales));
    setText('srSalesWithTax', fmtCurrency(so.salesWithTax));
    setText('srSalesWithoutTax', fmtCurrency(so.salesWithoutTax));
    setText('srOtherCharges', fmtCurrency(so.otherCharges));
    setText('srTaxes', fmtCurrency(so.taxes));
    setText('srRounding', fmtCurrency(so.rounding));
    setText('srTotalRevenue', fmtCurrency(so.totalRevenue));
    setText('srPayments', fmtCurrency(so.payments));
    setText('srBalanceDue', fmtCurrency(so.balanceDue));

    setText('srPayCash', fmtCurrency(ps.cash));
    setText('srPayPhonePe', fmtCurrency(ps.phonepe));
    setText('srPayCard', fmtCurrency(ps.card));
    setText('srPayWallet', fmtCurrency(ps.wallet));
    setText('srPayTotal', fmtCurrency(ps.total));

    setText('srOrderCount', sm.numberOfOrders || 0);
    setText('srAvgOrderValue', fmtCurrency(sm.averageOrderValue));
    setText('srCustomerCount', sm.numberOfCustomers || 0);
    setText('srAvgSalePerCustomer', fmtCurrency(sm.averageSalePerCustomer));
    setText('srOpenOrders', sm.openOrders || 0);
    setText('srOpenTotal', fmtCurrency(sm.openOrderTotal));
    setText('srOpenPaid', fmtCurrency(sm.openOrderPaid));
    setText('srOpenBalance', fmtCurrency(sm.openOrderBalance));

    setText('srTaxSalesWith', fmtCurrency(ts.salesWithTax));
    setText('srTaxSalesWithout', fmtCurrency(ts.salesWithoutTax));
    setText('srCgst', fmtCurrency(ts.cgst));
    setText('srSgst', fmtCurrency(ts.sgst));
    setText('srTaxTotal', fmtCurrency(ts.taxTotal));

    setText('srPackagingCharges', fmtCurrency(cs.packagingCharges));
    setText('srDeliveryCharges', fmtCurrency(cs.deliveryCharges));
    setText('srConvenienceCharges', fmtCurrency(cs.convenienceCharges));
    setText('srServiceCharges', fmtCurrency(cs.serviceCharges));
    setText('srChargeTotal', fmtCurrency(cs.chargeTotal));

    setText('srTotalOrders', gt.totalOrders || 0);
    setText('srTotalItems', gt.totalItemsSold || 0);
    setText('srGrandRevenue', fmtCurrency(gt.totalRevenue));
    setText('srGrandTax', fmtCurrency(gt.totalTaxCollected));
    setText('srGrandCharges', fmtCurrency(gt.totalChargesCollected));
    setText('srNetCollection', fmtCurrency(gt.netCollection));

    const itemsBody = document.getElementById('salesItemsBody');
    if (itemsBody) {
      const items = d.productSummary?.items || [];
      itemsBody.innerHTML = items.length
        ? items.map(item => `
          <tr>
            <td>${escapeHtml(item.name || '')}</td>
            <td>${item.quantity || 0}</td>
            <td>${fmtCurrency(item.rate)}</td>
            <td>${fmtCurrency(item.amount)}</td>
          </tr>
        `).join('')
        : `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px">No sales for this date.</td></tr>`;
    }

    setText('srItemsTotalQty', d.productSummary?.totalItemsSold || 0);
    setText('srItemsTotalAmount', fmtCurrency(d.productSummary?.totalAmount));
  } catch (err) {
    console.error('Sales summary load failed', err);
  }
}

/* ═══════════ ADMIN LOGIN LOGS ═══════════ */
async function loadLoginLogs() {
  const tbody = document.getElementById('loginLogsBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:20px">
    <i class="fas fa-spinner fa-spin"></i> Loading…</td></tr>`;
  try {
    const data = await apiFetch('/admin/login-logs?limit=50');
    const logs = data.data || [];
    if (!logs.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:20px">No login records found.</td></tr>`;
      return;
    }
    tbody.innerHTML = logs.map((log, idx) => {
      const statusBadge = log.status === 'success'
        ? `<span style="color:var(--success);font-weight:600"><i class="fas fa-check-circle"></i> Success</span>`
        : `<span style="color:var(--danger);font-weight:600" title="${log.failReason||''}"><i class="fas fa-times-circle"></i> Failed</span>`;
      const ua = (log.userAgent || '').substring(0, 50);
      const dt = log.loggedAt ? new Date(log.loggedAt).toLocaleString('en-IN', {
        day:'numeric', month:'short', year:'numeric',
        hour:'2-digit', minute:'2-digit', second:'2-digit'
      }) : '—';
      return `<tr>
        <td>${idx + 1}</td>
        <td>${log.name || '—'}</td>
        <td>${log.email}</td>
        <td><code style="font-size:.78rem">${log.ip || '—'}</code></td>
        <td style="font-size:.75rem;color:var(--text-dim);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${log.userAgent||''}">${ua || '—'}</td>
        <td>${statusBadge}</td>
        <td style="font-size:.8rem">${dt}</td>
      </tr>`;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger);padding:20px">Failed to load login history.</td></tr>`;
  }
}
window.loadLoginLogs = loadLoginLogs;

/* ═══════════ CLOCK ═══════════ */
function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const el = document.getElementById('topbarClock');
  if (!el) return;
  el.textContent = formatTime(new Date());
}

function updateTimePreview() {
  const el = document.getElementById('timePreview');
  if (el) el.textContent = 'Preview: ' + formatTime(new Date());
}

function formatTime(date) {
  const tf = adminState.timeFormat;
  if (tf === 'utc') return date.toUTCString().replace('GMT', 'UTC');
  if (tf === '24') return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '  ' + date.toLocaleDateString('en-GB');
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) + '  ' + date.toLocaleDateString('en-GB');
}

function restoreTimeFormat() {
  const tf = adminState.timeFormat;
  document.querySelectorAll('[data-time-opt]').forEach(b => {
    b.classList.toggle('active', b.dataset.timeOpt === tf);
  });
  updateTimePreview();
}

/* ═══════════ THEME ═══════════ */
function applyTheme() {
  const theme = localStorage.getItem('blaze_admin_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  setTheme(cur === 'dark' ? 'light' : 'dark');
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('blaze_admin_theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  // Update settings buttons
  document.querySelectorAll('[data-theme-opt]').forEach(b => {
    b.classList.toggle('active', b.dataset.themeOpt === theme);
  });
  // Redraw charts with new colors
  reRenderAllCharts();
}

/* ═══════════ DASHBOARD ═══════════ */
async function loadDashboard() {
  try {
    const res = await apiFetch('/admin/dashboard');
    if (!res.success) return;
    const d = res.data;

    setText('statRevenue', `₹${d.totalRevenue.toLocaleString()}`);
    setText('statOrders', d.totalOrders);
    setText('statUsers', d.totalUsers);
    setText('statActive', d.activeOrders);

    renderDashCharts(d);
    renderRecentOrders(d.recentOrders);
  } catch (e) { console.error('Dashboard load error', e); }
}

function renderDashCharts(d) {
  const labels = d.dailyOrders.map(x => x._id.slice(5));
  const orderData = d.dailyOrders.map(x => x.count);
  const revData   = d.dailyOrders.map(x => x.revenue);
  const userLabels = d.dailyUsers.map(x => x._id.slice(5));
  const userData   = d.dailyUsers.map(x => x.count);

  makeChart('chartDailyOrders', 'bar', labels, [{ label: 'Orders', data: orderData, backgroundColor: '#FF5E00' }]);
  makeChart('chartDailyRevenue', 'line', labels, [{ label: 'Revenue ₹', data: revData, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.15)', fill: true, tension: .4 }]);
  makeChart('chartDailyUsers', 'bar', userLabels, [{ label: 'Users', data: userData, backgroundColor: '#3b82f6' }]);

  // Status pie
  const statuses = d.ordersByStatus;
  const pieLabels = Object.keys(statuses).map(s => s.replace(/_/g, ' '));
  const pieData   = Object.values(statuses);
  const pieColors = ['#3b82f6','#22c55e','#f59e0b','#a855f7','#22c55e','#ef4444'];
  makeChart('chartStatusPie', 'doughnut', pieLabels, [{ data: pieData, backgroundColor: pieColors.slice(0, pieData.length) }], { cutout: '55%' });
}

function renderRecentOrders(orders) {
  const body = document.getElementById('recentOrdersBody');
  if (!body) return;
  body.innerHTML = orders.map(o => `
    <tr>
      <td><strong>${o.orderId}</strong></td>
      <td>${o.user?.name || 'Unknown'}</td>
      <td>
        ${o.items.map(i => i.name).join(', ')}
        ${o.cookingInstructions ? `<div style="margin-top:4px;font-size:.72rem;color:#f59e0b"><strong>Cooking Note:</strong> ${escapeHtml(o.cookingInstructions)}</div>` : ''}
      </td>
      <td>₹${o.total}</td>
      <td><span class="status-badge sb-${o.status}">${o.status.replace(/_/g,' ')}</span></td>
      <td>${formatTimeShort(o.createdAt)}</td>
    </tr>`).join('');
}

/* ═══════════ USERS ═══════════ */
async function loadUsers() {
  try {
    const res = await apiFetch('/admin/users');
    if (!res.success) return;
    adminState.usersCache = res.data;
    renderUsersTable(res.data);
    renderUsersCharts(res.data);
  } catch (e) { console.error('Users load error', e); }
}

function renderUsersTable(users) {
  const body = document.getElementById('usersBody');
  if (!body) return;
  body.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.name}</strong></td>
      <td>${u.email}</td>
      <td><span class="status-badge sb-${u.role}">${u.role}</span></td>
      <td>${u.orderCount || 0}</td>
      <td>₹${(u.totalSpent || 0).toLocaleString()}</td>
      <td>${formatTimeShort(u.createdAt)}</td>
      <td>
        <button class="btn-toggle-avail" onclick="toggleUserRole('${u._id}','${u.role}')">
          ${u.role === 'admin' ? 'Make User' : 'Make Admin'}
        </button>
      </td>
    </tr>`).join('');
}

function renderUsersCharts(users) {
  // Growth chart — group users by day
  const dayMap = {};
  users.forEach(u => {
    const day = new Date(u.createdAt).toISOString().slice(0, 10);
    dayMap[day] = (dayMap[day] || 0) + 1;
  });
  const days = Object.keys(dayMap).sort().slice(-30);
  const dayCounts = days.map(d => dayMap[d]);

  makeChart('chartUserGrowth', 'line', days.map(d => d.slice(5)), [{ label: 'Registrations', data: dayCounts, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.15)', fill: true, tension: .4 }]);

  // Role pie
  const admins = users.filter(u => u.role === 'admin').length;
  const regular = users.length - admins;
  makeChart('chartUserRoles', 'doughnut', ['User', 'Admin'], [{ data: [regular, admins], backgroundColor: ['#3b82f6', '#FF5E00'] }], { cutout: '55%' });
}

async function toggleUserRole(userId, currentRole) {
  const newRole = currentRole === 'admin' ? 'user' : 'admin';
  try {
    await apiFetch(`/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) });
    toast(`Role updated to ${newRole}`, 'success');
    loadUsers();
  } catch (e) { toast('Failed to update role', 'error'); }
}
window.toggleUserRole = toggleUserRole;

function filterUsers() {
  const q = document.getElementById('userSearch').value.toLowerCase();
  const filtered = adminState.usersCache.filter(u =>
    u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.includes(q)
  );
  renderUsersTable(filtered);
}

/* ═══════════ MENU ═══════════ */
const MAIN_CATEGORIES = {
  'All Time':  ['Coffee & Brews', 'Just Matcha & Hojicha', 'Beverages', 'Burgers & Sandwiches'],
  'Breakfast': ['Breakfast Plates'],
  'Lunch':     ['Mains'],
  'Snacks':    ['Pancakes & Waffles', 'Salads & Soups'],
  'Dinner':    ['Coffee & Brews', 'Just Matcha & Hojicha', 'Beverages', 'Burgers & Sandwiches', 'Pancakes & Waffles', 'Salads & Soups']
};

/* ── Restore custom category→slot mappings from localStorage ── */
(function restoreCustomSlotMappings() {
  try {
    const saved = JSON.parse(localStorage.getItem('blaze_cat_slots') || '{}');
    // saved = { "Desserts": ["All Time","Snacks"], ... }
    for (const [catName, slots] of Object.entries(saved)) {
      slots.forEach(slot => {
        if (MAIN_CATEGORIES[slot] && !MAIN_CATEGORIES[slot].includes(catName)) {
          MAIN_CATEGORIES[slot].push(catName);
        }
      });
    }
  } catch (e) { console.warn('Failed to restore slot mappings', e); }
})();

const TIME_SCHEDULE = [
  { label: 'Breakfast', icon: 'fa-sun',        color: '#f59e0b', start: 7,  end: 11, time: '7:00 AM – 11:00 AM',
    enable: ['Coffee & Brews', 'Just Matcha & Hojicha', 'Beverages', 'Burgers & Sandwiches', 'Breakfast Plates'] },
  { label: 'Lunch',   icon: 'fa-bowl-food',    color: '#22c55e', start: 11, end: 15, time: '11:00 AM – 3:00 PM',
    enable: ['Coffee & Brews', 'Just Matcha & Hojicha', 'Beverages', 'Burgers & Sandwiches', 'Mains'] },
  { label: 'Snacks',  icon: 'fa-cookie-bite',  color: '#3b82f6', start: 15, end: 19, time: '3:00 PM – 7:00 PM',
    enable: ['Coffee & Brews', 'Just Matcha & Hojicha', 'Beverages', 'Burgers & Sandwiches', 'Pancakes & Waffles', 'Salads & Soups'] },
  { label: 'Dinner',  icon: 'fa-moon',         color: '#a855f7', start: 19, end: 23, time: '7:00 PM – 11:00 PM',
    enable: ['Coffee & Brews', 'Just Matcha & Hojicha', 'Beverages', 'Burgers & Sandwiches', 'Pancakes & Waffles', 'Salads & Soups'] }
];

let _manualScheduleSlotLabel = null;
let _isApplyingSchedule = false;

async function loadMenu() {
  try {
    const res = await apiFetch('/admin/category-menus');
    if (!res.success) return;
    adminState.menuCache = res.data;
    renderCategoryMenu(res.data);
    renderMenuStats(res.data);
    renderScheduleBanner();
  } catch (e) { console.error('Menu load error', e); }
}

function renderCategoryMenu(cats) {
  const wrapper = document.getElementById('menuMainCats');
  if (!wrapper) return;
  const searchQ = (document.getElementById('menuSearch')?.value || '').toLowerCase();
  const catMap = {};
  cats.forEach(c => { catMap[c.category] = c; });

  // Track which categories are assigned to at least one slot
  const assignedCats = new Set();
  for (const subNames of Object.values(MAIN_CATEGORIES)) {
    subNames.forEach(n => assignedCats.add(n));
  }

  let html = '';
  for (const [mainName, subNames] of Object.entries(MAIN_CATEGORIES)) {
    const visibleSubs = subNames.filter(name => !searchQ || name.toLowerCase().includes(searchQ));
    if (searchQ && visibleSubs.length === 0) continue;
    const subCats = (searchQ ? visibleSubs : subNames).map(n => catMap[n]).filter(Boolean);
    const allOn  = subCats.length > 0 && subCats.every(c => c.availability);
    const allOff = subCats.length > 0 && subCats.every(c => !c.availability);

    html += `
    <div class="mcat-block">
      <div class="mcat-header">
        <div class="mcat-title"><i class="fas fa-layer-group"></i> ${mainName}
          <span class="mcat-count">${subCats.length} categor${subCats.length === 1 ? 'y' : 'ies'}</span>
        </div>
        <div class="mcat-actions">
          <button class="btn-mcat-on ${allOn ? 'active' : ''}" onclick="toggleMainCategory('${mainName}',true)">
            <i class="fas fa-toggle-on"></i> ON
          </button>
          <button class="btn-mcat-off ${allOff ? 'active' : ''}" onclick="toggleMainCategory('${mainName}',false)">
            <i class="fas fa-toggle-off"></i> OFF
          </button>
        </div>
      </div>
      <div class="mcat-grid">`;

    if (!subCats.length) {
      html += `<div class="mcat-empty">No categories assigned</div>`;
    } else {
      subCats.forEach(c => {
        const totalItems = c.subcategories.reduce((s, sc) => s + sc.items.length, 0);
        html += renderCatCard(c, totalItems);
      });
    }
    html += `</div></div>`;
  }

  // Show categories NOT assigned to any meal slot under "Other"
  const unassigned = cats.filter(c => !assignedCats.has(c.category));
  const visibleUnassigned = unassigned.filter(c => !searchQ || c.category.toLowerCase().includes(searchQ));
  if (visibleUnassigned.length > 0) {
    const allOn  = visibleUnassigned.every(c => c.availability);
    const allOff = visibleUnassigned.every(c => !c.availability);
    html += `
    <div class="mcat-block">
      <div class="mcat-header">
        <div class="mcat-title"><i class="fas fa-folder-open"></i> Other / Unassigned
          <span class="mcat-count">${visibleUnassigned.length} categor${visibleUnassigned.length === 1 ? 'y' : 'ies'}</span>
        </div>
        <div class="mcat-actions">
          <button class="btn-mcat-on ${allOn ? 'active' : ''}" onclick="toggleUnassignedCategories(true)">
            <i class="fas fa-toggle-on"></i> ON
          </button>
          <button class="btn-mcat-off ${allOff ? 'active' : ''}" onclick="toggleUnassignedCategories(false)">
            <i class="fas fa-toggle-off"></i> OFF
          </button>
        </div>
      </div>
      <div class="mcat-grid">`;
    visibleUnassigned.forEach(c => {
      const totalItems = c.subcategories.reduce((s, sc) => s + sc.items.length, 0);
      html += renderCatCard(c, totalItems);
    });
    html += `</div></div>`;
  }

  wrapper.innerHTML = html;
}

function renderCatCard(c, totalItems) {
  return `
    <div class="adm-cat-card ${c.availability ? '' : 'unavail'}">
      <div class="adm-cat-label">${c.category}</div>
      ${c.badge ? `<span class="adm-cat-badge">${c.badge}</span>` : ''}
      <div class="adm-cat-img-wrap">
        <img src="${c.image || ''}" alt="${c.category}"
          onerror="this.src='https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=70'" />
        <span class="adm-avail-pip ${c.availability ? 'yes' : 'no'}"></span>
      </div>
      <div class="adm-cat-meta">
        <span><i class="fas fa-list"></i> ${c.subcategories.length} subcats</span>
        <span><i class="fas fa-utensils"></i> ${totalItems} items</span>
      </div>
      <button class="adm-cat-toggle" onclick="toggleCategoryAvail('${c._id}')">
        ${c.availability ? '<i class="fas fa-eye-slash"></i> Disable' : '<i class="fas fa-eye"></i> Enable'}
      </button>
    </div>`;
}

function renderMenuStats(cats) {
  const el = document.getElementById('menuStats');
  if (!el) return;
  const available  = cats.filter(c => c.availability).length;
  const totalItems = cats.reduce((s, c) => s + c.subcategories.reduce((ss, sc) => ss + sc.items.length, 0), 0);
  el.innerHTML = `
    <div class="ms-chip"><strong>${cats.length}</strong> Categories</div>
    <div class="ms-chip"><strong>${available}</strong> Available</div>
    <div class="ms-chip"><strong>${totalItems}</strong> Total Items</div>`;
}

async function toggleCategoryAvail(id) {
  try {
    await apiFetch(`/admin/category-menus/${id}/toggle`, { method: 'PATCH' });
    toast('Availability updated', 'success');
    loadMenu();
  } catch (e) { toast('Failed to toggle', 'error'); }
}
window.toggleCategoryAvail = toggleCategoryAvail;

async function toggleMainCategory(mainName, enable) {
  try {
    const subNames = MAIN_CATEGORIES[mainName] || [];
    // Fetch fresh data directly from DB to avoid stale-cache mismatches
    const res = await apiFetch('/admin/category-menus');
    if (!res.success) { toast('Could not load categories', 'error'); return; }
    const cats = res.data.filter(c => subNames.includes(c.category));
    if (!cats.length) { toast('No categories found', 'info'); return; }
    // Use set-availability so the value is forced, not just flipped
    await Promise.allSettled(cats.map(c =>
      apiFetch(`/admin/category-menus/${c._id}/set-availability`, {
        method: 'PATCH',
        body: JSON.stringify({ availability: enable }),
        headers: { 'Content-Type': 'application/json' }
      })
    ));
    toast(`${mainName} ${enable ? 'enabled' : 'disabled'}`, 'success');
    loadMenu();
  } catch (e) { toast('Failed to update', 'error'); }
}
window.toggleMainCategory = toggleMainCategory;

async function toggleUnassignedCategories(enable) {
  try {
    const assignedCats = new Set();
    for (const subNames of Object.values(MAIN_CATEGORIES)) {
      subNames.forEach(n => assignedCats.add(n));
    }
    const res = await apiFetch('/admin/category-menus');
    if (!res.success) { toast('Could not load categories', 'error'); return; }
    const unassigned = res.data.filter(c => !assignedCats.has(c.category));
    if (!unassigned.length) { toast('No unassigned categories', 'info'); return; }
    await Promise.allSettled(unassigned.map(c =>
      apiFetch(`/admin/category-menus/${c._id}/set-availability`, {
        method: 'PATCH',
        body: JSON.stringify({ availability: enable }),
        headers: { 'Content-Type': 'application/json' }
      })
    ));
    toast(`Unassigned categories ${enable ? 'enabled' : 'disabled'}`, 'success');
    loadMenu();
  } catch (e) { toast('Failed to update', 'error'); }
}
window.toggleUnassignedCategories = toggleUnassignedCategories;
async function toggleAvail(id) { return toggleCategoryAvail(id); }
window.toggleAvail = toggleAvail;

function filterMenu() { renderCategoryMenu(adminState.menuCache); }

/* ═══════════ MENU ITEMS CRUD (Nested: Category → Subcategory → Item) ═══════════ */
let _menuDocs = [];
let _openCats = new Set();
let _openSubs = new Set();
let _editCtx = null;
let _delCtx  = null;
let _subCtx  = null;
let _catImageCtx = null;
let _allExpanded = false;

const CAT_ICONS = {
  'coffee':'fa-mug-hot','brews':'fa-mug-hot','matcha':'fa-leaf','hojicha':'fa-leaf',
  'beverage':'fa-glass-water','drink':'fa-glass-water','breakfast':'fa-egg',
  'pancake':'fa-cookie','waffle':'fa-cookie','burger':'fa-burger',
  'sandwich':'fa-bread-slice','main':'fa-utensils','salad':'fa-seedling','soup':'fa-bowl-food'
};
const CAT_COLORS = ['#ff5e00','#3b82f6','#22c55e','#ec4899','#a16207','#8b5cf6','#ef4444','#0ea5e9'];
function catIcon(n) { const l = n.toLowerCase(); for (const [k,v] of Object.entries(CAT_ICONS)) { if (l.includes(k)) return v; } return 'fa-utensils'; }

async function loadMenuItems() {
  const wrap = document.getElementById('miAccordion');
  if (!wrap) return;
  wrap.innerHTML = '<div class="mi-loading"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Loading menu…</p></div>';
  try {
    const res = await apiFetch('/menu/admin/all');
    if (!res.success) { wrap.innerHTML = '<div class="mi-loading"><i class="fas fa-exclamation-circle fa-2x" style="color:#ef4444"></i><p>Failed to load items</p></div>'; return; }
    _menuDocs = res.data?.items || res.data || [];
    renderAccordion();
    renderMiStats();
  } catch (e) {
    console.error('loadMenuItems error', e);
    wrap.innerHTML = '<div class="mi-loading"><i class="fas fa-exclamation-circle fa-2x" style="color:#ef4444"></i><p>Error loading menu</p></div>';
  }
}
window.loadMenuItems = loadMenuItems;

function renderMiStats() {
  const el = document.getElementById('miStats');
  if (!el) return;
  let totalItems = 0, totalAvail = 0, totalSubs = 0, allPrices = [];
  _menuDocs.forEach(doc => {
    (doc.subcategories || []).forEach(sub => {
      totalSubs++;
      (sub.items || []).forEach(it => {
        totalItems++;
        if (it.available !== false) totalAvail++;
        (it.prices || []).forEach(p => { if (typeof p === 'number') allPrices.push(p); });
      });
    });
  });
  const avg = allPrices.length ? Math.round(allPrices.reduce((a,b) => a + b, 0) / allPrices.length) : 0;
  const unavail = totalItems - totalAvail;
  el.innerHTML = `
    <div class="mi-stat-card">
      <div class="mi-stat-icon" style="background:rgba(255,94,0,.12);color:#ff5e00"><i class="fas fa-layer-group"></i></div>
      <div class="mi-stat-data"><span class="mi-stat-num">${_menuDocs.length}</span><span class="mi-stat-label">Categories</span></div>
    </div>
    <div class="mi-stat-card">
      <div class="mi-stat-icon" style="background:rgba(59,130,246,.12);color:#3b82f6"><i class="fas fa-folder"></i></div>
      <div class="mi-stat-data"><span class="mi-stat-num">${totalSubs}</span><span class="mi-stat-label">Subcategories</span></div>
    </div>
    <div class="mi-stat-card">
      <div class="mi-stat-icon" style="background:rgba(34,197,94,.12);color:#22c55e"><i class="fas fa-check-circle"></i></div>
      <div class="mi-stat-data"><span class="mi-stat-num">${totalAvail}</span><span class="mi-stat-label">Available</span></div>
    </div>
    <div class="mi-stat-card">
      <div class="mi-stat-icon" style="background:rgba(239,68,68,.12);color:#ef4444"><i class="fas fa-times-circle"></i></div>
      <div class="mi-stat-data"><span class="mi-stat-num">${unavail}</span><span class="mi-stat-label">Unavailable</span></div>
    </div>
    <div class="mi-stat-card">
      <div class="mi-stat-icon" style="background:rgba(161,98,7,.12);color:#a16207"><i class="fas fa-tag"></i></div>
      <div class="mi-stat-data"><span class="mi-stat-num">₹${avg}</span><span class="mi-stat-label">Avg Price</span></div>
    </div>`;
}

function renderAccordion() {
  const wrap = document.getElementById('miAccordion');
  if (!wrap) return;
  const q = (document.getElementById('miSearch')?.value || '').toLowerCase();
  const docs = _menuDocs.map(doc => {
    if (!q) return doc;
    const filteredSubs = (doc.subcategories || []).map(sub => {
      const fItems = (sub.items || []).filter(it => it.name.toLowerCase().includes(q));
      return fItems.length ? { ...sub, items: fItems } : null;
    }).filter(Boolean);
    return filteredSubs.length ? { ...doc, subcategories: filteredSubs } : null;
  }).filter(Boolean);

  if (!docs.length) {
    wrap.innerHTML = '<div class="mi-empty"><i class="fas fa-search fa-3x"></i><p>' + (q ? 'No items match "' + q + '"' : 'No menu items found') + '</p></div>';
    return;
  }

  wrap.innerHTML = docs.map((doc, di) => {
    const catId = doc._id;
    const isOpen = _openCats.has(catId);
    const icon = catIcon(doc.category);
    const color = CAT_COLORS[di % CAT_COLORS.length];
    let totalItems = 0, availItems = 0;
    (doc.subcategories || []).forEach(s => { s.items?.forEach(it => { totalItems++; if (it.available !== false) availItems++; }); });
    const subs = doc.subcategories || [];

    return `
    <div class="mi-acc-panel ${isOpen ? 'open' : ''}" data-catid="${catId}">
      <div class="mi-acc-head" onclick="toggleCat('${catId}')">
        <div class="mi-acc-left">
          <div class="mi-acc-icon" style="background:${color}18;color:${color}"><i class="fas ${icon}"></i></div>
          <div class="mi-acc-info">
            <h3>${doc.category}</h3>
            <div class="mi-acc-meta">
              <span class="mi-acc-tag"><i class="fas fa-folder"></i> ${subs.length}</span>
              <span class="mi-acc-tag"><i class="fas fa-utensils"></i> ${totalItems}</span>
              <span class="mi-acc-tag mi-acc-tag-avail"><i class="fas fa-circle"></i> ${availItems}/${totalItems}</span>
            </div>
          </div>
        </div>
        <div class="mi-acc-right">
          <button class="mi-pill-btn ${doc.availability ? 'mi-pill-on' : 'mi-pill-off'}" onclick="event.stopPropagation();toggleCatAvail('${catId}')" title="Toggle entire category">
            <i class="fas ${doc.availability ? 'fa-eye' : 'fa-eye-slash'}"></i> ${doc.availability ? 'Active' : 'Hidden'}
          </button>
          <button class="mi-icon-btn mi-icon-img" onclick="event.stopPropagation();openCatImageModal('${catId}','${doc.category.replace(/'/g,"\\'")}')" title="Update category image">
            <i class="fas fa-image"></i>
          </button>
          <button class="mi-icon-btn mi-icon-add" onclick="event.stopPropagation();openSubModal('${catId}')" title="Add Subcategory">
            <i class="fas fa-folder-plus"></i>
          </button>
          <button class="mi-icon-btn mi-icon-del" onclick="event.stopPropagation();openDeleteCatModal('${catId}','${doc.category.replace(/'/g,"\\'")}')" title="Delete Category">
            <i class="fas fa-trash"></i>
          </button>
          <i class="fas fa-chevron-down mi-acc-arrow"></i>
        </div>
      </div>
      <div class="mi-acc-body">
        ${subs.length ? subs.map((sub, si) => renderSubcategory(doc, si, sub, color)).join('') : '<div class="mi-empty-sub"><i class="fas fa-folder-open"></i> No subcategories yet — <a href="#" onclick="event.preventDefault();openSubModal(\'' + catId + '\')">add one</a></div>'}
      </div>
    </div>`;
  }).join('');
}

function renderSubcategory(doc, si, sub, color) {
  const key = doc._id + '-' + si;
  const isOpen = _openSubs.has(key);
  const items = sub.items || [];
  const availCount = items.filter(it => it.available !== false).length;
  return `
  <div class="mi-sub-panel ${isOpen ? 'open' : ''}" data-subkey="${key}">
    <div class="mi-sub-head" onclick="toggleSub('${key}')">
      <div class="mi-sub-head-left">
        <i class="fas fa-folder${isOpen ? '-open' : ''}" style="color:${color};opacity:.65"></i>
        <span class="mi-sub-name">${sub.name}</span>
        <span class="mi-sub-badge">${items.length} item${items.length !== 1 ? 's' : ''}</span>
        <span class="mi-sub-avail-dot ${availCount === items.length ? 'all-on' : availCount === 0 ? 'all-off' : 'partial'}"></span>
      </div>
      <div class="mi-sub-head-right">
        <button class="mi-text-btn mi-text-add" onclick="event.stopPropagation();openItemModalAdd('${doc._id}',${si})" title="Add item to ${sub.name}">
          <i class="fas fa-plus"></i> Add Item
        </button>
        <button class="mi-text-btn mi-text-rename" onclick="event.stopPropagation();openSubModal('${doc._id}',${si})" title="Rename subcategory">
          <i class="fas fa-pen"></i>
        </button>
        <button class="mi-text-btn mi-text-del" onclick="event.stopPropagation();openDeleteSub('${doc._id}',${si},'${sub.name.replace(/'/g,"\\'")}')" title="Delete subcategory">
          <i class="fas fa-trash"></i>
        </button>
        <i class="fas fa-chevron-right mi-sub-arrow"></i>
      </div>
    </div>
    <div class="mi-sub-body">
      ${items.length
        ? '<div class="mi-items-header"><span class="mi-ih-name">Item</span><span class="mi-ih-price">Price</span><span class="mi-ih-status">Status</span><span class="mi-ih-actions">Actions</span></div>'
          + items.map((it, ii) => renderItem(doc._id, si, ii, it)).join('')
        : '<div class="mi-item-empty"><i class="fas fa-inbox"></i> No items yet — <a href="#" onclick="event.preventDefault();openItemModalAdd(\'' + doc._id + '\',' + si + ')">add one</a></div>'}
    </div>
  </div>`;
}

function renderItem(catId, si, ii, item) {
  const priceStr = (item.prices || []).map(p => '₹' + p).join(' / ');
  const img = item.image_url || '';
  const avail = item.available !== false;
  return `
  <div class="mi-item-row ${avail ? '' : 'mi-unavail'}">
    <div class="mi-item-left">
      ${img
        ? '<img class="mi-item-thumb" src="' + img + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'" /><div class="mi-item-thumb-ph" style="display:none"><i class="fas fa-image"></i></div>'
        : '<div class="mi-item-thumb-ph"><i class="fas fa-image"></i></div>'}
      <span class="mi-item-name" title="${item.name}">${item.name}</span>
    </div>
    <span class="mi-item-price">${priceStr}</span>
    <div class="mi-item-status">
      <label class="mi-switch" title="${avail ? 'Click to disable' : 'Click to enable'}">
        <input type="checkbox" ${avail ? 'checked' : ''} onchange="toggleItemAvail('${catId}',${si},${ii})" />
        <span class="mi-switch-track"></span>
      </label>
      <span class="mi-status-label ${avail ? 'on' : 'off'}">${avail ? 'Available' : 'Unavailable'}</span>
    </div>
    <div class="mi-item-actions">
      <button class="mi-act-btn mi-act-edit" onclick="openItemModalEdit('${catId}',${si},${ii})" title="Edit item">
        <i class="fas fa-pen"></i> Edit
      </button>
      <button class="mi-act-btn mi-act-del" onclick="openDeleteItem('${catId}',${si},${ii})" title="Delete item">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  </div>`;
}

/* ── Toggle Helpers ── */
function toggleCat(catId) {
  if (_openCats.has(catId)) _openCats.delete(catId); else _openCats.add(catId);
  const p = document.querySelector('.mi-acc-panel[data-catid="' + catId + '"]');
  if (p) p.classList.toggle('open');
}
window.toggleCat = toggleCat;

function toggleSub(key) {
  if (_openSubs.has(key)) _openSubs.delete(key); else _openSubs.add(key);
  const p = document.querySelector('.mi-sub-panel[data-subkey="' + key + '"]');
  if (p) p.classList.toggle('open');
}
window.toggleSub = toggleSub;

function toggleAllAccordions() {
  _allExpanded = !_allExpanded;
  const btn = document.getElementById('btnToggleAll');
  if (_allExpanded) {
    _menuDocs.forEach(doc => {
      _openCats.add(doc._id);
      (doc.subcategories || []).forEach((_, si) => _openSubs.add(doc._id + '-' + si));
    });
    if (btn) btn.innerHTML = '<i class="fas fa-compress-alt"></i> Collapse All';
  } else {
    _openCats.clear();
    _openSubs.clear();
    if (btn) btn.innerHTML = '<i class="fas fa-expand-alt"></i> Expand All';
  }
  renderAccordion();
}
window.toggleAllAccordions = toggleAllAccordions;

function filterMenuItems() { renderAccordion(); }
window.filterMenuItems = filterMenuItems;

/* ── Category & Item Availability ── */
async function toggleCatAvail(catId) {
  const doc = _menuDocs.find(d => d._id === catId);
  if (!doc) return;
  try {
    const res = await apiFetch('/menu/' + catId, { method: 'PUT', body: JSON.stringify({ availability: !doc.availability }) });
    if (res.success) { toast('"' + doc.category + '" ' + (!doc.availability ? 'enabled' : 'disabled'), 'success'); loadMenuItems(); }
    else toast(res.message || 'Failed', 'error');
  } catch (e) { toast('Error toggling category', 'error'); }
}
window.toggleCatAvail = toggleCatAvail;

async function toggleItemAvail(catId, si, ii) {
  const doc = _menuDocs.find(d => d._id === catId);
  const item = doc?.subcategories?.[si]?.items?.[ii];
  if (!item) return;
  const newVal = item.available === false;
  try {
    const res = await apiFetch('/menu/' + catId + '/subcategory/' + si + '/item/' + ii, { method: 'PUT', body: JSON.stringify({ available: newVal }) });
    if (res.success) { toast('"' + item.name + '" ' + (newVal ? 'enabled' : 'disabled'), 'success'); loadMenuItems(); }
    else toast(res.message || 'Failed', 'error');
  } catch (e) { toast('Error toggling item', 'error'); }
}
window.toggleItemAvail = toggleItemAvail;

/* ── Item Modal ── */
function openItemModalAdd(catId, si) {
  _editCtx = { catId, subIdx: si, itemIdx: null };
  const doc = _menuDocs.find(d => d._id === catId);
  const sub = doc?.subcategories?.[si];
  document.getElementById('itemModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Add New Item';
  document.getElementById('btnSaveItem').innerHTML = '<i class="fas fa-save"></i> Add Item';
  const ctx = document.getElementById('mfContext');
  if (ctx) ctx.innerHTML = '<i class="fas fa-map-marker-alt"></i> ' + (doc?.category || '') + ' / ' + (sub?.name || '');
  document.getElementById('mfName').value = '';
  document.getElementById('mfPrices').value = '';
  document.getElementById('mfImage').value = '';
  updateImagePreview();
  document.getElementById('itemModalOverlay').style.display = 'flex';
  document.getElementById('mfName').focus();
}
window.openItemModalAdd = openItemModalAdd;

function openItemModalEdit(catId, si, ii) {
  const doc = _menuDocs.find(d => d._id === catId);
  const sub = doc?.subcategories?.[si];
  const item = sub?.items?.[ii];
  if (!item) { toast('Item not found', 'error'); return; }
  _editCtx = { catId, subIdx: si, itemIdx: ii };
  document.getElementById('itemModalTitle').innerHTML = '<i class="fas fa-pen"></i> Edit Item';
  document.getElementById('btnSaveItem').innerHTML = '<i class="fas fa-save"></i> Update Item';
  const ctx = document.getElementById('mfContext');
  if (ctx) ctx.innerHTML = '<i class="fas fa-map-marker-alt"></i> ' + (doc?.category || '') + ' / ' + (sub?.name || '');
  document.getElementById('mfName').value = item.name || '';
  document.getElementById('mfPrices').value = (item.prices || []).join(', ');
  document.getElementById('mfImage').value = item.image_url || '';
  updateImagePreview();
  document.getElementById('itemModalOverlay').style.display = 'flex';
  document.getElementById('mfName').focus();
}
window.openItemModalEdit = openItemModalEdit;

function closeItemModal() {
  document.getElementById('itemModalOverlay').style.display = 'none';
  _editCtx = null;
  document.getElementById('itemForm')?.reset();
  const prev = document.getElementById('mfPreview');
  if (prev) prev.style.display = 'none';
}
window.closeItemModal = closeItemModal;

function updateImagePreview() {
  const url = document.getElementById('mfImage')?.value.trim();
  const prev = document.getElementById('mfPreview');
  const img = document.getElementById('mfPreviewImg');
  if (url && prev && img) { img.src = url; prev.style.display = 'block'; img.onerror = () => { prev.style.display = 'none'; }; }
  else if (prev) { prev.style.display = 'none'; }
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mfImage')?.addEventListener('input', updateImagePreview);
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('itemForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!_editCtx) return;
    const name = document.getElementById('mfName').value.trim();
    const pricesRaw = document.getElementById('mfPrices').value.trim();
    const prices = pricesRaw.split(/[,\s]+/).map(Number).filter(n => !isNaN(n) && n >= 0);
    const image_url = document.getElementById('mfImage').value.trim();
    if (!name || !prices.length) { toast('Name and at least one price required', 'error'); return; }
    const btn = document.getElementById('btnSaveItem');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; }
    try {
      let res;
      const payload = { name, prices, image_url };
      if (_editCtx.itemIdx !== null) {
        res = await apiFetch('/menu/' + _editCtx.catId + '/subcategory/' + _editCtx.subIdx + '/item/' + _editCtx.itemIdx, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        res = await apiFetch('/menu/' + _editCtx.catId + '/subcategory/' + _editCtx.subIdx + '/item', { method: 'POST', body: JSON.stringify(payload) });
      }
      if (res.success) { toast(res.message || 'Saved!', 'success'); closeItemModal(); loadMenuItems(); }
      else toast(res.message || 'Failed to save', 'error');
    } catch (e) { toast('Error: ' + e.message, 'error'); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Item'; } }
  });
});

/* ── Subcategory Modal ── */
function openSubModal(catId, subIdx) {
  _subCtx = { catId, subIdx: subIdx !== undefined ? subIdx : null };
  const doc = _menuDocs.find(d => d._id === catId);
  const title = document.getElementById('subModalTitle');
  const ctx = document.getElementById('mfSubContext');
  if (ctx) ctx.innerHTML = '<i class="fas fa-map-marker-alt"></i> ' + (doc?.category || '');
  if (subIdx !== undefined) {
    title.innerHTML = '<i class="fas fa-edit"></i> Rename Subcategory';
    document.getElementById('mfSubName').value = doc?.subcategories?.[subIdx]?.name || '';
  } else {
    title.innerHTML = '<i class="fas fa-folder-plus"></i> Add Subcategory';
    document.getElementById('mfSubName').value = '';
  }
  document.getElementById('subModalOverlay').style.display = 'flex';
  document.getElementById('mfSubName').focus();
}
window.openSubModal = openSubModal;

function closeSubModal() {
  document.getElementById('subModalOverlay').style.display = 'none';
  _subCtx = null;
  document.getElementById('subForm')?.reset();
}
window.closeSubModal = closeSubModal;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('subForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!_subCtx) return;
    const name = document.getElementById('mfSubName').value.trim();
    if (!name) { toast('Subcategory name required', 'error'); return; }
    const btn = document.getElementById('btnSaveSub');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; }
    try {
      let res;
      if (_subCtx.subIdx !== null) {
        res = await apiFetch('/menu/' + _subCtx.catId + '/subcategory/' + _subCtx.subIdx, { method: 'PUT', body: JSON.stringify({ name }) });
      } else {
        res = await apiFetch('/menu/' + _subCtx.catId + '/subcategory', { method: 'POST', body: JSON.stringify({ name }) });
      }
      if (res.success) { toast(res.message || 'Saved!', 'success'); closeSubModal(); loadMenuItems(); }
      else toast(res.message || 'Failed', 'error');
    } catch (e) { toast('Error: ' + e.message, 'error'); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save'; } }
  });
});

/* ── Delete Modal ── */
function openDeleteItem(catId, si, ii) {
  const doc = _menuDocs.find(d => d._id === catId);
  const item = doc?.subcategories?.[si]?.items?.[ii];
  if (!item) return;
  _delCtx = { catId, subIdx: si, itemIdx: ii, type: 'item' };
  document.getElementById('delItemName').textContent = item.name;
  document.getElementById('deleteModalOverlay').style.display = 'flex';
}
window.openDeleteItem = openDeleteItem;

function openDeleteSub(catId, si, subName) {
  _delCtx = { catId, subIdx: si, type: 'subcategory' };
  document.getElementById('delItemName').textContent = subName;
  document.getElementById('deleteModalOverlay').style.display = 'flex';
}
window.openDeleteSub = openDeleteSub;

function closeDeleteModal() {
  document.getElementById('deleteModalOverlay').style.display = 'none';
  _delCtx = null;
}
window.closeDeleteModal = closeDeleteModal;

async function confirmDeleteItem() {
  if (!_delCtx) return;
  const btn = document.getElementById('btnConfirmDelete');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting…'; }
  try {
    const url = _delCtx.type === 'item'
      ? '/menu/' + _delCtx.catId + '/subcategory/' + _delCtx.subIdx + '/item/' + _delCtx.itemIdx
      : '/menu/' + _delCtx.catId + '/subcategory/' + _delCtx.subIdx;
    const res = await apiFetch(url, { method: 'DELETE' });
    if (res.success) { toast(res.message || 'Deleted!', 'success'); closeDeleteModal(); loadMenuItems(); }
    else toast(res.message || 'Failed to delete', 'error');
  } catch (e) { toast('Error deleting', 'error'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-trash"></i> Delete'; } }
}
window.confirmDeleteItem = confirmDeleteItem;

/* ═══════════ CREATE / DELETE CATEGORY ═══════════ */
function openCreateCategoryModal() {
  document.getElementById('catModalTitle').innerHTML = '<i class="fas fa-folder-plus"></i> Create New Category';
  document.getElementById('btnSaveCat').innerHTML = '<i class="fas fa-save"></i> Create Category';
  document.getElementById('mfCatName').value = '';
  document.getElementById('mfCatImage').value = '';
  document.getElementById('mfCatBadge').value = '';
  document.getElementById('mfCatAvailable').checked = true;
  // Reset slot checkboxes
  document.querySelectorAll('#mfCatSlots input[type="checkbox"]').forEach(cb => cb.checked = false);
  updateCatImagePreview();
  document.getElementById('catModalOverlay').style.display = 'flex';
  document.getElementById('mfCatName').focus();
}
window.openCreateCategoryModal = openCreateCategoryModal;

function closeCategoryModal() {
  document.getElementById('catModalOverlay').style.display = 'none';
  document.getElementById('catForm')?.reset();
  const prev = document.getElementById('mfCatPreview');
  if (prev) prev.style.display = 'none';
}
window.closeCategoryModal = closeCategoryModal;

function updateCatImagePreview() {
  const url = document.getElementById('mfCatImage')?.value.trim();
  const prev = document.getElementById('mfCatPreview');
  const img = document.getElementById('mfCatPreviewImg');
  if (url && prev && img) { img.src = url; prev.style.display = 'block'; img.onerror = () => { prev.style.display = 'none'; }; }
  else if (prev) { prev.style.display = 'none'; }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mfCatImage')?.addEventListener('input', updateCatImagePreview);

  document.getElementById('catForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('mfCatName').value.trim();
    const image = document.getElementById('mfCatImage').value.trim();
    const badge = document.getElementById('mfCatBadge').value.trim();
    const availability = document.getElementById('mfCatAvailable').checked;

    // Get selected meal slots
    const selectedSlots = [...document.querySelectorAll('#mfCatSlots input[type="checkbox"]:checked')].map(cb => cb.value);

    if (!name) { toast('Category name is required', 'error'); return; }
    if (!selectedSlots.length) { toast('Please select at least one meal slot', 'error'); return; }

    const btn = document.getElementById('btnSaveCat');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating…'; }

    try {
      // Create in Menu model (admin menu items)
      const menuPayload = { category: name, subcategories: [], availability };
      const menuRes = await apiFetch('/menu', { method: 'POST', body: JSON.stringify(menuPayload) });

      // Also create in CategoryMenu model (frontend /api/menus)
      const catMenuPayload = {
        category: name,
        subcategories: [],
        image: image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
        badge: badge || '',
        availability
      };
      try {
        await apiFetch('/menus', { method: 'POST', body: JSON.stringify(catMenuPayload) });
      } catch (syncErr) {
        console.warn('Category created in Menu but failed to sync to CategoryMenu:', syncErr);
      }

      if (menuRes.success) {
        // Add to MAIN_CATEGORIES for selected slots + persist to localStorage
        selectedSlots.forEach(slot => {
          if (MAIN_CATEGORIES[slot] && !MAIN_CATEGORIES[slot].includes(name)) {
            MAIN_CATEGORIES[slot].push(name);
          }
        });
        // Persist custom slot mappings
        try {
          const saved = JSON.parse(localStorage.getItem('blaze_cat_slots') || '{}');
          saved[name] = selectedSlots;
          localStorage.setItem('blaze_cat_slots', JSON.stringify(saved));
        } catch (e) { console.warn('Failed to save slot mappings', e); }

        toast(`Category "${name}" created successfully!`, 'success');
        closeCategoryModal();
        loadMenuItems();
        // Also refresh the Menu section if it was loaded
        if (adminState.menuCache.length) loadMenu();
      } else {
        toast(menuRes.message || 'Failed to create category', 'error');
      }
    } catch (e) {
      toast('Error creating category: ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Create Category'; }
    }
  });
});

/* ── Delete Category ── */
let _delCatId = null;
let _delCatName = '';

function openDeleteCatModal(catId, catName) {
  _delCatId = catId;
  _delCatName = catName;
  document.getElementById('delCatName').textContent = catName;
  document.getElementById('deleteCatModalOverlay').style.display = 'flex';
}
window.openDeleteCatModal = openDeleteCatModal;

function closeDeleteCatModal() {
  document.getElementById('deleteCatModalOverlay').style.display = 'none';
  _delCatId = null;
  _delCatName = '';
}
window.closeDeleteCatModal = closeDeleteCatModal;

async function confirmDeleteCategory() {
  if (!_delCatId) return;
  const btn = document.getElementById('btnConfirmDeleteCat');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting…'; }
  try {
    // Delete from Menu model
    const res = await apiFetch('/menu/' + _delCatId, { method: 'DELETE' });

    // Also try to delete matching category from CategoryMenu model (frontend sync)
    try {
      const catMenus = await apiFetch('/admin/category-menus');
      if (catMenus.success && catMenus.data) {
        const match = catMenus.data.find(c => c.category === _delCatName);
        if (match) {
          await apiFetch('/menus/' + match._id, { method: 'DELETE' });
        }
      }
    } catch (syncErr) {
      console.warn('Category deleted from Menu but failed to sync delete to CategoryMenu:', syncErr);
    }

    if (res.success) {
      // Remove from MAIN_CATEGORIES and localStorage slot mappings
      for (const slot of Object.keys(MAIN_CATEGORIES)) {
        MAIN_CATEGORIES[slot] = MAIN_CATEGORIES[slot].filter(n => n !== _delCatName);
      }
      try {
        const saved = JSON.parse(localStorage.getItem('blaze_cat_slots') || '{}');
        delete saved[_delCatName];
        localStorage.setItem('blaze_cat_slots', JSON.stringify(saved));
      } catch (e) { /* ignore */ }

      toast(`Category "${_delCatName}" deleted!`, 'success');
      closeDeleteCatModal();
      loadMenuItems();
      if (adminState.menuCache.length) loadMenu();
    } else {
      toast(res.message || 'Failed to delete category', 'error');
    }
  } catch (e) {
    toast('Error deleting category: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-trash"></i> Delete Category'; }
  }
}
window.confirmDeleteCategory = confirmDeleteCategory;

/* ── Edit Category Image ── */
function updateEditCatImagePreview() {
  const url = document.getElementById('mfEditCatImage')?.value.trim();
  const prev = document.getElementById('mfEditCatPreview');
  const img = document.getElementById('mfEditCatPreviewImg');
  if (url && prev && img) {
    img.src = url;
    prev.style.display = 'block';
    img.onerror = () => { prev.style.display = 'none'; };
  } else if (prev) {
    prev.style.display = 'none';
  }
}

async function openCatImageModal(catId, categoryName) {
  _catImageCtx = { catId, categoryName };
  const title = document.getElementById('catImageModalTitle');
  const ctx = document.getElementById('mfCatImageContext');
  const imgInput = document.getElementById('mfEditCatImage');
  const badgeInput = document.getElementById('mfEditCatBadge');

  if (title) title.innerHTML = '<i class="fas fa-image"></i> Update Category Image';
  if (ctx) ctx.innerHTML = '<i class="fas fa-map-marker-alt"></i> ' + categoryName;
  if (imgInput) imgInput.value = '';
  if (badgeInput) badgeInput.value = '';

  try {
    const res = await apiFetch('/admin/category-menus');
    const matched = (res.data || []).find(c => c.category === categoryName);
    _catImageCtx.catMenuId = matched?._id || null;
    _catImageCtx.availability = matched?.availability !== false;
    if (imgInput) imgInput.value = matched?.image || '';
    if (badgeInput) badgeInput.value = matched?.badge || '';
  } catch (e) {
    console.warn('Could not prefill category image data', e);
    _catImageCtx.catMenuId = null;
    _catImageCtx.availability = true;
  }

  updateEditCatImagePreview();
  document.getElementById('catImageModalOverlay').style.display = 'flex';
  imgInput?.focus();
}
window.openCatImageModal = openCatImageModal;

function closeCatImageModal() {
  document.getElementById('catImageModalOverlay').style.display = 'none';
  _catImageCtx = null;
}
window.closeCatImageModal = closeCatImageModal;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mfEditCatImage')?.addEventListener('input', updateEditCatImagePreview);

  document.getElementById('catImageForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!_catImageCtx?.categoryName) {
      toast('Category context missing', 'error');
      return;
    }

    const image = document.getElementById('mfEditCatImage')?.value.trim() || '';
    const badge = document.getElementById('mfEditCatBadge')?.value.trim() || '';

    const btn = document.getElementById('btnSaveCatImage');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    try {
      const payload = {
        category: _catImageCtx.categoryName,
        image,
        badge,
        availability: _catImageCtx.availability !== false
      };

      let res;
      if (_catImageCtx.catMenuId) {
        res = await apiFetch('/menus/' + _catImageCtx.catMenuId, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch('/menus', {
          method: 'POST',
          body: JSON.stringify({ ...payload, subcategories: [] })
        });
      }

      if (res.success) {
        toast('Category image updated for "' + _catImageCtx.categoryName + '"', 'success');
        closeCatImageModal();
        if (adminState.section === 'menu') loadMenu();
        if (adminState.section === 'menu-items') loadMenuItems();
      } else {
        toast(res.message || 'Failed to update category image', 'error');
      }
    } catch (err) {
      toast('Error updating category image: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save Image';
      }
    }
  });
});

/* ═══════════ MOOD MANAGEMENT ═══════════ */
let _moodModalBusy = false;

function labelFromMoodSlug(slug) {
  const found = (adminState.moodCategoriesCache || []).find(c => c.slug === slug);
  if (found?.label) return found.label;
  return String(slug || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

function parseMoodTags(raw) {
  return String(raw || '')
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean)
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
    .slice(0, 20);
}

function fmtNum(v, digits = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0';
  return n.toFixed(digits);
}

async function loadMoodManagement() {
  const tbody = document.getElementById('moodItemsBody');
  const catGrid = document.getElementById('moodCategoryGrid');

  if (!tbody || !catGrid) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:20px"><i class="fas fa-spinner fa-spin"></i> Loading mood items...</td></tr>';
  catGrid.innerHTML = '<div class="mi-loading"><i class="fas fa-spinner fa-spin"></i><p>Loading categories...</p></div>';

  try {
    const [catRes, itemRes, sourceRes] = await Promise.all([
      apiFetch('/mood/admin/categories'),
      apiFetch('/mood/admin/items'),
      apiFetch('/mood/admin/menu-items')
    ]);

    if (!catRes.success || !itemRes.success || !sourceRes.success) {
      throw new Error('Failed to load mood management data');
    }

    adminState.moodCategoriesCache = catRes.data || [];
    adminState.moodItemsCache = itemRes.data || [];
    adminState.moodMenuSourceCache = sourceRes.data || [];

    renderMoodCategoryGrid();
    renderMoodSourceSelect();
    renderMoodCheckboxes([]);
    filterMoodItems();
  } catch (e) {
    console.error('Mood management load error:', e);
    catGrid.innerHTML = '<div style="padding:12px;color:var(--danger)"><i class="fas fa-triangle-exclamation"></i> Failed to load mood categories.</div>';
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:20px">Failed to load mood items.</td></tr>';
  }
}

function renderMoodCategoryGrid() {
  const grid = document.getElementById('moodCategoryGrid');
  if (!grid) return;

  const categories = adminState.moodCategoriesCache || [];
  if (!categories.length) {
    grid.innerHTML = '<div style="padding:12px;color:var(--text-dim)">No mood categories found.</div>';
    return;
  }

  grid.innerHTML = categories.map(cat => `
    <div class="mood-cat-chip">
      <div class="mood-cat-name">
        <strong>${escapeHtml(cat.label || cat.slug)}</strong>
        <span>${escapeHtml(cat.slug || '')}</span>
      </div>
      <button class="mood-cat-toggle ${cat.isEnabled ? 'on' : 'off'}"
              onclick="toggleMoodCategory('${cat.slug}', ${!cat.isEnabled})">
        ${cat.isEnabled ? 'Enabled' : 'Disabled'}
      </button>
    </div>
  `).join('');
}

async function toggleMoodCategory(slug, nextState) {
  try {
    const res = await apiFetch('/mood/admin/categories/' + encodeURIComponent(slug), {
      method: 'PUT',
      body: JSON.stringify({ isEnabled: !!nextState })
    });

    if (!res.success) {
      toast(res.message || 'Failed to update mood category', 'error');
      return;
    }

    adminState.moodCategoriesCache = (adminState.moodCategoriesCache || []).map(cat =>
      cat.slug === slug ? { ...cat, isEnabled: !!nextState } : cat
    );
    renderMoodCategoryGrid();
    renderMoodCheckboxes(getSelectedMoodSlugs());
    toast(`Mood "${labelFromMoodSlug(slug)}" ${nextState ? 'enabled' : 'disabled'}`, 'success');
  } catch (e) {
    toast('Failed to update mood category', 'error');
  }
}

function renderMoodSourceSelect() {
  const select = document.getElementById('moodSourceSelect');
  if (!select) return;

  const current = select.value;
  const sources = [...(adminState.moodMenuSourceCache || [])].sort((a, b) => {
    const an = (a.itemName || '').toLowerCase();
    const bn = (b.itemName || '').toLowerCase();
    return an.localeCompare(bn);
  });

  select.innerHTML = '<option value="">-- Select from Menu --</option>' +
    sources.map(src => {
      const value = String(src.menuItemId || '');
      const text = `${src.itemName || 'Unnamed'} • ${src.categoryName || '—'} / ${src.subcategoryName || '—'} • ₹${src.price || 0}`;
      return `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`;
    }).join('');

  if (current) select.value = current;
}

function getSelectedMoodSlugs() {
  return [...document.querySelectorAll('#moodCheckboxWrap input[type="checkbox"]:checked')].map(i => i.value);
}

function renderMoodCheckboxes(selected) {
  const wrap = document.getElementById('moodCheckboxWrap');
  if (!wrap) return;

  const selectedSet = new Set(selected || []);
  const categories = adminState.moodCategoriesCache || [];

  if (!categories.length) {
    wrap.innerHTML = '<span style="font-size:.78rem;color:var(--text-dim)">No mood categories available.</span>';
    return;
  }

  wrap.innerHTML = categories.map(cat => {
    const id = 'moodChk_' + cat.slug;
    const checked = selectedSet.has(cat.slug) ? 'checked' : '';
    const disabled = cat.isEnabled ? '' : 'disabled';
    const label = cat.label || labelFromMoodSlug(cat.slug);

    return `
      <div class="mood-check-chip">
        <input type="checkbox" id="${id}" value="${cat.slug}" ${checked} ${disabled} />
        <label for="${id}">${escapeHtml(label)}</label>
      </div>
    `;
  }).join('');
}

function renderMoodItemsTable(items) {
  const tbody = document.getElementById('moodItemsBody');
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:20px">No mood items mapped yet.</td></tr>';
    return;
  }

  const moodOrderMap = new Map((adminState.moodCategoriesCache || []).map((m, idx) => [m.slug, idx]));

  function getPrimaryMoodSlug(item) {
    const moods = Array.isArray(item?.moods) ? item.moods : [];
    if (!moods.length) return 'unassigned';

    return [...moods].sort((a, b) => {
      const ai = moodOrderMap.has(a) ? moodOrderMap.get(a) : 999;
      const bi = moodOrderMap.has(b) ? moodOrderMap.get(b) : 999;
      if (ai !== bi) return ai - bi;
      return String(a).localeCompare(String(b));
    })[0];
  }

  const sorted = [...items].sort((a, b) => {
    const am = labelFromMoodSlug(getPrimaryMoodSlug(a));
    const bm = labelFromMoodSlug(getPrimaryMoodSlug(b));
    if (am !== bm) return am.localeCompare(bm);

    const ac = String(a.categoryName || '');
    const bc = String(b.categoryName || '');
    if (ac !== bc) return ac.localeCompare(bc);

    const as = String(a.subcategoryName || '');
    const bs = String(b.subcategoryName || '');
    if (as !== bs) return as.localeCompare(bs);

    return String(a.itemName || '').localeCompare(String(b.itemName || ''));
  });

  const grouped = new Map();
  for (const item of sorted) {
    const moodSlug = getPrimaryMoodSlug(item);
    const moodLabel = labelFromMoodSlug(moodSlug);
    if (!grouped.has(moodLabel)) grouped.set(moodLabel, []);
    grouped.get(moodLabel).push(item);
  }

  let html = '';
  for (const [groupLabel, groupItems] of grouped.entries()) {
    html += `
      <tr class="mood-group-row">
        <td colspan="6">
          <div class="mood-group-head">
            <span class="mood-group-title"><i class="fas fa-layer-group"></i> ${escapeHtml(groupLabel)}</span>
            <span class="mood-group-count">${groupItems.length} item${groupItems.length === 1 ? '' : 's'}</span>
          </div>
        </td>
      </tr>
    `;

    html += groupItems.map(item => {
      const moodTags = (item.moods || []).map(slug => `<span class="mood-tag">${escapeHtml(labelFromMoodSlug(slug))}</span>`).join('');
      const statusCls = item.isEnabled ? 'on' : 'off';
      const statusTxt = item.isEnabled ? 'Live' : 'Hidden';
      const nutrition = `
        <span class="mood-metrics">
          <span>Cal: ${fmtNum(item.calories)}</span>
          <span>Protein: ${fmtNum(item.protein, 1)}g</span>
          <span>Prep: ${fmtNum(item.prepTime)}m</span>
        </span>
      `;

      return `
        <tr>
          <td>
            <div class="mood-item-meta">
              <strong>${escapeHtml(item.itemName || 'Unnamed')}</strong>
              <span>${escapeHtml(item.categoryName || '—')} / ${escapeHtml(item.subcategoryName || '—')} • ₹${fmtNum(item.price)}</span>
            </div>
          </td>
          <td><span class="mood-tag-list">${moodTags || '<span style="font-size:.72rem;color:var(--text-dim)">—</span>'}</span></td>
          <td>${escapeHtml((item.foodPreference || 'both').toUpperCase())}</td>
          <td>${nutrition}</td>
          <td><span class="mood-status-chip ${statusCls}">${statusTxt}</span></td>
          <td>
            <div class="mood-row-actions">
              <button class="btn-sm" onclick="openMoodModalEdit('${item._id}')"><i class="fas fa-pen"></i></button>
              <button class="btn-sm" onclick="toggleMoodItem('${item._id}')"><i class="fas fa-power-off"></i></button>
              <button class="btn-sm btn-danger" onclick="deleteMoodItem('${item._id}')"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  tbody.innerHTML = html;
}

function filterMoodItems() {
  const q = (document.getElementById('moodSearch')?.value || '').trim().toLowerCase();
  const all = adminState.moodItemsCache || [];

  if (!q) {
    renderMoodItemsTable(all);
    return;
  }

  const filtered = all.filter(item => {
    const hay = [
      item.itemName,
      item.categoryName,
      item.subcategoryName,
      item.foodPreference,
      ...(item.moods || []),
      ...(item.tags || []),
      item.shortReason,
    ].join(' ').toLowerCase();

    return hay.includes(q);
  });

  renderMoodItemsTable(filtered);
}

function syncMoodSourceIntoForm() {
  const selectedId = document.getElementById('moodSourceSelect')?.value;
  const source = (adminState.moodMenuSourceCache || []).find(s => String(s.menuItemId) === String(selectedId));
  const hint = document.getElementById('moodSourceHint');

  if (!source) {
    if (hint) hint.textContent = 'Choose from your menu to auto-fill item details.';
    return;
  }

  if (hint) {
    hint.textContent = `Selected: ${source.itemName} (${source.categoryName} / ${source.subcategoryName})`;
  }

  const editId = document.getElementById('moodEditId')?.value || '';
  if (!editId) {
    document.getElementById('moodItemName').value = source.itemName || '';
    document.getElementById('moodPrice').value = String(source.price || 0);
    if (!document.getElementById('moodImageUrl').value) {
      document.getElementById('moodImageUrl').value = source.image_url || '';
    }
  }
}

function openMoodModalCreate() {
  document.getElementById('moodModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Add Mood Item';
  document.getElementById('btnSaveMoodItem').innerHTML = '<i class="fas fa-save"></i> Save Mood Item';
  document.getElementById('moodEditId').value = '';
  document.getElementById('moodForm')?.reset();
  document.getElementById('moodSourceSelect').value = '';
  document.getElementById('moodItemEnabled').checked = true;
  renderMoodCheckboxes([]);
  document.getElementById('moodSourceHint').textContent = 'Choose from your menu to auto-fill item details.';
  document.getElementById('moodModalOverlay').style.display = 'flex';
  document.getElementById('moodItemName').focus();
}

function openMoodModalEdit(id) {
  const item = (adminState.moodItemsCache || []).find(x => String(x._id) === String(id));
  if (!item) {
    toast('Mood item not found', 'error');
    return;
  }

  document.getElementById('moodModalTitle').innerHTML = '<i class="fas fa-pen"></i> Edit Mood Item';
  document.getElementById('btnSaveMoodItem').innerHTML = '<i class="fas fa-save"></i> Update Mood Item';
  document.getElementById('moodEditId').value = String(item._id);

  renderMoodSourceSelect();
  renderMoodCheckboxes(item.moods || []);

  const sourceSelect = document.getElementById('moodSourceSelect');
  sourceSelect.value = item.menuItemId ? String(item.menuItemId) : '';

  document.getElementById('moodItemName').value = item.itemName || '';
  document.getElementById('moodPrice').value = String(item.price || 0);
  document.getElementById('moodFoodPreference').value = item.foodPreference || 'both';
  document.getElementById('moodCalories').value = String(item.calories ?? '');
  document.getElementById('moodProtein').value = String(item.protein ?? '');
  document.getElementById('moodPrepTime').value = String(item.prepTime ?? '');
  document.getElementById('moodTags').value = (item.tags || []).join(', ');
  document.getElementById('moodImageUrl').value = item.image_url || '';
  document.getElementById('moodShortReason').value = item.shortReason || '';
  document.getElementById('moodItemEnabled').checked = item.isEnabled !== false;

  syncMoodSourceIntoForm();
  document.getElementById('moodModalOverlay').style.display = 'flex';
  document.getElementById('moodItemName').focus();
}

function closeMoodModal() {
  if (_moodModalBusy) return;
  document.getElementById('moodModalOverlay').style.display = 'none';
}

async function saveMoodItemFromForm(e) {
  e.preventDefault();
  if (_moodModalBusy) return;

  const editId = document.getElementById('moodEditId').value.trim();
  const name = document.getElementById('moodItemName').value.trim();
  const price = Number(document.getElementById('moodPrice').value);
  const foodPreference = document.getElementById('moodFoodPreference').value;
  const calories = Number(document.getElementById('moodCalories').value || 0);
  const protein = Number(document.getElementById('moodProtein').value || 0);
  const prepTime = Number(document.getElementById('moodPrepTime').value || 0);
  const tags = parseMoodTags(document.getElementById('moodTags').value);
  const shortReason = document.getElementById('moodShortReason').value.trim();
  const image_url = document.getElementById('moodImageUrl').value.trim();
  const isEnabled = document.getElementById('moodItemEnabled').checked;
  const moods = getSelectedMoodSlugs();

  if (!name) {
    toast('Item name is required', 'error');
    return;
  }
  if (!Number.isFinite(price) || price < 0) {
    toast('Enter a valid non-negative price', 'error');
    return;
  }
  if (!moods.length) {
    toast('Please select at least one enabled mood category', 'error');
    return;
  }

  const selectedMenuItemId = document.getElementById('moodSourceSelect').value;
  const src = (adminState.moodMenuSourceCache || []).find(s => String(s.menuItemId) === String(selectedMenuItemId));

  const payload = {
    menuItemId: src ? src.menuItemId : null,
    menuCategoryId: src ? src.menuCategoryId : null,
    menuSubcategoryId: src ? src.menuSubcategoryId : null,
    categoryName: src ? src.categoryName : '',
    subcategoryName: src ? src.subcategoryName : '',
    itemName: name,
    image_url: image_url || (src?.image_url || ''),
    price,
    foodPreference,
    moods,
    calories: Number.isFinite(calories) ? Math.max(0, calories) : 0,
    protein: Number.isFinite(protein) ? Math.max(0, protein) : 0,
    prepTime: Number.isFinite(prepTime) ? Math.max(0, prepTime) : 0,
    tags,
    shortReason,
    isEnabled,
  };

  const btn = document.getElementById('btnSaveMoodItem');
  _moodModalBusy = true;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    let res;
    if (editId) {
      res = await apiFetch('/mood/admin/items/' + editId, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      res = await apiFetch('/mood/admin/items', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    if (!res.success) {
      toast(res.message || 'Failed to save mood item', 'error');
      return;
    }

    toast(editId ? 'Mood item updated' : 'Mood item created', 'success');
    closeMoodModal();
    await loadMoodManagement();
  } catch (err) {
    toast(err.message || 'Failed to save mood item', 'error');
  } finally {
    _moodModalBusy = false;
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save Mood Item';
  }
}

async function toggleMoodItem(id) {
  try {
    const res = await apiFetch('/mood/admin/items/' + id + '/toggle', { method: 'PATCH' });
    if (!res.success) {
      toast(res.message || 'Failed to toggle mood item', 'error');
      return;
    }
    toast('Mood item status updated', 'success');
    await loadMoodManagement();
  } catch (e) {
    toast('Failed to toggle mood item', 'error');
  }
}

async function deleteMoodItem(id) {
  if (!confirm('Delete this mood mapping item? This action cannot be undone.')) return;

  try {
    const res = await apiFetch('/mood/admin/items/' + id, { method: 'DELETE' });
    if (!res.success) {
      toast(res.message || 'Failed to delete mood item', 'error');
      return;
    }
    toast('Mood item deleted', 'success');
    await loadMoodManagement();
  } catch (e) {
    toast('Failed to delete mood item', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('moodSourceSelect')?.addEventListener('change', syncMoodSourceIntoForm);
  document.getElementById('moodForm')?.addEventListener('submit', saveMoodItemFromForm);
});

window.loadMoodManagement = loadMoodManagement;
window.filterMoodItems = filterMoodItems;
window.toggleMoodCategory = toggleMoodCategory;
window.openMoodModalCreate = openMoodModalCreate;
window.openMoodModalEdit = openMoodModalEdit;
window.closeMoodModal = closeMoodModal;
window.toggleMoodItem = toggleMoodItem;
window.deleteMoodItem = deleteMoodItem;

/* ═══════════ TIME-BASED SCHEDULE ═══════════ */
function getActiveSlot() {
  const h = new Date().getHours();
  return TIME_SCHEDULE.find(s => h >= s.start && h < s.end) || null;
}

function getScheduleSlotByLabel(label) {
  if (!label) return null;
  return TIME_SCHEDULE.find(s => s.label === label) || null;
}

function getSelectedScheduleSlot() {
  if (!adminState.autoSchedule && _manualScheduleSlotLabel) {
    return getScheduleSlotByLabel(_manualScheduleSlotLabel) || null;
  }
  return getActiveSlot();
}

function getEnabledCategoriesForSlot(slot) {
  if (!slot) return new Set();

  const allTime = MAIN_CATEGORIES['All Time'] || [];

  // Requirement: Dinner should show only dinner categories.
  if (slot.label === 'Dinner') {
    return new Set(MAIN_CATEGORIES['Dinner'] || slot.enable || []);
  }

  // Requirement: Breakfast/Lunch/Snacks should include All Time + active slot categories.
  const slotCategories = MAIN_CATEGORIES[slot.label] || slot.enable || [];
  return new Set([...allTime, ...slotCategories]);
}

function renderScheduleBanner() {
  const el = document.getElementById('menuScheduleBanner');
  if (!el) return;
  const now   = new Date();
  const h     = now.getHours();
  const m     = now.getMinutes().toString().padStart(2, '0');
  const h12   = h % 12 || 12;
  const period = h >= 12 ? 'PM' : 'AM';
  const active = getSelectedScheduleSlot();
  const autoOn = adminState.autoSchedule;

  el.innerHTML = `
  <div class="sched-banner">
    <div class="sched-left">
      <div class="sched-time"><i class="fas fa-clock"></i> ${h12}:${m} ${period}</div>
      ${active
        ? `<span class="sched-active-pill" style="--sc:${active.color}"><i class="fas ${active.icon}"></i>&nbsp;${active.label} ${autoOn ? 'Active' : 'Manual'}</span>`
        : `<span class="sched-active-pill closed"><i class="fas fa-door-closed"></i>&nbsp;Kitchen Closed (11PM–7AM)</span>`}
    </div>
    <div class="sched-slots">
      ${TIME_SCHEDULE.map(s => `
        <div class="sched-slot ${active?.label === s.label ? 'is-active' : ''}" style="--sc:${s.color}" onclick="selectScheduleSlot('${s.label}')" title="Apply ${s.label} menu now">
          <i class="fas ${s.icon}"></i>
          <span class="sched-slot-lbl">${s.label}</span>
          <span class="sched-slot-t">${s.time}</span>
        </div>`).join('')}
    </div>
    <div class="sched-controls">
      <label class="sched-auto-wrap" title="Auto-enable & disable categories by time slot">
        <span>Auto-Schedule</span>
        <label class="switch">
          <input type="checkbox" id="autoScheduleToggle" ${autoOn ? 'checked' : ''}
                 onchange="toggleAutoSchedule(this.checked)">
          <span class="slider"></span>
        </label>
      </label>
      <button class="btn-sched-apply" onclick="applyTimeSchedule()">
        <i class="fas fa-wand-magic-sparkles"></i> Apply Now
      </button>
    </div>
  </div>`;
}

async function applyTimeSchedule(slotLabel = null) {
  if (_isApplyingSchedule) return;
  _isApplyingSchedule = true;

  const slot      = slotLabel ? getScheduleSlotByLabel(slotLabel) : getSelectedScheduleSlot();
  const enableSet = getEnabledCategoriesForSlot(slot);
  try {
    const res = await apiFetch('/admin/category-menus');
    if (!res.success) {
      _isApplyingSchedule = false;
      return;
    }

    // Only update categories whose availability actually changes.
    const toUpdate = res.data.filter(c => {
      const desired = enableSet.has(c.category);
      return c.availability !== desired;
    });

    if (toUpdate.length) {
      // Run updates independently so one failure doesn't abort others.
      await Promise.allSettled(toUpdate.map(c =>
      apiFetch(`/admin/category-menus/${c._id}/set-availability`, {
        method: 'PATCH',
        body: JSON.stringify({ availability: enableSet.has(c.category) })
      })
      ));
    }

    const fresh = await apiFetch('/admin/category-menus');
    if (fresh.success) adminState.menuCache = fresh.data;
    renderCategoryMenu(adminState.menuCache);
    renderMenuStats(adminState.menuCache);
    renderScheduleBanner();
    toast(slot ? `${slot.label} schedule applied${toUpdate.length ? '' : ' (no changes needed)'}` : 'Kitchen closed — all categories disabled', 'success');
  } catch (e) { console.error('Schedule apply error', e); toast('Failed to apply schedule', 'error'); }
  finally { _isApplyingSchedule = false; }
}

async function selectScheduleSlot(slotLabel) {
  const slot = getScheduleSlotByLabel(slotLabel);
  if (!slot) return;

  // Manual selection turns off auto mode so admin intent is preserved.
  if (adminState.autoSchedule) {
    adminState.autoSchedule = false;
  }
  if (window._scheduleWatcherTimer) {
    clearInterval(window._scheduleWatcherTimer);
    window._scheduleWatcherTimer = null;
    window._lastSlotLabel = null;
  }

  _manualScheduleSlotLabel = slotLabel;
  renderScheduleBanner();
  await applyTimeSchedule(slotLabel);
}
window.selectScheduleSlot = selectScheduleSlot;

function startScheduleWatcher() {
  if (window._scheduleWatcherTimer) clearInterval(window._scheduleWatcherTimer);
  window._lastSlotLabel = null;

  function tick() {
    const slot  = getActiveSlot();
    const label = slot ? slot.label : '__closed__';
    // Apply schedule only when the slot changes
    if (label !== window._lastSlotLabel) {
      window._lastSlotLabel = label;
      applyTimeSchedule();
    } else {
      renderScheduleBanner(); // keep the clock ticking
    }
  }
  tick();
  window._scheduleWatcherTimer = setInterval(tick, 60000); // check every minute
}

function toggleAutoSchedule(enabled) {
  adminState.autoSchedule = enabled;
  if (enabled) {
    _manualScheduleSlotLabel = null;
    startScheduleWatcher();
    toast('Auto-schedule ON — categories will switch automatically by time', 'success');
  } else {
    if (window._scheduleWatcherTimer) {
      clearInterval(window._scheduleWatcherTimer);
      window._scheduleWatcherTimer = null;
      window._lastSlotLabel = null;
    }
    if (!_manualScheduleSlotLabel) {
      const current = getActiveSlot();
      _manualScheduleSlotLabel = current?.label || 'Breakfast';
    }
    renderScheduleBanner();
    toast('Auto-schedule OFF — you can toggle categories manually', 'info');
  }
}
window.toggleAutoSchedule  = toggleAutoSchedule;
window.applyTimeSchedule   = applyTimeSchedule;

/* ═══════════ ORDERS ═══════════ */
async function loadOrders() {
  try {
    const res = await apiFetch('/admin/orders');
    if (!res.success) return;
    adminState.ordersCache = res.data;
    updatePendingBadge();
    filterOrders();
  } catch (e) { console.error('Orders load error', e); }
}

function renderOrdersTable(orders) {
  const body = document.getElementById('ordersBody');
  if (!body) return;
  if (!orders.length) {
    body.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-dim)">No orders found</td></tr>`;
    return;
  }
  body.innerHTML = orders.map(o => {
    const isPlaced        = o.status === 'placed';
    const isRejectable    = ['placed','confirmed'].includes(o.status);
    const hasCancelReq    = o.cancelRequest && o.cancelRequest.status === 'pending';
    const hasRefundReq    = o.refund && o.refund.status === 'requested';
    const reviewedCount   = (o.items || []).filter(i => i.review && i.review.rating).length;

    let actionBtns = '';
    if (hasCancelReq) {
      // Cancel request awaiting review — show approve/reject cancel request buttons
      actionBtns = `
        <button class="btn-approve" onclick="approveCancelAdmin('${o.orderId}')" title="Approve cancellation">
          <i class="fas fa-check-circle"></i> Approve Cancel
        </button>
        <button class="btn-reject" onclick="rejectCancelAdmin('${o.orderId}')" title="Reject cancellation">
          <i class="fas fa-times-circle"></i> Reject Cancel
        </button>`;
    } else if (isPlaced) {
      actionBtns = `
        <button class="btn-approve" onclick="approveOrderAdmin('${o.orderId}')"><i class="fas fa-check"></i> Approve</button>
        <button class="btn-reject"  onclick="rejectOrderAdminPrompt('${o.orderId}')"><i class="fas fa-times"></i> Reject</button>`;
    } else if (isRejectable) {
      actionBtns = `<button class="btn-reject btn-reject-sm" onclick="rejectOrderAdminPrompt('${o.orderId}')"><i class="fas fa-ban"></i> Cancel</button>`;
    } else {
      actionBtns = `<span style="color:var(--text-dim);font-size:.78rem">—</span>`;
    }

    if (hasRefundReq) {
      actionBtns += `
        <button class="btn-approve" onclick="approveRefundAdmin('${o.orderId}')" title="Approve refund">
          <i class="fas fa-circle-check"></i> Approve Refund
        </button>
        <button class="btn-reject" onclick="rejectRefundAdmin('${o.orderId}')" title="Reject refund">
          <i class="fas fa-circle-xmark"></i> Reject Refund
        </button>
        <button class="btn-approve" style="background:#0ea5e9" onclick="processRefundAdmin('${o.orderId}')" title="Mark refund processed">
          <i class="fas fa-money-bill-transfer"></i> Mark Processed
        </button>`;
    }

    // Cancel request reason badge
    const cancelReqHtml = hasCancelReq
      ? `<div style="margin-top:4px;font-size:.72rem;color:#f59e0b;background:rgba(245,158,11,.13);
                     border:1px solid rgba(245,158,11,.3);border-radius:6px;padding:3px 7px;max-width:200px;
                     white-space:normal;word-break:break-word">
           <i class="fas fa-hourglass-half"></i> <strong>Cancel Request:</strong> ${o.cancelRequest.reason}
         </div>`
      : '';

    const cookingNoteHtml = o.cookingInstructions
      ? `<div style="margin-top:6px;font-size:.72rem;color:#f59e0b;background:rgba(245,158,11,.1);
                     border:1px solid rgba(245,158,11,.25);border-radius:6px;padding:4px 7px;
                     max-width:240px;white-space:normal;word-break:break-word">
           <i class="fas fa-pepper-hot"></i> <strong>Cooking Note:</strong> ${escapeHtml(o.cookingInstructions)}
         </div>`
      : '';

    return `
    <tr class="${isPlaced || hasCancelReq ? 'row-pending' : ''}">
      <td><strong>${o.orderId}</strong></td>
      <td>${o.user?.name || 'Unknown'}<br><small style="color:var(--text-dim)">${o.user?.email || ''}</small></td>
      <td style="max-width:200px;white-space:normal">
        ${o.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
        ${reviewedCount > 0 ? `<div style="margin-top:4px;font-size:.72rem;color:#22c55e">⭐ ${reviewedCount} item review${reviewedCount > 1 ? 's' : ''}</div>` : ''}
        ${cookingNoteHtml}
        ${cancelReqHtml}
      </td>
      <td>${o.paymentMethod.toUpperCase()}</td>
      <td>₹${o.total}</td>
      <td>
        <span class="status-badge sb-${o.status}">${o.status.replace(/_/g,' ')}</span>
        ${hasCancelReq ? `<br><span class="status-badge" style="background:rgba(245,158,11,.2);color:#f59e0b;margin-top:4px;display:inline-block">⏳ Cancel Req</span>` : ''}
        ${hasRefundReq ? `<br><span class="status-badge" style="background:rgba(59,130,246,.2);color:#3b82f6;margin-top:4px;display:inline-block">💸 Refund Req</span>` : ''}
        ${o.refund && o.refund.status && o.refund.status !== 'none' && !hasRefundReq ? `<br><span class="status-badge" style="background:rgba(34,197,94,.2);color:#22c55e;margin-top:4px;display:inline-block">Refund: ${o.refund.status}</span>` : ''}
      </td>
      <td>${formatTimeShort(o.createdAt)}</td>
      <td class="order-actions">${actionBtns}</td>
    </tr>`;
  }).join('');
}

function filterOrders() {
  const q = document.getElementById('orderSearch')?.value.trim().toLowerCase() || '';
  const f = adminState.orderFilter;
  const activeStatuses = ['confirmed','preparing','out_for_delivery'];

  let filtered = adminState.ordersCache.filter(o => {
    if (f === 'cancel_requests') return o.cancelRequest && o.cancelRequest.status === 'pending';
    if (f === 'refund_requests') return o.refund && o.refund.status === 'requested';
    if (f === 'placed')    return o.status === 'placed';
    if (f === 'active')    return activeStatuses.includes(o.status);
    if (f === 'completed') return o.status === 'delivered';
    if (f === 'cancelled') return o.status === 'cancelled';
    return true; // 'all'
  });

  if (q) {
    filtered = filtered.filter(o =>
      o.orderId.toLowerCase().includes(q) ||
      (o.user?.name  || '').toLowerCase().includes(q) ||
      (o.user?.email || '').toLowerCase().includes(q) ||
      o.status.includes(q)
    );
  }

  renderOrdersTable(filtered);
}

function setOrderFilter(filter) {
  adminState.orderFilter = filter;
  // Update tab active state
  document.querySelectorAll('.oft-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.filter === filter)
  );
  filterOrders();
}

async function approveOrderAdmin(orderId) {
  if (!confirm(`Approve order ${orderId}?`)) return;
  try {
    const res = await apiFetch(`/orders/${orderId}/approve`, { method: 'PATCH' });
    if (!res.success) { showToast(res.message || 'Approve failed', 'error'); return; }
    showToast(`\u2705 Order ${orderId} approved \u2014 delivery pipeline started!`, 'success');
    await loadOrders(); // updatePendingBadge inside will stop alert if no more pending
  } catch (e) { showToast('Server error', 'error'); }
}

async function rejectOrderAdminPrompt(orderId) {
  const reason = prompt(`Reason for rejecting order ${orderId} (optional):`) ?? null;
  if (reason === null) return; // user cancelled
  try {
    const res = await apiFetch(`/orders/${orderId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    });
    if (!res.success) { showToast(res.message || 'Reject failed', 'error'); return; }
    showToast(`\u274c Order ${orderId} rejected.`, 'error');
    await loadOrders(); // updatePendingBadge inside will stop alert if no more pending
  } catch (e) { showToast('Server error', 'error'); }
}

async function approveCancelAdmin(orderId) {
  if (!confirm(`Approve cancel request for order ${orderId}?\nThis will cancel the order and notify the customer.`)) return;
  try {
    const res = await apiFetch(`/orders/${orderId}/cancel-request/approve`, { method: 'PATCH' });
    if (!res.success) { showToast(res.message || 'Failed to approve cancel request', 'error'); return; }
    showToast(`✅ Cancel request for ${orderId} approved — order cancelled & customer notified.`, 'success');
    await loadOrders();
  } catch (e) { showToast('Server error', 'error'); }
}

async function rejectCancelAdmin(orderId) {
  if (!confirm(`Reject cancel request for order ${orderId}?\nThe customer will be told their order is almost ready.`)) return;
  try {
    const res = await apiFetch(`/orders/${orderId}/cancel-request/reject`, { method: 'PATCH' });
    if (!res.success) { showToast(res.message || 'Failed to reject cancel request', 'error'); return; }
    showToast(`🔥 Cancel request for ${orderId} rejected — customer notified order is almost ready.`, 'info');
    await loadOrders();
  } catch (e) { showToast('Server error', 'error'); }
}

async function approveRefundAdmin(orderId) {
  if (!confirm(`Approve refund request for order ${orderId}?`)) return;
  try {
    const adminNote = prompt('Optional note for customer (leave empty for default):') || '';
    const res = await apiFetch(`/orders/${orderId}/refund/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ adminNote })
    });
    if (!res.success) { showToast(res.message || 'Failed to approve refund', 'error'); return; }
    showToast(`✅ Refund approved for ${orderId}`, 'success');
    await loadOrders();
    if (adminState.section === 'reviews') await loadReviews();
  } catch (e) { showToast('Server error', 'error'); }
}

async function rejectRefundAdmin(orderId) {
  if (!confirm(`Reject refund request for order ${orderId}?`)) return;
  try {
    const adminNote = prompt('Reason for rejecting refund (optional):') || '';
    const res = await apiFetch(`/orders/${orderId}/refund/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ adminNote })
    });
    if (!res.success) { showToast(res.message || 'Failed to reject refund', 'error'); return; }
    showToast(`❌ Refund rejected for ${orderId}`, 'error');
    await loadOrders();
    if (adminState.section === 'reviews') await loadReviews();
  } catch (e) { showToast('Server error', 'error'); }
}

async function processRefundAdmin(orderId) {
  if (!confirm(`Mark refund as processed for order ${orderId}?`)) return;
  try {
    const adminNote = prompt('Optional transaction/reference note:') || '';
    const res = await apiFetch(`/orders/${orderId}/refund/process`, {
      method: 'PATCH',
      body: JSON.stringify({ adminNote })
    });
    if (!res.success) { showToast(res.message || 'Failed to process refund', 'error'); return; }
    showToast(`💸 Refund processed for ${orderId}`, 'success');
    await loadOrders();
    if (adminState.section === 'reviews') await loadReviews();
  } catch (e) { showToast('Server error', 'error'); }
}

window.approveCancelAdmin      = approveCancelAdmin;
window.rejectCancelAdmin       = rejectCancelAdmin;
window.approveRefundAdmin      = approveRefundAdmin;
window.rejectRefundAdmin       = rejectRefundAdmin;
window.processRefundAdmin      = processRefundAdmin;


function updatePendingBadge() {
  const count = adminState.ordersCache.filter(o => o.status === 'placed').length;
  const cancelReqCount = adminState.ordersCache.filter(
    o => o.cancelRequest && o.cancelRequest.status === 'pending'
  ).length;
  const refundReqCount = adminState.ordersCache.filter(
    o => o.refund && o.refund.status === 'requested'
  ).length;

  const badge  = document.getElementById('sbPendingBadge');
  const tabCnt = document.getElementById('pendingTabCount');
  const banner = document.getElementById('pendingAlertBanner');
  const bannerTxt = document.getElementById('pendingAlertText');
  const cancelReqBadge = document.getElementById('cancelReqTabCount');
  const refundReqBadge = document.getElementById('refundReqTabCount');

  if (badge)  { badge.textContent = count; badge.style.display = count > 0 ? 'inline-flex' : 'none'; }
  if (tabCnt) tabCnt.textContent = count;
  if (cancelReqBadge) {
    cancelReqBadge.textContent = cancelReqCount;
    cancelReqBadge.style.display = cancelReqCount > 0 ? 'inline-flex' : 'none';
  }
  if (refundReqBadge) {
    refundReqBadge.textContent = refundReqCount;
    refundReqBadge.style.display = refundReqCount > 0 ? 'inline-flex' : 'none';
  }
  if (banner) {
    const total = count + cancelReqCount + refundReqCount;
    banner.style.display = total > 0 ? 'flex' : 'none';
    if (bannerTxt) {
      const parts = [];
      if (count > 0)          parts.push(`${count} order${count !== 1 ? 's' : ''} waiting for approval`);
      if (cancelReqCount > 0) parts.push(`${cancelReqCount} cancel request${cancelReqCount !== 1 ? 's' : ''} pending`);
      if (refundReqCount > 0) parts.push(`${refundReqCount} refund request${refundReqCount !== 1 ? 's' : ''} pending`);
      bannerTxt.textContent = parts.join(' · ') + '!';
    }
  }
  // Drive the persistent alert loop
  if (count > 0) startPendingAlert();
  else           stopPendingAlert();
}

/* ═══════════════════════════════════════════
   IPHONE-STYLE NOTIFICATION SOUND
   Tri-tone chime: F#5 → Bb5 → F#6
   Clean 4ms attack + exponential bell decay
═══════════════════════════════════════════ */
function iPhoneChime(vol = 0.5) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t   = ctx.currentTime;
    const tone = (freq, when, dur, v) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      // Add a second harmonic for a richer bell tone
      const osc2  = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc.connect(gain);   gain.connect(ctx.destination);
      osc2.connect(gain2); gain2.connect(ctx.destination);
      osc.type  = 'sine'; osc.frequency.value  = freq;
      osc2.type = 'sine'; osc2.frequency.value = freq * 2;   // octave harmonic
      // Percussive envelope: instant attack, smooth bell decay
      [gain, gain2].forEach((g, i) => {
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(i === 0 ? v : v * 0.22, when + 0.004);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
      });
      osc.start(when);  osc.stop(when  + dur + 0.02);
      osc2.start(when); osc2.stop(when + dur + 0.02);
    };
    // iPhone tri-tone: three ascending notes
    tone(740,  t,        0.22, vol);   // F#5
    tone(932,  t + 0.14, 0.20, vol);   // Bb5
    tone(1480, t + 0.28, 0.34, vol);   // F#6  ← the iconic high note
  } catch { /* audio blocked by browser policy */ }
}

/* ══════════════════════════════════
   PERSISTENT PENDING ALERT SOUND
   Loops every 4 s until all pending
   orders are approved / rejected.
══════════════════════════════════ */
let _pendingAlertTimer  = null;
let _pendingAudioCtx    = null;

function _beepPattern() {
  iPhoneChime(0.45); // reuse iPhone chime for the loop
}

function startPendingAlert() {
  if (_pendingAlertTimer) return;           // already running
  _beepPattern();                           // play immediately
  _pendingAlertTimer = setInterval(_beepPattern, 4000); // then every 4 s
  // Show mute button in banner
  const btn = document.getElementById('mutePendingSound');
  if (btn) btn.style.display = 'inline-flex';
}

function stopPendingAlert() {
  if (_pendingAlertTimer) { clearInterval(_pendingAlertTimer); _pendingAlertTimer = null; }
  try { if (_pendingAudioCtx) { _pendingAudioCtx.close(); _pendingAudioCtx = null; } } catch {}
  const btn = document.getElementById('mutePendingSound');
  if (btn) btn.style.display = 'none';
}

// Legacy one-shot sound kept for non-pending events (new user joins, etc.)
function playOrderSound() { iPhoneChime(0.35); }

/* ═══════════ ACTIVITIES ═══════════ */
async function loadActivities() {
  try {
    const res = await apiFetch('/admin/activities');
    if (!res.success) return;
    const feed = document.getElementById('activityFeed');
    if (!feed) return;

    feed.innerHTML = res.data.map(a => {
      const iconClass = a.type === 'order' ? 'act-order' : a.type === 'user' ? 'act-user' : 'act-status';
      const icon = a.type === 'order' ? 'fa-receipt' : a.type === 'user' ? 'fa-user-plus' : 'fa-exchange-alt';
      return `
        <div class="act-item">
          <div class="act-icon ${iconClass}"><i class="fas ${icon}"></i></div>
          <div class="act-msg">${a.message}</div>
          <div class="act-time">${formatTimeShort(a.time)}</div>
        </div>`;
    }).join('');
  } catch (e) { console.error('Activities load error', e); }
}

/* ═══════════ ANALYTICS ═══════════ */
async function loadAnalytics() {
  try {
    const res = await apiFetch('/admin/analytics');
    if (!res.success) return;
    const d = res.data;

    // KPIs
    const kpi = document.getElementById('analyticsKpi');
    if (kpi) {
      kpi.innerHTML = `
        <div class="kpi-card"><div class="kpi-val">₹${d.avgOrderValue}</div><div class="kpi-label">Avg Order Value</div></div>
        <div class="kpi-card"><div class="kpi-val">${d.topItems.length}</div><div class="kpi-label">Unique Items Sold</div></div>
        <div class="kpi-card"><div class="kpi-val">${Object.values(d.byPayment).reduce((s,v) => s+v.count, 0)}</div><div class="kpi-label">Total Transactions</div></div>
        <div class="kpi-card"><div class="kpi-val">${d.userGrowth.reduce((s,v) => s+v.count, 0)}</div><div class="kpi-label">New Users (30d)</div></div>
      `;
    }

    // Revenue Trend
    const revLabels = d.dailyRevenue.map(x => x._id.slice(5));
    const revData   = d.dailyRevenue.map(x => x.revenue);
    makeChart('chartRevenueTrend', 'line', revLabels, [{ label: 'Revenue ₹', data: revData, borderColor: '#FF5E00', backgroundColor: 'rgba(255,94,0,.1)', fill: true, tension: .4 }]);

    // By Hour
    const hourLabels = d.byHour.map(x => `${x._id}:00`);
    const hourData   = d.byHour.map(x => x.count);
    makeChart('chartByHour', 'bar', hourLabels, [{ label: 'Orders', data: hourData, backgroundColor: '#3b82f6' }]);

    // Top Items
    const itemLabels = d.topItems.map(x => x._id);
    const itemData   = d.topItems.map(x => x.count);
    makeChart('chartTopItems', 'bar', itemLabels, [{ label: 'Quantity Sold', data: itemData, backgroundColor: '#22c55e' }], {}, true);

    // Payment methods
    const payLabels = Object.keys(d.byPayment).map(k => k.toUpperCase());
    const payData   = Object.values(d.byPayment).map(v => v.count);
    makeChart('chartPayments', 'doughnut', payLabels, [{ data: payData, backgroundColor: ['#FF5E00','#3b82f6','#a855f7','#22c55e'] }], { cutout: '55%' });
  } catch (e) { console.error('Analytics load error', e); }
}

/* ═══════════ FEEDBACK ═══════════ */
let _allFeedbacks = [];

async function loadFeedbacks() {
  const container = document.getElementById('feedbackList');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center;color:var(--text-dim);padding:40px"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Loading messages…</p></div>`;
  try {
    const data = await apiFetch('/admin/feedback');
    _allFeedbacks = data.data || [];

    // Update sidebar badge with unread count
    const badge = document.getElementById('sbFeedbackBadge');
    if (badge) {
      if (data.unreadCount > 0) {
        badge.textContent = data.unreadCount;
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    }

    renderFeedbackList(_allFeedbacks);
  } catch (e) {
    container.innerHTML = `<div style="text-align:center;color:var(--danger);padding:40px"><i class="fas fa-exclamation-triangle"></i> Failed to load messages.</div>`;
    console.error('Feedback load error', e);
  }
}

function filterFeedbacks() {
  const filter = document.getElementById('feedbackStatusFilter')?.value || 'all';
  const filtered = filter === 'all' ? _allFeedbacks : _allFeedbacks.filter(f => f.status === filter);
  renderFeedbackList(filtered);
}

function renderFeedbackList(list) {
  const container = document.getElementById('feedbackList');
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `<div style="text-align:center;color:var(--text-dim);padding:60px">
      <i class="fas fa-inbox fa-3x" style="opacity:.3;margin-bottom:12px"></i>
      <p>No messages found.</p>
    </div>`;
    return;
  }

  const statusColors = { unread: '#e74c3c', read: '#3b82f6', replied: '#22c55e' };
  const statusIcons  = { unread: 'envelope', read: 'envelope-open', replied: 'check-circle' };

  container.innerHTML = list.map(fb => {
    const color = statusColors[fb.status] || '#888';
    const icon  = statusIcons[fb.status] || 'envelope';
    const date  = new Date(fb.createdAt).toLocaleString();
    return `
    <div class="feedback-card ${fb.status === 'unread' ? 'fb-unread' : ''}" id="fbCard_${fb._id}">
      <div class="fb-header">
        <div class="fb-sender">
          <div class="fb-avatar">${fb.name.charAt(0).toUpperCase()}</div>
          <div>
            <div class="fb-name">${fb.name}</div>
            <div class="fb-meta">${fb.email}${fb.phone ? ' &bull; ' + fb.phone : ''}</div>
          </div>
        </div>
        <div class="fb-right">
          <span class="fb-status-badge" style="background:${color}20;color:${color};border-color:${color}40">
            <i class="fas fa-${icon}"></i> ${fb.status.charAt(0).toUpperCase() + fb.status.slice(1)}
          </span>
          <span class="fb-date">${date}</span>
        </div>
      </div>
      <div class="fb-subject">📌 ${fb.subject}</div>
      <div class="fb-message">${fb.message}</div>
      <div class="fb-actions">
        ${fb.status !== 'read'    ? `<button class="btn-sm btn-approve" onclick="updateFbStatus('${fb._id}','read')"><i class="fas fa-envelope-open"></i> Mark Read</button>` : ''}
        ${fb.status !== 'replied' ? `<button class="btn-sm btn-approve" onclick="updateFbStatus('${fb._id}','replied')"><i class="fas fa-check-circle"></i> Mark Replied</button>` : ''}
        ${fb.status !== 'unread'  ? `<button class="btn-sm btn-reject-sm" onclick="updateFbStatus('${fb._id}','unread')"><i class="fas fa-undo"></i> Mark Unread</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function updateFbStatus(id, status) {
  try {
    await apiFetch(`/admin/feedback/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    toast(`Marked as ${status}`, 'success');
    loadFeedbacks();
  } catch (e) {
    toast('Failed to update status', 'error');
  }
}

/* ═══════════ REVIEWS ═══════════ */
let _allReviews = [];
let _allRefundRequests = [];

async function loadReviews() {
  const container = document.getElementById('reviewList');
  const refundContainer = document.getElementById('refundRequestList');
  const summary = document.getElementById('reviewSummary');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center;color:var(--text-dim);padding:40px"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Loading reviews...</p></div>`;
  if (refundContainer) {
    refundContainer.innerHTML = `<div style="text-align:center;color:var(--text-dim);padding:24px"><i class="fas fa-spinner fa-spin"></i><p>Loading refund requests...</p></div>`;
  }

  try {
    const res = await apiFetch('/admin/reviews');
    if (!res.success) throw new Error(res.message || 'Failed to load reviews');

    _allReviews = Array.isArray(res.data) ? res.data : [];
    _allRefundRequests = Array.isArray(res.refundRequests) ? res.refundRequests : [];
    adminState.reviewsCache = _allReviews;

    const stats = res.summary || {};
    if (summary) {
      summary.innerHTML = `
        <div class="review-stat-card">
          <span class="review-stat-label">Total Reviews</span>
          <span class="review-stat-val">${stats.total || 0}</span>
        </div>
        <div class="review-stat-card">
          <span class="review-stat-label">Avg Rating</span>
          <span class="review-stat-val">${Number(stats.avgRating || 0).toFixed(2)} <small>/ 5</small></span>
        </div>
        <div class="review-stat-card">
          <span class="review-stat-label">With Photos</span>
          <span class="review-stat-val">${stats.withPhotos || 0}</span>
        </div>
        <div class="review-stat-card">
          <span class="review-stat-label">Refund Requests</span>
          <span class="review-stat-val">${stats.refundRequested || 0}</span>
        </div>
      `;
    }

    const badge = document.getElementById('sbReviewBadge');
    if (badge) {
      const count = _allReviews.length;
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    }

    filterReviews();
    renderRefundRequestList(_allRefundRequests);
  } catch (e) {
    if (summary) summary.innerHTML = '';
    if (refundContainer) {
      refundContainer.innerHTML = `<div style="text-align:center;color:var(--danger);padding:24px"><i class="fas fa-exclamation-triangle"></i> Failed to load refund requests.</div>`;
    }
    container.innerHTML = `<div style="text-align:center;color:var(--danger);padding:40px"><i class="fas fa-exclamation-triangle"></i> Failed to load reviews.</div>`;
    console.error('Reviews load error', e);
  }
}

function filterReviews() {
  const ratingFilter = document.getElementById('reviewRatingFilter')?.value || 'all';
  const photoFilter = document.getElementById('reviewPhotoFilter')?.value || 'all';
  const query = (document.getElementById('reviewSearch')?.value || '').trim().toLowerCase();

  const filtered = _allReviews.filter(r => {
    if (ratingFilter !== 'all' && Number(r.rating) !== Number(ratingFilter)) return false;
    const hasPhotos = Array.isArray(r.photoUrls) && r.photoUrls.length > 0;
    if (photoFilter === 'with-photos' && !hasPhotos) return false;
    if (photoFilter === 'without-photos' && hasPhotos) return false;
    if (!query) return true;

    return [
      r.orderId,
      r.itemName,
      r.comment,
      r.user?.name,
      r.user?.email
    ].some(v => String(v || '').toLowerCase().includes(query));
  });

  renderReviewList(filtered);
}

function renderReviewList(list) {
  const container = document.getElementById('reviewList');
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `<div style="text-align:center;color:var(--text-dim);padding:60px"><i class="fas fa-star fa-3x" style="opacity:.2;margin-bottom:12px"></i><p>No reviews found for selected filters.</p></div>`;
    return;
  }

  container.innerHTML = list.map(rv => {
    const comment = escapeHtml(rv.comment || '');
    const userName = escapeHtml(rv.user?.name || 'Unknown');
    const userEmail = escapeHtml(rv.user?.email || '');
    const itemName = escapeHtml(rv.itemName || 'Item');
    const orderId = escapeHtml(rv.orderId || '');
    const itemImage = escapeHtml(rv.itemImage || '');
    const orderRef = String(rv.orderRef || '');
    const itemIndex = Number(rv.itemIndex);
    const photos = Array.isArray(rv.photoUrls) ? rv.photoUrls : [];
    const stars = '★'.repeat(Math.max(0, Number(rv.rating) || 0)) + '☆'.repeat(Math.max(0, 5 - (Number(rv.rating) || 0)));
    const canDelete = !!orderRef && Number.isInteger(itemIndex) && itemIndex >= 0;

    return `
      <article class="review-card">
        <header class="review-head">
          <div class="review-user">
            <div class="review-avatar">${userName.charAt(0).toUpperCase()}</div>
            <div>
              <div class="review-name">${userName}</div>
              <div class="review-meta">${userEmail || 'No email'} • Order ${orderId}</div>
            </div>
          </div>
          <div class="review-rating-wrap">
            <div class="review-stars" title="${Number(rv.rating) || 0} out of 5">${stars}</div>
            <div class="review-date">${formatTimeShort(rv.reviewedAt)}</div>
          </div>
        </header>

        <div class="review-item-row">
          ${itemImage ? `<img src="${itemImage}" alt="${itemName}" class="review-item-img" onerror="this.style.display='none'" />` : ''}
          <div>
            <div class="review-item-name">${itemName}</div>
            <div class="review-item-sub">Qty: ${Number(rv.quantity) || 1} • ${String(rv.orderStatus || '').replace(/_/g, ' ')}</div>
          </div>
        </div>

        ${comment ? `<p class="review-comment">${comment}</p>` : '<p class="review-comment review-comment-empty">No written comment provided.</p>'}

        ${photos.length ? `
          <div class="review-photos">
            ${photos.map(url => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(url)}" alt="Review photo" onerror="this.closest('a').style.display='none'" /></a>`).join('')}
          </div>
        ` : ''}

        <div class="review-actions">
          <button
            class="btn-sm btn-reject-sm"
            type="button"
            ${canDelete ? '' : 'disabled'}
            onclick="deleteReviewAdmin('${orderRef}', ${canDelete ? itemIndex : -1}, '${itemName.replace(/'/g, "&#39;")}')"
          >
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </article>
    `;
  }).join('');
}

async function deleteReviewAdmin(orderRef, itemIndex, itemName) {
  if (!orderRef || !Number.isInteger(itemIndex) || itemIndex < 0) {
    toast('Unable to delete this review', 'error');
    return;
  }

  const ok = window.confirm(`Delete review for ${itemName || 'this item'}? This cannot be undone.`);
  if (!ok) return;

  try {
    const res = await apiFetch(`/admin/reviews/${encodeURIComponent(orderRef)}/${itemIndex}`, {
      method: 'DELETE'
    });

    if (!res.success) {
      toast(res.message || 'Failed to delete review', 'error');
      return;
    }

    toast('Review deleted successfully', 'success');
    await loadReviews();
  } catch (e) {
    console.error('Delete review error', e);
    toast('Failed to delete review', 'error');
  }
}

function renderRefundRequestList(list) {
  const container = document.getElementById('refundRequestList');
  if (!container) return;

  if (!Array.isArray(list) || !list.length) {
    container.innerHTML = `<div style="text-align:center;color:var(--text-dim);padding:22px"><i class="fas fa-circle-info"></i> No refund requests found.</div>`;
    return;
  }

  container.innerHTML = list.map(req => {
    const userName = escapeHtml(req.user?.name || 'Unknown');
    const userEmail = escapeHtml(req.user?.email || '');
    const orderId = escapeHtml(req.orderId || '');
    const refundStatus = escapeHtml(req.refundStatus || 'requested');
    const reason = escapeHtml(req.reason || 'No reason provided');
    const adminNote = escapeHtml(req.adminNote || '');
    const proofs = Array.isArray(req.proofUrls) ? req.proofUrls : [];
    const isRequested = req.refundStatus === 'requested';

    return `
      <article class="refund-card">
        <header class="refund-head">
          <div>
            <div class="review-name">${userName}</div>
            <div class="refund-meta">${userEmail || 'No email'} • Order ${orderId}</div>
            <div class="refund-meta">Requested: ${req.requestedAt ? formatTimeShort(req.requestedAt) : 'N/A'}</div>
          </div>
          <span class="refund-status ${refundStatus.toLowerCase()}">${refundStatus.replace(/_/g, ' ')}</span>
        </header>

        <div class="refund-reason"><strong>Issue:</strong> ${reason}</div>
        <div class="refund-meta"><strong>Amount:</strong> ₹${Number(req.amount || 0).toFixed(0)}</div>
        ${adminNote ? `<div class="refund-meta"><strong>Admin Note:</strong> ${adminNote}</div>` : ''}

        ${proofs.length ? `
          <div class="review-photos">
            ${proofs.map(url => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(url)}" alt="Refund proof" onerror="this.closest('a').style.display='none'" /></a>`).join('')}
          </div>
        ` : '<div class="refund-meta">No proof image attached.</div>'}

        ${isRequested ? `
          <div class="refund-actions">
            <button class="btn-sm btn-approve" type="button" onclick="processRefundAdmin('${orderId}')"><i class="fas fa-money-bill-wave"></i> Approve & Refund</button>
            <button class="btn-sm btn-reject-sm" type="button" onclick="rejectRefundAdmin('${orderId}')"><i class="fas fa-circle-xmark"></i> Reject</button>
          </div>
        ` : ''}
      </article>
    `;
  }).join('');
}

/* ═══════════ CHARTS HELPER ═══════════ */
function makeChart(canvasId, type, labels, datasets, extraOpts = {}, horizontal = false) {
  // Destroy existing
  if (adminState.charts[canvasId]) {
    adminState.charts[canvasId].destroy();
    delete adminState.charts[canvasId];
  }

  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const gridColor = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';
  const tickColor = isDark ? '#888' : '#666';

  const config = {
    type,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? 'y' : 'x',
      plugins: {
        legend: { display: type === 'doughnut', labels: { color: tickColor, font: { size: 11 } } },
        ...extraOpts
      },
      scales: type === 'doughnut' ? {} : {
        x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } },
        y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } }, beginAtZero: true }
      }
    }
  };

  adminState.charts[canvasId] = new Chart(ctx, config);
}

function reRenderAllCharts() {
  // Reload current section to refresh chart colors
  switchSection(adminState.section);
}

/* ═══════════ EXPORT EXCEL ═══════════ */
function exportUsersExcel() {
  if (!adminState.usersCache.length) { toast('Load users first', 'error'); return; }
  const data = adminState.usersCache.map(u => ({
    Name: u.name, Email: u.email, Role: u.role,
    Orders: u.orderCount || 0, 'Total Spent': u.totalSpent || 0,
    Joined: new Date(u.createdAt).toLocaleDateString()
  }));
  downloadExcel(data, 'BlazeKitchen_Users');
  toast('Users exported', 'success');
}
window.exportUsersExcel = exportUsersExcel;

function exportMenuExcel() {
  if (!adminState.menuCache.length) { toast('Load menu first', 'error'); return; }
  const rows = [];
  adminState.menuCache.forEach(cat => {
    const mainCat = Object.entries(MAIN_CATEGORIES).find(([, subs]) => subs.includes(cat.category))?.[0] || '—';
    cat.subcategories.forEach(sc => {
      sc.items.forEach(item => {
        rows.push({
          'Main Category': mainCat, 'Category': cat.category,
          'Subcategory': sc.name, 'Item': item.name,
          'Price(s)': item.prices.join(' / '), 'Note': item.note || '',
          'Category Available': cat.availability ? 'Yes' : 'No'
        });
      });
    });
  });
  downloadExcel(rows, 'BlazeKitchen_Menu');
  toast('Menu exported', 'success');
}
window.exportMenuExcel = exportMenuExcel;

function downloadExcel(data, filename) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/* ═══════════ GLOBAL SEARCH ═══════════ */
function globalSearch() {
  const q = document.getElementById('globalSearch').value.toLowerCase().trim();
  if (!q) return;

  // Try to match section
  if ('users'.includes(q))       { switchSection('users'); return; }
  if ('menu'.includes(q))        { switchSection('menu'); return; }
  if ('menu items'.includes(q) || 'items'.includes(q)) { switchSection('menu-items'); return; }
  if ('mood'.includes(q) || 'mood management'.includes(q)) { switchSection('mood'); return; }
  if ('orders'.includes(q))      { switchSection('orders'); return; }
  if ('analytics'.includes(q))   { switchSection('analytics'); return; }
  if ('activities'.includes(q))  { switchSection('activities'); return; }
  if ('reviews'.includes(q) || 'rating'.includes(q) || 'stars'.includes(q)) { switchSection('reviews'); return; }
  if ('settings'.includes(q))    { switchSection('settings'); return; }
  if ('dashboard'.includes(q))   { switchSection('dashboard'); return; }

  // Search users
  if (adminState.usersCache.some(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))) {
    switchSection('users');
    document.getElementById('userSearch').value = q;
    filterUsers();
    return;
  }
  // Search menu
  if (adminState.menuCache.some(m => m.category.toLowerCase().includes(q))) {
    switchSection('menu');
    document.getElementById('menuSearch').value = q;
    filterMenu();
    return;
  }
  // Search orders
  if (adminState.ordersCache.some(o => o.orderId.toLowerCase().includes(q) || (o.user?.name || '').toLowerCase().includes(q))) {
    switchSection('orders');
    document.getElementById('orderSearch').value = q;
    filterOrders();
    return;
  }

  // Search mood mappings
  if (adminState.moodItemsCache.some(m =>
    (m.itemName || '').toLowerCase().includes(q) ||
    (m.categoryName || '').toLowerCase().includes(q) ||
    (m.subcategoryName || '').toLowerCase().includes(q) ||
    (m.moods || []).join(' ').toLowerCase().includes(q) ||
    (m.tags || []).join(' ').toLowerCase().includes(q)
  )) {
    switchSection('mood');
    const moodSearch = document.getElementById('moodSearch');
    if (moodSearch) moodSearch.value = q;
    filterMoodItems();
    return;
  }

  // Search reviews
  if (adminState.reviewsCache.some(r =>
    (r.itemName || '').toLowerCase().includes(q) ||
    (r.orderId || '').toLowerCase().includes(q) ||
    (r.user?.name || '').toLowerCase().includes(q) ||
    (r.user?.email || '').toLowerCase().includes(q)
  )) {
    switchSection('reviews');
    const reviewSearch = document.getElementById('reviewSearch');
    if (reviewSearch) reviewSearch.value = q;
    filterReviews();
    return;
  }
}

/* ═══════════ NOTIFICATIONS ═══════════ */
function addNotification(message, type = 'order') {
  const notifEnabled = document.getElementById('notifToggle')?.checked;
  if (!notifEnabled) return;

  adminState.notifications.unshift({ message, type, time: new Date() });
  if (adminState.notifications.length > 50) adminState.notifications.pop();
  renderNotifications();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderNotifications() {
  const list = document.getElementById('notifList');
  const badge = document.getElementById('notifBadge');
  if (!list) return;

  if (!adminState.notifications.length) {
    list.innerHTML = '<p class="notif-empty">No new notifications</p>';
    if (badge) badge.textContent = '0';
    return;
  }

  list.innerHTML = adminState.notifications.slice(0, 20).map(n => {
    const cls = n.type === 'order' ? 'ni-order' : n.type === 'user' ? 'ni-user' : 'ni-status';
    const icon = n.type === 'order' ? 'fa-receipt' : n.type === 'user' ? 'fa-user-plus' : 'fa-bell';
    const safeMessage = escapeHtml(n.message);
    return `
      <div class="notif-item">
        <div class="ni-icon ${cls}"><i class="fas ${icon}"></i></div>
        <div>
          <div class="ni-text">${safeMessage}</div>
          <div class="ni-time">${formatTimeShort(n.time)}</div>
        </div>
      </div>`;
  }).join('');

  if (badge) badge.textContent = adminState.notifications.length;
}

function clearNotifications() {
  adminState.notifications = [];
  renderNotifications();
  document.getElementById('notifPanel').classList.remove('open');
}

/* ═══════════ SSE — Real-time admin push ═══════════ */
function connectSSE() {
  if (!adminState.token) return;
  disconnectSSE(); // close any existing
  const url = `${API}/admin/events?token=${encodeURIComponent(adminState.token)}`;
  const es  = new EventSource(url);
  adminState.sseSource = es;

  es.addEventListener('connected', () => {
    console.log('[SSE] ⚡ Admin event stream connected');
  });

  es.addEventListener('new-order', (e) => {
    try {
      const d = JSON.parse(e.data);
      const adminMsg = d.message || 'New order received. Awaiting admin confirmation.';
      // ⚡ Instant notification — no polling delay
      iPhoneChime(0.55);
      addNotification(
        `${adminMsg} (${d.orderId}) • ₹${d.total} • ${d.customer}`,
        'order'
      );
      toast(`🔔 ${adminMsg} (${d.orderId})`, 'info');
      // Flash bell
      const bell = document.getElementById('notifBtn');
      if (bell) { bell.classList.add('bell-ring'); setTimeout(() => bell.classList.remove('bell-ring'), 1000); }
      // Refresh orders + start alert loop
      loadOrders();
    } catch { /* parse error */ }
  });

  es.addEventListener('cancel-request', (e) => {
    try {
      const d = JSON.parse(e.data);
      iPhoneChime(0.4);
      addNotification(
        `Cancel request for order ${d.orderId} from ${d.customer} - "${d.reason}"`,
        'order'
      );
      showToast(`⚠️ Cancel request: order ${d.orderId} from ${d.customer}`, 'warn');
      const bell = document.getElementById('notifBtn');
      if (bell) { bell.classList.add('bell-ring'); setTimeout(() => bell.classList.remove('bell-ring'), 1000); }
      loadOrders();
    } catch { /* parse error */ }
  });

  es.addEventListener('order-delivered', (e) => {
    try {
      const d = JSON.parse(e.data);
      addNotification(
        `Order ${d.orderId} delivered successfully (${d.customer})`,
        'status'
      );
      toast(`✅ Delivered: ${d.orderId}`, 'success');
      const bell = document.getElementById('notifBtn');
      if (bell) { bell.classList.add('bell-ring'); setTimeout(() => bell.classList.remove('bell-ring'), 1000); }
      loadOrders();
    } catch { /* parse error */ }
  });

  es.addEventListener('new-feedback', (e) => {
    try {
      const d = JSON.parse(e.data);
      iPhoneChime(0.35);
      addNotification(
        `New message from ${d.name} - ${d.subject}`,
        'info'
      );
      toast(`📬 New message from ${d.name}: ${d.subject}`, 'info');
      const bell = document.getElementById('notifBtn');
      if (bell) { bell.classList.add('bell-ring'); setTimeout(() => bell.classList.remove('bell-ring'), 1000); }
      // Update badge
      const badge = document.getElementById('sbFeedbackBadge');
      if (badge) {
        const cur = parseInt(badge.textContent) || 0;
        badge.textContent = cur + 1;
        badge.style.display = '';
      }
      // Refresh list if on feedback section
      if (adminState.section === 'feedback') loadFeedbacks();
    } catch { /* parse error */ }
  });

  es.addEventListener('new-review', (e) => {
    try {
      const d = JSON.parse(e.data);
      addNotification(
        `New ${d.rating}/5 review on ${d.itemName} (${d.orderId}) by ${d.customer}`,
        'info'
      );
      toast(`⭐ New review: ${d.itemName} (${d.rating}/5)`, 'info');
      const badge = document.getElementById('sbReviewBadge');
      if (badge) {
        const curText = String(badge.textContent || '0').replace('+', '');
        const cur = Number(curText) || 0;
        const next = cur + 1;
        badge.textContent = next > 99 ? '99+' : String(next);
        badge.style.display = '';
      }
      if (adminState.section === 'reviews') loadReviews();
    } catch { /* parse error */ }
  });

  es.addEventListener('refund-request', (e) => {
    try {
      const d = JSON.parse(e.data);
      addNotification(
        `Refund request for ${d.orderId} by ${d.customer} (₹${d.amount})`,
        'info'
      );
      toast(`💸 Refund requested: ${d.orderId}`, 'info');
      const bell = document.getElementById('notifBtn');
      if (bell) { bell.classList.add('bell-ring'); setTimeout(() => bell.classList.remove('bell-ring'), 1000); }
      if (adminState.section === 'orders') loadOrders();
      if (adminState.section === 'reviews') loadReviews();
    } catch { /* parse error */ }
  });

  /* ── Menu updated (by another admin or this admin via API) ── */
  es.addEventListener('menu-updated', (e) => {
    try {
      const d = JSON.parse(e.data);
      console.log('[SSE] 🔄 Menu updated:', d.action, d.category || '');
      // Refresh menu section if currently viewing it
      if (adminState.section === 'menu' && typeof loadMenu === 'function') loadMenu();
    } catch { /* ignore */ }
  });

  es.addEventListener('mood-updated', (e) => {
    try {
      const d = JSON.parse(e.data || '{}');
      addNotification('Mood data updated: ' + (d.action || 'change detected'), 'status');
      if (adminState.section === 'mood') loadMoodManagement();
    } catch { /* ignore */ }
  });

  /* ── Settings updated ── */
  es.addEventListener('settings-updated', () => {
    console.log('[SSE] ⚙️ Settings updated');
    if (adminState.section === 'settings' && typeof loadSiteSettings === 'function') loadSiteSettings();
  });

  es.onerror = () => {
    // Auto-reconnect after 5s if stream dies
    es.close();
    adminState.sseSource = null;
    if (adminState.token) setTimeout(connectSSE, 5000);
  };
}

function disconnectSSE() {
  if (adminState.sseSource) { adminState.sseSource.close(); adminState.sseSource = null; }
}

/* ═══════════ POLLING (Real-time) ═══════════ */
let lastOrderCount   = 0;
let lastUserCount    = 0;
let lastPendingCount = null; // null = first run, avoid false alarm on login

function startPolling() {
  if (adminState.pollTimer) clearInterval(adminState.pollTimer);
  adminState.pollTimer = setInterval(async () => {
    try {
      const [dashRes, ordersRes] = await Promise.all([
        apiFetch('/admin/dashboard'),
        apiFetch('/admin/orders')
      ]);

      // ── Dashboard stats ──
      if (dashRes.success) {
        const d = dashRes.data;
        if (lastOrderCount && d.totalOrders > lastOrderCount) {
          const diff = d.totalOrders - lastOrderCount;
          addNotification(`${diff} new order${diff > 1 ? 's' : ''} received!`, 'order');
          toast(`\ud83d\udd14 ${diff} new order${diff > 1 ? 's' : ''} waiting for approval!`, 'info');
        }
        lastOrderCount = d.totalOrders;
        if (lastUserCount && d.totalUsers > lastUserCount) {
          const diff = d.totalUsers - lastUserCount;
          addNotification(`${diff} new user${diff > 1 ? 's' : ''} joined!`, 'user');
        }
        lastUserCount = d.totalUsers;
        if (adminState.section === 'dashboard') {
          setText('statRevenue', `₹${d.totalRevenue.toLocaleString()}`);
          setText('statOrders', d.totalOrders);
          setText('statUsers', d.totalUsers);
          setText('statActive', d.activeOrders);
        }
      }

      // ── Pending orders count ──
      if (ordersRes.success) {
        adminState.ordersCache = ordersRes.data;
        const pending = ordersRes.data.filter(o => o.status === 'placed').length;
        updatePendingBadge();
        if (lastPendingCount !== null && pending > lastPendingCount) {
          const diff = pending - lastPendingCount;
          addNotification(`\u26a0\ufe0f ${diff} new pending order${diff > 1 ? 's' : ''} need approval!`, 'order');
          // startPendingAlert is called inside updatePendingBadge — no duplicate call needed
          // Flash the notification bell
          const bell = document.getElementById('notifBtn');
          if (bell) { bell.classList.add('bell-ring'); setTimeout(() => bell.classList.remove('bell-ring'), 1000); }
        }
        lastPendingCount = pending;
        // Refresh orders table if currently visible
        if (adminState.section === 'orders') filterOrders();
      }
    } catch { /* silent */ }
  }, 30000); // SSE handles real-time; polling is stats refresh fallback
}

/* ═══════════ CAPTCHA & PASSWORD ═══════════ */
let captchaData = {};

function showCaptchaChallenge() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  captchaData = { question: `${a} + ${b} = ?`, answer: a + b };
  document.getElementById('captchaQuestion').textContent = captchaData.question;
  document.getElementById('captchaChallenge').style.display = 'flex';
}

function verifyCaptcha() {
  const val = parseInt(document.getElementById('captchaAnswer').value);
  if (val === captchaData.answer) {
    // Unlock password form
    document.getElementById('passLockOverlay').style.display = 'none';
    document.getElementById('changePassForm').style.display = 'block';
    toast('Verified! You can now change your password.', 'success');
  } else {
    toast('Wrong answer. Try again.', 'error');
    document.getElementById('captchaCheck').checked = false;
    document.getElementById('captchaChallenge').style.display = 'none';
    document.getElementById('captchaAnswer').value = '';
  }
}

async function changePassword(e) {
  e.preventDefault();
  const cur     = document.getElementById('curPass').value;
  const newP    = document.getElementById('newPass').value;
  const confirm = document.getElementById('confirmPass').value;
  const errEl   = document.getElementById('passError');
  errEl.textContent = '';

  if (newP !== confirm) { errEl.textContent = 'Passwords do not match'; return; }
  if (newP.length < 6)  { errEl.textContent = 'Min 6 characters'; return; }

  try {
    const res = await apiFetch('/admin/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword: cur, newPassword: newP })
    });
    if (res.success) {
      toast('Password changed successfully!', 'success');
      document.getElementById('changePassForm').reset();
      // Re-lock
      document.getElementById('passLockOverlay').style.display = 'flex';
      document.getElementById('changePassForm').style.display = 'none';
      document.getElementById('captchaCheck').checked = false;
      document.getElementById('captchaChallenge').style.display = 'none';
    } else {
      errEl.textContent = res.message || 'Failed';
    }
  } catch (err) {
    errEl.textContent = 'Server error';
  }
}

/* ═══════════ UTILS ═══════════ */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function formatTimeShort(dateStr) {
  const d = new Date(dateStr);
  const tf = adminState.timeFormat;
  if (tf === 'utc') return d.toUTCString().slice(5, 22);
  const opts = tf === '24'
    ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }
    : { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true };
  return d.toLocaleDateString('en-GB', opts);
}

function toast(msg, type = 'info') {
  const box = document.getElementById('toastBox');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `toast-item t-${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  el.innerHTML = `<span>${icon}</span> ${msg}`;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3500);
}

/* Expose global functions */
window.loadDashboard   = loadDashboard;
window.loadUsers       = loadUsers;
window.loadMenu        = loadMenu;
window.loadOrders      = loadOrders;
window.loadActivities  = loadActivities;
window.loadAnalytics   = loadAnalytics;
window.loadFeedbacks   = loadFeedbacks;
window.filterFeedbacks = filterFeedbacks;
window.updateFbStatus  = updateFbStatus;
window.loadReviews     = loadReviews;
window.filterReviews   = filterReviews;
window.deleteReviewAdmin = deleteReviewAdmin;

/* ═══════════ SITE SETTINGS (Contact Info) ═══════════ */
async function loadSiteSettings() {
  try {
    const json = await apiFetch('/settings');
    if (!json.success) throw new Error(json.message);

    const s = json.data;
    document.getElementById('ssPhone').value      = s.phone || '';
    document.getElementById('ssAddress').value     = s.address || '';
    document.getElementById('ssMainHours').value   = s.hours?.mainHours || '';
    document.getElementById('ssLateNight').value   = s.hours?.lateNight || '';
    document.getElementById('ssDeliveryMin').value = Number(s.deliveryTiming?.minMinutes ?? 2).toFixed(1);
    document.getElementById('ssDeliveryMax').value = Number(s.deliveryTiming?.maxMinutes ?? 3).toFixed(1);
    document.getElementById('ssQtyWeight').value   = Number(s.deliveryTiming?.qtyWeight ?? 0.7).toFixed(2);
    document.getElementById('ssVarietyWeight').value = Number(s.deliveryTiming?.varietyWeight ?? 0.3).toFixed(2);

    // Build email rows
    const list = document.getElementById('ssEmailsList');
    list.innerHTML = '';
    const emails = s.emails && s.emails.length ? s.emails : [''];
    emails.forEach(email => addEmailRow(email));
  } catch (err) {
    console.error('Failed to load site settings:', err);
  }
}

function addEmailRow(value = '') {
  const list = document.getElementById('ssEmailsList');
  const row = document.createElement('div');
  row.className = 'ss-email-row';
  row.innerHTML = `
    <input type="email" placeholder="email@blazekitchen.com" value="${value}" />
    <button type="button" class="btn-ss-remove" onclick="this.closest('.ss-email-row').remove()" title="Remove email">
      <i class="fas fa-trash"></i>
    </button>
  `;
  list.appendChild(row);
}

async function saveSiteSettings(e) {
  e.preventDefault();
  const btn = document.querySelector('.btn-ss-save');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';

  // Gather emails
  const emailInputs = document.querySelectorAll('#ssEmailsList .ss-email-row input');
  const emails = Array.from(emailInputs).map(i => i.value.trim()).filter(Boolean);

  const body = {
    phone:   document.getElementById('ssPhone').value.trim(),
    address: document.getElementById('ssAddress').value.trim(),
    emails,
    hours: {
      mainHours: document.getElementById('ssMainHours').value.trim(),
      lateNight: document.getElementById('ssLateNight').value.trim()
    },
    deliveryTiming: {
      minMinutes: Number(document.getElementById('ssDeliveryMin').value),
      maxMinutes: Number(document.getElementById('ssDeliveryMax').value),
      qtyWeight: Number(document.getElementById('ssQtyWeight').value),
      varietyWeight: Number(document.getElementById('ssVarietyWeight').value)
    }
  };

  if (!Number.isFinite(body.deliveryTiming.minMinutes) || body.deliveryTiming.minMinutes < 2 || body.deliveryTiming.minMinutes > 3) {
    showToast('Delivery min time must be between 2 and 3 minutes', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save Contact Info';
    return;
  }
  if (!Number.isFinite(body.deliveryTiming.maxMinutes) || body.deliveryTiming.maxMinutes < 2 || body.deliveryTiming.maxMinutes > 3) {
    showToast('Delivery max time must be between 2 and 3 minutes', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save Contact Info';
    return;
  }
  if (body.deliveryTiming.maxMinutes < body.deliveryTiming.minMinutes) {
    showToast('Delivery max time must be greater than or equal to min time', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save Contact Info';
    return;
  }

  try {
    const json = await apiFetch('/settings', {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    if (!json.success) throw new Error(json.message);

    showToast('Contact info saved successfully!', 'success');
    const msg = document.getElementById('ssSavedMsg');
    msg.style.display = 'inline-flex';
    setTimeout(() => { msg.style.display = 'none'; }, 3000);
  } catch (err) {
    showToast('Failed to save settings: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save Contact Info';
  }
}
window.loadSiteSettings = loadSiteSettings;
window.addEmailRow      = addEmailRow;
window.saveSiteSettings = saveSiteSettings;

/* ══════════════════════════════════════════
   MANAGE ADMINS
   ══════════════════════════════════════════ */

async function loadAdminList() {
  const tbody = document.getElementById('adminListBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:20px"><i class="fas fa-spinner fa-spin"></i> Loading…</td></tr>';

  try {
    const json = await apiFetch('/admin/manage/admins');
    if (!json.success) throw new Error(json.message);
    const admins = json.data || [];

    const currentEmail = (adminState.user?.email || '').toLowerCase();

    if (!admins.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:20px">No admins found</td></tr>';
      return;
    }

    tbody.innerHTML = admins.map((a, i) => {
      const isSelf = (a.email || '').toLowerCase() === currentEmail;
      const created = new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const lastLog = a.lastLogin
        ? new Date(a.lastLogin).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';

      return `<tr>
        <td>${i + 1}</td>
        <td>
          <span style="font-weight:600">${a.name || '—'}</span>
          ${isSelf ? ' <span style="font-size:.65rem;color:var(--orange);background:rgba(255,94,0,.12);padding:1px 6px;border-radius:4px">You</span>' : ''}
        </td>
        <td>${a.email}</td>
        <td>${lastLog}</td>
        <td>${created}</td>
        <td>
          <div style="display:flex;gap:6px;justify-content:center">
            <button onclick="editAdminUser('${a._id}','${(a.name||'').replace(/'/g,"\\'")}','${a.email}')" class="btn-sm" style="padding:4px 10px;font-size:.72rem" title="Edit">
              <i class="fas fa-pen"></i>
            </button>
            ${isSelf ? '' : `<button onclick="deleteAdminUser('${a._id}','${(a.name||'').replace(/'/g,"\\'")}') " class="btn-sm btn-danger" style="padding:4px 10px;font-size:.72rem" title="Delete">
              <i class="fas fa-trash"></i>
            </button>`}
          </div>
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('Load admins error:', err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#ff4444;padding:20px">Failed to load admins</td></tr>';
  }
}

function openCreateAdminModal() {
  document.getElementById('adminEditId').value = '';
  document.getElementById('adminFormName').value = '';
  document.getElementById('adminFormEmail').value = '';
  document.getElementById('adminFormPassword').value = '';
  document.getElementById('adminFormPassword').required = true;
  document.getElementById('adminPwdHint').textContent = '*';
  document.getElementById('adminModalTitle').innerHTML = '<i class="fas fa-user-plus" style="color:var(--orange);margin-right:8px"></i>New Admin';
  document.getElementById('adminFormSubmitBtn').querySelector('span').textContent = 'Create Admin';
  document.getElementById('adminModalOverlay').style.display = 'block';
  document.getElementById('adminFormModal').style.display = 'block';
  document.getElementById('adminFormName').focus();
}

function editAdminUser(id, name, email) {
  document.getElementById('adminEditId').value = id;
  document.getElementById('adminFormName').value = name;
  document.getElementById('adminFormEmail').value = email;
  document.getElementById('adminFormPassword').value = '';
  document.getElementById('adminFormPassword').required = false;
  document.getElementById('adminPwdHint').textContent = '(leave blank to keep current)';
  document.getElementById('adminModalTitle').innerHTML = '<i class="fas fa-user-edit" style="color:var(--orange);margin-right:8px"></i>Edit Admin';
  document.getElementById('adminFormSubmitBtn').querySelector('span').textContent = 'Update Admin';
  document.getElementById('adminModalOverlay').style.display = 'block';
  document.getElementById('adminFormModal').style.display = 'block';
  document.getElementById('adminFormName').focus();
}

function closeAdminModal() {
  document.getElementById('adminModalOverlay').style.display = 'none';
  document.getElementById('adminFormModal').style.display = 'none';
}

function toggleAdminPwdVis() {
  const inp = document.getElementById('adminFormPassword');
  const eye = document.getElementById('adminPwdEye');
  if (inp.type === 'password') { inp.type = 'text'; eye.className = 'fas fa-eye-slash'; }
  else { inp.type = 'password'; eye.className = 'fas fa-eye'; }
}

async function submitAdminForm(e) {
  e.preventDefault();
  const editId   = document.getElementById('adminEditId').value;
  const name     = document.getElementById('adminFormName').value.trim();
  const email    = document.getElementById('adminFormEmail').value.trim();
  const password = document.getElementById('adminFormPassword').value;
  const btn      = document.getElementById('adminFormSubmitBtn');

  if (!name || !email) { showToast('Name and email are required', 'error'); return; }
  if (!editId && (!password || password.length < 6)) { showToast('Password must be at least 6 characters', 'error'); return; }

  btn.disabled = true;
  const origHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const body = { name, email };
    if (password) body.password = password;

    let url, method;
    if (editId) { url = `/admin/manage/admins/${editId}`; method = 'PUT'; }
    else { url = '/admin/manage/admins'; method = 'POST'; }

    const json = await apiFetch(url, { method, body: JSON.stringify(body) });
    if (!json.success) throw new Error(json.message);

    showToast(json.message, 'success');
    closeAdminModal();
    loadAdminList();
  } catch (err) {
    showToast(err.message || 'Operation failed', 'error');
  }
  btn.disabled = false;
  btn.innerHTML = origHtml;
}

async function deleteAdminUser(id, name) {
  if (!confirm(`⚠️ Delete admin "${name}"?\n\nThis cannot be undone.`)) return;
  try {
    const json = await apiFetch(`/admin/manage/admins/${id}`, { method: 'DELETE' });
    if (!json.success) throw new Error(json.message);
    showToast(json.message, 'success');
    loadAdminList();
  } catch (err) {
    showToast(err.message || 'Failed to delete', 'error');
  }
}

// Close modal on overlay click
document.getElementById('adminModalOverlay')?.addEventListener('click', closeAdminModal);

// Expose globally
window.loadAdminList       = loadAdminList;
window.openCreateAdminModal = openCreateAdminModal;
window.editAdminUser       = editAdminUser;
window.closeAdminModal     = closeAdminModal;
window.toggleAdminPwdVis   = toggleAdminPwdVis;
window.submitAdminForm     = submitAdminForm;
window.deleteAdminUser     = deleteAdminUser;
