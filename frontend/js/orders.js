/* ============================================================
   BLAZE KITCHEN — orders.js
   Real-time order tracking, PDF bills, user-specific orders
   ============================================================ */
'use strict';

/* ── CONSTANTS ── */
const API_BASE    = 'http://localhost:5000/api';
const POLL_INTERVAL = 5000; // 5s polling for real-time tracking
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=85';

const STATUS_META = {
  placed:           { label: 'Placed',            icon: 'fa-receipt',        step: 0 },
  confirmed:        { label: 'Confirmed',         icon: 'fa-check',         step: 1 },
  preparing:        { label: 'Preparing',         icon: 'fa-fire-burner',   step: 2 },
  out_for_delivery: { label: 'Out for Delivery',  icon: 'fa-motorcycle',    step: 3 },
  delivered:        { label: 'Delivered',          icon: 'fa-circle-check',  step: 4 },
  cancelled:        { label: 'Cancelled',         icon: 'fa-ban',           step: -1 }
};

const TRACK_STEPS = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

/* ── STATE ── */
let orders    = [];
let activeTab = 'active';
let pollTimer = null;
let user      = null;
let token     = null;
let trackingPoll = null;
let trackMap = null;
let trackLayers = [];
let riderAnimTimer = null;
let riderMarkerRef = null;
let riderRoute = null;
let riderProgress = 0;
let currentTrackingOrderId = null;
let deliveryMarkInFlight = false;
let reviewPastedImages = [];
let reviewPasteBound = false;
let refundPastedImages = [];
let refundPasteBound = false;

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  setupThemeToggle();
  setupTabs();
  setupModal();

  // Check auth
  const storedUser  = localStorage.getItem('blaze_user');
  const storedToken = localStorage.getItem('blaze_token');

  if (storedUser && storedToken) {
    user  = JSON.parse(storedUser);
    token = storedToken;
    loadOrders();
    startPolling();
    connectOrderSSE();
  } else {
    hideLoader();
    document.getElementById('ordLoginRequired').style.display = 'flex';
  }
});

/* ══════════════════════════════════════════════
   THEME
   ══════════════════════════════════════════════ */
function applyTheme() {
  const t = localStorage.getItem('blaze_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function setupThemeToggle() {
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('blaze_theme', next);
    document.getElementById('themeIcon').className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  });
}

/* ══════════════════════════════════════════════
   TABS
   ══════════════════════════════════════════════ */
function setupTabs() {
  document.querySelectorAll('.ord-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ord-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      renderOrders();
    });
  });
}

/* ══════════════════════════════════════════════
   API CALLS
   ══════════════════════════════════════════════ */
async function loadOrders() {
  try {
    let page = 1;
    const limit = 25;
    let hasMore = true;
    const acc = [];

    while (hasMore) {
      const res = await fetch(`${API_BASE}/orders?page=${page}&limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 401) {
        hideLoader();
        document.getElementById('ordLoginRequired').style.display = 'flex';
        stopPolling();
        return;
      }

      const data = await res.json();
      if (!data.success) break;

      acc.push(...(data.data || []));
      hasMore = !!data.pagination?.hasMore;
      page += 1;
    }

    orders = acc;
    hideLoader();
    renderOrders();
    updateBadges();
    checkUnreadNotifications();
  } catch (err) {
    console.error('Failed to load orders:', err);
    hideLoader();
    toast('Failed to load orders', 'error');
  }
}

function startPolling() {
  pollTimer = setInterval(async () => {
    const hasActive = orders.some(o => !['delivered', 'cancelled'].includes(o.status));
    if (hasActive) {
      await loadOrders();
    }
  }, POLL_INTERVAL);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
}

/* ── SSE — Real-time order status updates ── */
let _orderSSE = null;
let _orderSSEClosing = false;
function connectOrderSSE() {
  if (_orderSSE) return;
  _orderSSEClosing = false;
  const es = new EventSource(`${API_BASE}/events/public`);
  _orderSSE = es;

  es.addEventListener('order-status-updated', (e) => {
    try {
      const d = JSON.parse(e.data);
      console.log(`[SSE] 📦 Order ${d.orderId} → ${d.status}`);
      loadOrders();
    } catch { /* ignore */ }
  });

  es.onerror = () => {
    if (_orderSSEClosing) return;
    if (es.readyState === EventSource.CLOSED) {
      _orderSSE = null;
      setTimeout(connectOrderSSE, 5000);
    }
  };
}

window.addEventListener('beforeunload', () => {
  _orderSSEClosing = true;
  if (_orderSSE) { _orderSSE.close(); _orderSSE = null; }
  if (trackingPoll) { clearInterval(trackingPoll); trackingPoll = null; }
});

// Expose loadOrders globally so other pages (app.js SSE) can call it
window.loadOrders = loadOrders;

function hideLoader() {
  const loader = document.getElementById('ordLoader');
  if (loader) loader.style.display = 'none';
}

/* ══════════════════════════════════════════════
   RENDER ORDERS
   ══════════════════════════════════════════════ */
function renderOrders() {
  const list       = document.getElementById('ordList');
  const emptyState = document.getElementById('ordEmpty');
  if (!list) return;

  const filtered = filterOrders();

  if (!filtered.length) {
    list.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  list.style.display = 'flex';

  list.innerHTML = filtered.map((order, i) => renderOrderCard(order, i)).join('');
}

function filterOrders() {
  if (activeTab === 'active') {
    return orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  }
  if (activeTab === 'delivered') {
    return orders.filter(o => o.status === 'delivered');
  }
  return orders; // all
}

function updateBadges() {
  const active    = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const all       = orders.length;

  setText('activeBadge',    active);
  setText('deliveredBadge', delivered);
  setText('allBadge',       all);
}

function renderOrderCard(order, index) {
  const meta     = STATUS_META[order.status] || STATUS_META.placed;
  const date     = formatDate(order.createdAt);
  const items    = order.items || [];
  const showMax  = 4;
  const moreCount = items.length - showMax;

  const isActive = !['delivered', 'cancelled'].includes(order.status);
  const scheduleNote = order.deliverySchedule?.mode === 'scheduled' && order.deliverySchedule?.scheduledFor
    ? `<div style="font-size:0.76rem;color:var(--warning);margin-top:5px"><i class="fas fa-calendar"></i> Scheduled: ${formatDateTime(order.deliverySchedule.scheduledFor)}</div>`
    : '';

  // Item thumbnails
  const thumbs = items.slice(0, showMax).map(item => `
    <div class="ord-item-thumb">
      <img src="${item.image || DEFAULT_IMG}" alt="${item.name}" 
           onerror="this.src='${DEFAULT_IMG}'" />
    </div>
  `).join('');

  const moreThumb = moreCount > 0 ? `<div class="ord-items-more">+${moreCount}</div>` : '';

  // Tracker
  const tracker = order.status !== 'cancelled' ? renderTracker(order.status) : `
    <div style="padding:8px 0;color:var(--error);font-size:0.85rem;display:flex;align-items:center;gap:8px">
      <i class="fas fa-ban"></i> Order was cancelled
    </div>`;

  // Cancel request pending notice
  const cancelPendingBanner = (order.cancelRequest && order.cancelRequest.status === 'pending') ? `
    <div style="margin-top:8px;padding:8px 12px;border-radius:8px;background:rgba(245,158,11,0.13);
                border:1px solid rgba(245,158,11,0.35);color:#f59e0b;font-size:0.8rem;display:flex;align-items:center;gap:8px">
      <i class="fas fa-hourglass-half"></i>
      <span><strong>Cancellation requested</strong> — awaiting admin review</span>
    </div>` : '';

  // Actions
  let actions = `
    <button class="ord-btn primary" onclick="viewOrderDetail('${order.orderId}')">
      <i class="fas fa-eye"></i> View Details
    </button>
    <button class="ord-btn" onclick="openTrackingModal('${order.orderId}')">
      <i class="fas fa-location-dot"></i> Track
    </button>
    <button class="ord-btn" onclick="downloadBill('${order.orderId}')">
      <i class="fas fa-file-pdf"></i> Bill
    </button>`;

  if (order.status === 'delivered') {
    const reviewIdx = firstReviewableItemIndex(order);
    actions += `
      <button class="ord-btn" onclick="openReviewModal('${order.orderId}', ${reviewIdx})">
        <i class="fas fa-star"></i> Review
      </button>`;
  }

  if (isActive && ['placed', 'confirmed'].includes(order.status)) {
    const hasPendingRequest = order.cancelRequest && order.cancelRequest.status === 'pending';
    if (hasPendingRequest) {
      actions += `
        <button class="ord-btn" disabled style="opacity:.55;cursor:not-allowed">
          <i class="fas fa-hourglass-half"></i> Cancel Requested
        </button>`;
    } else {
      actions += `
        <button class="ord-btn danger" onclick="cancelOrder('${order.orderId}')">
          <i class="fas fa-times"></i> Cancel
        </button>`;
    }
  }

  return `
    <div class="ord-card" style="animation-delay: ${index * 0.08}s">
      <div class="ord-card-header">
        <div>
          <div class="ord-card-id">#${order.orderId}</div>
          <div class="ord-card-date">${date}</div>
          ${scheduleNote}
        </div>
        <div class="ord-status ${order.status}">
          <span class="ord-status-dot"></span>
          ${meta.label}
        </div>
      </div>
      <div class="ord-card-body">
        <div class="ord-items-preview">
          ${thumbs}${moreThumb}
        </div>
        ${tracker}
        ${cancelPendingBanner}
      </div>
      <div class="ord-card-footer">
        <div class="ord-card-total">Total: <span>₹${order.total}</span></div>
        <div class="ord-card-actions">${actions}</div>
      </div>
    </div>`;
}

function renderTracker(status) {
  const currentStep = STATUS_META[status]?.step ?? 0;

  return `
    <div class="ord-tracker">
      ${TRACK_STEPS.map((step, i) => {
        const meta      = STATUS_META[step];
        const isCompleted = i < currentStep;
        const isActive   = i === currentStep;
        const cls        = isCompleted ? 'completed' : (isActive ? 'active' : '');
        
        // Connector line
        let line = '';
        if (i < TRACK_STEPS.length - 1) {
          const lineCls = isCompleted ? 'done' : (isActive ? 'partial' : '');
          line = `<div class="ord-track-line ${lineCls}"></div>`;
        }

        return `
          <div class="ord-track-step ${cls}">
            <div class="ord-track-icon"><i class="fas ${meta.icon}"></i></div>
            <div class="ord-track-label">${meta.label}</div>
          </div>
          ${line}`;
      }).join('')}
    </div>`;
}

/* ══════════════════════════════════════════════
   ORDER DETAIL MODAL
   ══════════════════════════════════════════════ */
function setupModal() {
  document.getElementById('ordModalClose')?.addEventListener('click', closeModal);
  document.getElementById('ordModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'ordModal') closeModal();
  });

  document.getElementById('trackingModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'trackingModal') closeTrackingModal();
  });
  document.getElementById('reviewModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'reviewModal') closeReviewModal();
  });
  document.getElementById('refundModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'refundModal') closeRefundModal();
  });

  bindReviewPasteHandlers();
  bindRefundPasteHandlers();
  document.getElementById('cancelReasonModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'cancelReasonModal') closeCancelReasonModal();
  });
}

function bindReviewPasteHandlers() {
  if (reviewPasteBound) return;
  reviewPasteBound = true;

  const zone = document.getElementById('reviewPasteZone');
  if (!zone) return;

  zone.addEventListener('paste', async (e) => {
    const files = Array.from(e.clipboardData?.files || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();

    const remaining = Math.max(0, 4 - reviewPastedImages.length);
    if (remaining <= 0) {
      toast('Maximum 4 photos allowed', 'info');
      return;
    }

    const selected = files.slice(0, remaining);
    for (const file of selected) {
      const dataUrl = await blobToCompressedDataUrl(file);
      if (dataUrl) reviewPastedImages.push(dataUrl);
    }

    if (files.length > selected.length) toast('Only first 4 photos are kept', 'info');
    renderReviewPastedPreview();
  });
}

function bindRefundPasteHandlers() {
  if (refundPasteBound) return;
  refundPasteBound = true;

  const zone = document.getElementById('refundPasteZone');
  if (!zone) return;

  zone.addEventListener('paste', async (e) => {
    const files = Array.from(e.clipboardData?.files || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();

    const remaining = Math.max(0, 4 - refundPastedImages.length);
    if (remaining <= 0) {
      toast('Maximum 4 proof photos allowed', 'info');
      return;
    }

    const selected = files.slice(0, remaining);
    for (const file of selected) {
      const dataUrl = await blobToCompressedDataUrl(file);
      if (dataUrl) refundPastedImages.push(dataUrl);
    }

    if (files.length > selected.length) toast('Only first 4 photos are kept', 'info');
    renderRefundPastedPreview();
  });
}

async function blobToCompressedDataUrl(blob) {
  const loadImage = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

  try {
    const objectUrl = URL.createObjectURL(blob);
    const img = await loadImage(objectUrl);

    const maxW = 900;
    const ratio = img.width > maxW ? (maxW / img.width) : 1;
    const w = Math.max(1, Math.round(img.width * ratio));
    const h = Math.max(1, Math.round(img.height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    URL.revokeObjectURL(objectUrl);

    const maxBytes = 350 * 1024;
    let quality = 0.78;
    let out = canvas.toDataURL('image/jpeg', quality);

    while (quality > 0.45 && Math.ceil((out.length * 3) / 4) > maxBytes) {
      quality -= 0.08;
      out = canvas.toDataURL('image/jpeg', quality);
    }

    if (Math.ceil((out.length * 3) / 4) > maxBytes) return null;
    return out;
  } catch {
    return null;
  }
}

function renderReviewPastedPreview() {
  const wrap = document.getElementById('reviewPastedPreview');
  if (!wrap) return;

  if (!reviewPastedImages.length) {
    wrap.innerHTML = '';
    return;
  }

  wrap.innerHTML = reviewPastedImages.map((src, idx) => `
    <div class="review-pasted-item">
      <img src="${src}" alt="Pasted review" />
      <button type="button" class="review-pasted-remove" onclick="removePastedReviewImage(${idx})" aria-label="Remove image">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
}

function renderRefundPastedPreview() {
  const wrap = document.getElementById('refundPastedPreview');
  if (!wrap) return;

  if (!refundPastedImages.length) {
    wrap.innerHTML = '';
    return;
  }

  wrap.innerHTML = refundPastedImages.map((src, idx) => `
    <div class="review-pasted-item">
      <img src="${src}" alt="Pasted proof" />
      <button type="button" class="review-pasted-remove" onclick="removePastedRefundImage(${idx})" aria-label="Remove image">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
}

window.removePastedReviewImage = function(idx) {
  reviewPastedImages = reviewPastedImages.filter((_, i) => i !== idx);
  renderReviewPastedPreview();
};

window.removePastedRefundImage = function(idx) {
  refundPastedImages = refundPastedImages.filter((_, i) => i !== idx);
  renderRefundPastedPreview();
};

function closeModal() {
  document.getElementById('ordModal')?.classList.remove('open');
}

function showOverlayModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = 'flex';
  // Ensure transition class is applied after layout.
  requestAnimationFrame(() => modal.classList.add('open'));
}

function hideOverlayModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => {
    if (!modal.classList.contains('open')) modal.style.display = 'none';
  }, 220);
}

window.viewOrderDetail = function(orderId) {
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return;

  const modal   = document.getElementById('ordModal');
  const content = document.getElementById('ordModalContent');
  const meta    = STATUS_META[order.status] || STATUS_META.placed;
  const items   = order.items || [];
  const date    = formatDate(order.createdAt);
  const addr    = order.address || {};

  // Build status timeline
  const timeline = (order.statusHistory || []).map((h, i, arr) => {
    const isDone    = i < arr.length - 1;
    const isCurrent = i === arr.length - 1;
    const cls       = isDone ? 'done' : (isCurrent ? 'current' : '');
    const statusLbl = STATUS_META[h.status]?.label || h.status;
    return `
      <div class="om-track-item ${cls}">
        <div class="om-track-dot"></div>
        <div class="om-track-line"></div>
        <div class="om-track-info">
          <div class="om-track-status">${statusLbl}</div>
          <div class="om-track-note">${h.note || ''}</div>
          <div class="om-track-time">${formatDateTime(h.timestamp)}</div>
        </div>
      </div>`;
  }).join('');

  // Items
  const itemsHtml = items.map(item => `
    <div class="om-item">
      <img class="om-item-img" src="${item.image || DEFAULT_IMG}" alt="${item.name}"
           onerror="this.src='${DEFAULT_IMG}'" />
      <div class="om-item-info">
        <div class="om-item-name">${item.name}</div>
        <div class="om-item-qty">× ${item.quantity}</div>
        ${item.review?.rating ? `<div class="om-item-qty" style="color:var(--warning)">⭐ ${item.review.rating}/5${item.review.comment ? ` · ${item.review.comment}` : ''}</div>` : ''}
      </div>
      <div class="om-item-price">₹${item.price * item.quantity}</div>
    </div>`).join('');

  // Bill
  const bill = `
    <div class="om-bill">
      <div class="om-bill-row"><span>Subtotal</span><span>&#8377;${order.subtotal}</span></div>
      ${order.discount ? `<div class="om-bill-row discount"><span>Coupon ${order.coupon ? `(${order.coupon})` : ''}</span><span>−&#8377;${order.discount}</span></div>` : ''}
      <div class="om-bill-row"><span>Delivery Fee</span><span>${order.deliveryFee === 0 ? '&#127881; FREE' : `&#8377;${order.deliveryFee}`}</span></div>
      <div class="om-bill-row"><span>CGST (2.5%)</span><span>&#8377;${order.cgst || Math.round((order.gst||0)/2)}</span></div>
      <div class="om-bill-row"><span>SGST (2.5%)</span><span>&#8377;${order.sgst || Math.round((order.gst||0)/2)}</span></div>
      <div class="om-bill-row packaging"><span>Packaging (7%)</span><span>&#8377;${order.packagingFee || Math.round(Math.max(0,(order.subtotal||0)-(order.discount||0))*0.07)}</span></div>
      <div class="om-bill-row total"><span>Total</span><span>&#8377;${order.total}</span></div>
      ${order.refund?.status && order.refund.status !== 'none' ? `<div class="om-bill-row"><span>Refund Status</span><span>${order.refund.status}</span></div>` : ''}
    </div>`;

  // Address & Payment
  const addressText = addr.line1
    ? `${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}<br>${addr.city || ''} - ${addr.pin || ''}${addr.phone ? '<br>📞 ' + addr.phone : ''}`
    : 'N/A';

  const paymentLabel = { upi: '📱 UPI', card: '💳 Card', wallet: '👛 Wallet', cod: '💵 Cash on Delivery' };

  // Footer actions
  let footerActions = `
    <button class="ord-btn" onclick="openTrackingModal('${order.orderId}')">
      <i class="fas fa-location-dot"></i> Live Track
    </button>
    <button class="ord-btn" onclick="downloadBill('${order.orderId}')">
      <i class="fas fa-file-pdf"></i> Download Bill
    </button>`;

  if (order.status === 'delivered') {
    const reviewIdx = firstReviewableItemIndex(order);
    footerActions += `
      <button class="ord-btn" onclick="openReviewModal('${order.orderId}', ${reviewIdx})">
        <i class="fas fa-star"></i> Review Item
      </button>`;
  }

  if (['delivered', 'cancelled'].includes(order.status) && order.paymentMethod !== 'cod') {
    const refundStatus = order.refund?.status || 'none';
    if (refundStatus === 'none' || refundStatus === 'rejected') {
      footerActions += `
        <button class="ord-btn danger" onclick="requestRefund('${order.orderId}')">
          <i class="fas fa-rotate-left"></i> Request Refund
        </button>`;
    } else {
      footerActions += `
        <button class="ord-btn" disabled style="opacity:.6;cursor:not-allowed">
          <i class="fas fa-circle-info"></i> Refund: ${refundStatus}
        </button>`;
    }
  }

  if (['placed', 'confirmed'].includes(order.status)) {
    const hasPendingRequest = order.cancelRequest && order.cancelRequest.status === 'pending';
    if (hasPendingRequest) {
      footerActions += `
        <button class="ord-btn" disabled style="opacity:.55;cursor:not-allowed">
          <i class="fas fa-hourglass-half"></i> Cancel Requested (Pending)
        </button>`;
    } else {
      footerActions += `
        <button class="ord-btn danger" onclick="cancelOrder('${order.orderId}'); closeModal();">
          <i class="fas fa-times"></i> Cancel Order
        </button>`;
    }
  }

  content.innerHTML = `
    <div class="om-header">
      <div>
        <div class="om-order-id">#${order.orderId}</div>
        <div class="om-date">${date}</div>
      </div>
      <div class="ord-status ${order.status}">
        <span class="ord-status-dot"></span>
        ${meta.label}
      </div>
    </div>

    <div class="om-tracker">
      <div class="om-section-title" style="padding:0 0 12px">Order Timeline</div>
      <div class="om-track-timeline">${timeline}</div>
    </div>

    <div class="om-section">
      <div class="om-section-title">Items Ordered</div>
      ${itemsHtml}
    </div>

    ${bill}

    <div class="om-details">
      <div class="om-detail-block">
        <div class="om-detail-label"><i class="fas fa-map-marker-alt"></i> Delivery Address</div>
        <div class="om-detail-value">${addressText}</div>
      </div>
      <div class="om-detail-block">
        <div class="om-detail-label"><i class="fas fa-credit-card"></i> Payment</div>
        <div class="om-detail-value">${paymentLabel[order.paymentMethod] || order.paymentMethod}</div>
      </div>
    </div>

    <div class="om-footer">${footerActions}</div>`;

  modal.classList.add('open');
};

window.closeModal = closeModal;

window.openTrackingModal = async function(orderId) {
  const modal = document.getElementById('trackingModal');
  const content = document.getElementById('trackingContent');
  if (!modal || !content) return;

  if (currentTrackingOrderId && currentTrackingOrderId !== orderId) {
    if (trackingPoll) { clearInterval(trackingPoll); trackingPoll = null; }
    if (riderAnimTimer) { clearInterval(riderAnimTimer); riderAnimTimer = null; }
    if (trackMap) {
      try { trackMap.remove(); } catch (_) { }
      trackMap = null;
      trackLayers = [];
    }
    riderMarkerRef = null;
    riderRoute = null;
    riderProgress = 0;
    deliveryMarkInFlight = false;
  }

  currentTrackingOrderId = orderId;
  showOverlayModal('trackingModal');
  content.innerHTML = '<div style="color:var(--text-dim);font-size:0.9rem"><i class="fas fa-spinner fa-spin"></i> Loading tracking...</div>';
  await refreshTracking(orderId);

  if (trackingPoll) clearInterval(trackingPoll);
  trackingPoll = setInterval(() => refreshTracking(orderId), 7000);
};

window.closeTrackingModal = function() {
  hideOverlayModal('trackingModal');
  if (trackingPoll) {
    clearInterval(trackingPoll);
    trackingPoll = null;
  }
  if (riderAnimTimer) {
    clearInterval(riderAnimTimer);
    riderAnimTimer = null;
  }
  if (trackMap) {
    try { trackMap.remove(); } catch (_) { }
    trackMap = null;
    trackLayers = [];
  }
  riderMarkerRef = null;
  riderRoute = null;
  riderProgress = 0;
  currentTrackingOrderId = null;
};

async function refreshTracking(orderId) {
  const content = document.getElementById('trackingContent');
  if (!content) return;

  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/tracking`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed');

    const t = data.data;
    content.innerHTML = `
      <div class="track-wrap">
        <div class="track-meta">
          <div style="font-size:0.82rem;color:var(--text-dim)">Order: #${t.orderId}</div>
          <div class="track-progress"><div style="width:${Math.max(0, Math.min(100, t.progressPercent || 0))}%"></div></div>
          <div class="track-meta-row">
            <span>Status: <strong>${STATUS_META[t.status]?.label || t.status}</strong></span>
            <span>ETA: <strong>${t.etaMinutes} min</strong></span>
          </div>
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
            <span class="track-pill"><i class="fas fa-store"></i> Kitchen</span>
            <span class="track-pill"><i class="fas fa-motorcycle"></i> Delivery Agent</span>
            <span class="track-pill"><i class="fas fa-house"></i> You</span>
          </div>
        </div>
        <div id="ordTrackMap" class="track-map"></div>
        <div class="track-actions">
          ${t.mapUrl ? `<a href="${t.mapUrl}" target="_blank" class="ord-btn primary"><i class="fas fa-map"></i> Open Full Route</a>` : '<span style="font-size:0.82rem;color:var(--text-dim)">Route preview shown with available coordinates.</span>'}
        </div>
      </div>
    `;

    const ok = renderTrackMap(t);
    if (!ok) renderFallbackEmbed(t);
  } catch (err) {
    content.innerHTML = `<div style="color:var(--error)">Unable to load tracking right now.</div>`;
  }
}

function renderFallbackEmbed(t) {
  const mapEl = document.getElementById('ordTrackMap');
  if (!mapEl) return;

  const k = t.kitchenLocation || {};
  const c = t.customerLocation || {};
  const r = getInterpolatedRiderPos(t) || {};
  const lat = isNum(r.lat) ? r.lat : (isNum(c.lat) ? c.lat : k.lat);
  const lng = isNum(r.lng) ? r.lng : (isNum(c.lng) ? c.lng : k.lng);

  if (!isNum(lat) || !isNum(lng)) {
    mapEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-dim)">Map unavailable</div>';
    return;
  }

  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`;
  mapEl.innerHTML = `<iframe title="Live tracking map" src="${src}" style="width:100%;height:100%;border:0;border-radius:12px" loading="lazy"></iframe>`;
}

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function getInterpolatedRiderPos(t) {
  const k = t.kitchenLocation || {};
  const c = t.customerLocation || {};
  const r = t.riderLocation || {};

  if (isNum(r.lat) && isNum(r.lng)) return { lat: r.lat, lng: r.lng };
  if (!(isNum(k.lat) && isNum(k.lng) && isNum(c.lat) && isNum(c.lng))) return null;

  const p = Math.max(0, Math.min(1, (t.progressPercent || 0) / 100));
  return {
    lat: k.lat + ((c.lat - k.lat) * p),
    lng: k.lng + ((c.lng - k.lng) * p)
  };
}

function markerIcon(kind) {
  const iconMap = {
    kitchen: 'fa-store',
    customer: 'fa-house',
    rider: 'fa-motorcycle'
  };
  return L.divIcon({
    className: '',
    html: `<div class="track-marker ${kind}"><i class="fas ${iconMap[kind]}"></i></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
}

function hashOrderId(str) {
  let h = 0;
  const s = String(str || 'BLZ');
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function fallbackCustomerFromKitchen(orderId, kitchen) {
  // Deterministic pseudo-destination (~0.8-1.8km from kitchen) when customer coords are missing.
  const h = hashOrderId(orderId);
  const angle = (h % 360) * (Math.PI / 180);
  const distKm = 0.8 + ((h % 100) / 100); // 0.8 -> 1.8 km

  const dLat = (distKm / 111) * Math.cos(angle);
  const dLng = (distKm / (111 * Math.cos((kitchen.lat || 0) * Math.PI / 180))) * Math.sin(angle);
  return {
    lat: kitchen.lat + dLat,
    lng: kitchen.lng + dLng
  };
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function progressFromPoint(k, c, p) {
  if (!(k && c && p)) return null;
  const dx = c.lng - k.lng;
  const dy = c.lat - k.lat;
  const total = Math.hypot(dx, dy);
  if (!total) return null;
  const done = Math.hypot(p.lng - k.lng, p.lat - k.lat);
  return clamp01(done / total);
}

function riderLatLng(progress) {
  if (!riderRoute) return null;
  const p = clamp01(progress);
  const lat = riderRoute.k.lat + ((riderRoute.c.lat - riderRoute.k.lat) * p);
  const lng = riderRoute.k.lng + ((riderRoute.c.lng - riderRoute.k.lng) * p);
  return [lat, lng];
}

function moveRiderMarker(progress) {
  if (!riderMarkerRef) return;
  const ll = riderLatLng(progress);
  if (!ll) return;
  riderMarkerRef.setLatLng(ll);
}

function startRiderAnimation(status, etaMinutes) {
  if (riderAnimTimer) {
    clearInterval(riderAnimTimer);
    riderAnimTimer = null;
  }
  if (!riderMarkerRef || !riderRoute) return;

  const liveStatuses = ['preparing', 'out_for_delivery'];
  if (!liveStatuses.includes(status)) {
    if (status === 'delivered') {
      riderProgress = 1;
      moveRiderMarker(riderProgress);
    }
    return;
  }

  riderAnimTimer = setInterval(() => {
    if (!riderMarkerRef || !riderRoute) return;

    const target = status === 'preparing' ? 0.55 : 0.995;
    // Keep demo delivery fast: preparing leg ~8s, out-for-delivery leg ~12s.
    const desiredSec = status === 'preparing' ? 8 : 12;
    const etaSec = Math.max(desiredSec, Math.min(desiredSec * 2, (Number(etaMinutes) || 1) * 60));
    const dynamicStep = (target - riderProgress) / etaSec;
    const minStep = status === 'preparing' ? 0.02 : 0.03;
    riderProgress = clamp01(riderProgress + Math.max(minStep, dynamicStep));

    if (status === 'preparing' && riderProgress > 0.55) riderProgress = 0.55;
    if (status === 'out_for_delivery' && riderProgress > 0.995) riderProgress = 0.995;

    moveRiderMarker(riderProgress);

    if (status === 'out_for_delivery' && riderProgress >= 0.995 && currentTrackingOrderId) {
      tryMarkDelivered(currentTrackingOrderId);
    }
  }, 1000);
}

async function tryMarkDelivered(orderId) {
  if (!orderId || deliveryMarkInFlight) return;
  deliveryMarkInFlight = true;
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/delivered/confirm`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      toast('Delivered successfully', 'success');
      await loadOrders();
      await refreshTracking(orderId);
    }
  } catch (_) {
    // ignore transient failures; next tick/poll can retry
  } finally {
    deliveryMarkInFlight = false;
  }
}

function clearTrackLayers() {
  if (!trackMap) return;
  trackLayers.forEach(layer => {
    try { trackMap.removeLayer(layer); } catch (_) { }
  });
  trackLayers = [];
  riderMarkerRef = null;
}

function renderTrackMap(t) {
  if (typeof L === 'undefined') return false;

  const mapEl = document.getElementById('ordTrackMap');
  if (!mapEl) return false;

  // Tracking content gets re-rendered frequently; recreate map against current DOM node.
  if (trackMap) {
    try { trackMap.remove(); } catch (_) { }
    trackMap = null;
    trackLayers = [];
  }

  trackMap = L.map(mapEl, { zoomControl: true, attributionControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(trackMap);

  // Ensure map reuses the current container after modal HTML refresh.
  setTimeout(() => {
    try { trackMap.invalidateSize(); } catch (_) { }
  }, 50);

  clearTrackLayers();

  const k = t.kitchenLocation || {};
  const rawCustomer = t.customerLocation || {};
  const hasCustomerCoords = isNum(rawCustomer.lat) && isNum(rawCustomer.lng);
  const c = hasCustomerCoords
    ? rawCustomer
    : (isNum(k.lat) && isNum(k.lng) ? fallbackCustomerFromKitchen(t.orderId, { lat: k.lat, lng: k.lng }) : rawCustomer);
  const r = getInterpolatedRiderPos(t);
  const boundsPoints = [];

  if (isNum(k.lat) && isNum(k.lng)) {
    const km = L.marker([k.lat, k.lng], { icon: markerIcon('kitchen') }).addTo(trackMap).bindPopup('Blaze Kitchen');
    trackLayers.push(km);
    boundsPoints.push([k.lat, k.lng]);
  }

  if (isNum(c.lat) && isNum(c.lng)) {
    const cm = L.marker([c.lat, c.lng], { icon: markerIcon('customer') }).addTo(trackMap)
      .bindPopup(hasCustomerCoords ? 'Delivery Address' : 'Estimated Destination');
    trackLayers.push(cm);
    boundsPoints.push([c.lat, c.lng]);
  }

  if (isNum(k.lat) && isNum(k.lng) && isNum(c.lat) && isNum(c.lng)) {
    riderRoute = { k: { lat: k.lat, lng: k.lng }, c: { lat: c.lat, lng: c.lng } };

    const payloadProgress = clamp01((t.progressPercent || 0) / 100);
    const riderProgressFromPoint = (r && isNum(r.lat) && isNum(r.lng))
      ? progressFromPoint(riderRoute.k, riderRoute.c, { lat: r.lat, lng: r.lng })
      : null;

    const baseProgress = riderProgressFromPoint != null ? riderProgressFromPoint : payloadProgress;
    if (currentTrackingOrderId && currentTrackingOrderId === t.orderId && ['preparing', 'out_for_delivery'].includes(t.status)) {
      // Keep progress monotonic while tracking modal is open so movement remains visible.
      riderProgress = Math.max(riderProgress, baseProgress);
    } else {
      riderProgress = baseProgress;
    }

    if (t.status === 'preparing') riderProgress = Math.max(0.18, Math.min(0.55, riderProgress));
    if (t.status === 'out_for_delivery') riderProgress = Math.max(0.55, riderProgress);
    if (t.status === 'delivered') riderProgress = 1;

    const riderLL = riderLatLng(riderProgress);
    if (riderLL) {
      const rm = L.marker(riderLL, { icon: markerIcon('rider') }).addTo(trackMap).bindPopup('Delivery Agent');
      riderMarkerRef = rm;
      trackLayers.push(rm);
      boundsPoints.push(riderLL);
    }
  } else if (r && isNum(r.lat) && isNum(r.lng)) {
    const rm = L.marker([r.lat, r.lng], { icon: markerIcon('rider') }).addTo(trackMap).bindPopup('Delivery Agent');
    riderMarkerRef = rm;
    trackLayers.push(rm);
    boundsPoints.push([r.lat, r.lng]);
  }

  if (isNum(k.lat) && isNum(k.lng) && isNum(c.lat) && isNum(c.lng)) {
    const route = L.polyline([[k.lat, k.lng], [c.lat, c.lng]], {
      color: '#6b7280',
      weight: 5,
      opacity: 0.8,
      dashArray: '8 8'
    }).addTo(trackMap);
    trackLayers.push(route);
  }

  if (boundsPoints.length > 1) {
    trackMap.fitBounds(boundsPoints, { padding: [24, 24] });
  } else if (boundsPoints.length === 1) {
    trackMap.setView(boundsPoints[0], 14);
  } else {
    trackMap.setView([12.2958, 76.6394], 12);
  }

  startRiderAnimation(t.status, t.etaMinutes);

  return true;
}

window.openReviewModal = function(orderId, itemIdx) {
  const modal = document.getElementById('reviewModal');
  if (!modal) return;
  const order = orders.find(o => o.orderId === orderId);
  const safeIdx = Number.isInteger(itemIdx) && itemIdx >= 0 ? itemIdx : 0;
  const item = order?.items?.[safeIdx];

  document.getElementById('reviewOrderId').value = orderId;
  document.getElementById('reviewItemIdx').value = safeIdx;
  const lbl = document.getElementById('reviewItemLabel');
  if (lbl) lbl.textContent = item ? `Item: ${item.name}` : 'Item review';
  document.getElementById('reviewRating').value = 5;
  document.getElementById('reviewComment').value = '';
  document.getElementById('reviewPhotos').value = '';
  reviewPastedImages = [];
  renderReviewPastedPreview();
  showOverlayModal('reviewModal');
  document.getElementById('reviewPasteZone')?.focus();
};

function firstReviewableItemIndex(order) {
  if (!order?.items?.length) return 0;
  const idx = order.items.findIndex(i => !i.review || !i.review.rating);
  return idx >= 0 ? idx : 0;
}

window.closeReviewModal = function() {
  hideOverlayModal('reviewModal');
};

window.submitItemReview = async function() {
  const orderId = document.getElementById('reviewOrderId').value;
  const itemIdx = document.getElementById('reviewItemIdx').value;
  const rating = Number(document.getElementById('reviewRating').value);
  const comment = document.getElementById('reviewComment').value.trim();
  const manualPhotoUrls = (document.getElementById('reviewPhotos').value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const photoUrls = [...manualPhotoUrls, ...reviewPastedImages].slice(0, 4);

  try {
    if (reviewPastedImages.length) {
      const totalBytes = new TextEncoder().encode(JSON.stringify(reviewPastedImages)).length;
      if (totalBytes > 1400000) {
        toast('Pasted images are too large. Paste smaller images.', 'error');
        return;
      }
    }

    const res = await fetch(`${API_BASE}/orders/${orderId}/items/${itemIdx}/review`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rating, comment, photoUrls })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Review failed');

    toast('Review submitted successfully', 'success');
    closeReviewModal();
    reviewPastedImages = [];
    renderReviewPastedPreview();
    await loadOrders();
  } catch (err) {
    toast(err.message || 'Review submit failed', 'error');
  }
};

window.openRefundModal = function(orderId, prefill = {}) {
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return;

  document.getElementById('refundOrderId').value = orderId;
  const lbl = document.getElementById('refundOrderLabel');
  if (lbl) lbl.textContent = `Order: ${orderId}`;
  document.getElementById('refundReason').value = (prefill.reason || '').trim();
  document.getElementById('refundAmount').value = '';

  const rawProofs = Array.isArray(prefill.proofUrls) ? prefill.proofUrls : [];
  const validProofs = rawProofs
    .filter(u => typeof u === 'string' && u.trim())
    .slice(0, 4);
  const pastedProofs = validProofs.filter(u => String(u).startsWith('data:image/'));
  const manualProofs = validProofs.filter(u => !String(u).startsWith('data:image/'));

  document.getElementById('refundProofUrls').value = manualProofs.join(', ');
  refundPastedImages = pastedProofs;
  renderRefundPastedPreview();
  showOverlayModal('refundModal');
  document.getElementById('refundPasteZone')?.focus();
};

window.closeRefundModal = function() {
  hideOverlayModal('refundModal');
};

window.requestRefund = function(orderId) {
  openRefundModal(orderId);
};

window.openRefundFromReviewModal = function() {
  const orderId = document.getElementById('reviewOrderId')?.value;
  if (!orderId) {
    toast('Unable to identify order for refund request', 'error');
    return;
  }

  const reason = document.getElementById('reviewComment')?.value?.trim() || '';
  const manualPhotoUrls = (document.getElementById('reviewPhotos')?.value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const proofUrls = [...manualPhotoUrls, ...reviewPastedImages].slice(0, 4);

  closeReviewModal();
  openRefundModal(orderId, { reason, proofUrls });
};

window.submitRefundRequest = async function() {
  const orderId = document.getElementById('refundOrderId').value;
  const reason = document.getElementById('refundReason').value.trim();
  const amountRaw = document.getElementById('refundAmount').value;
  const amount = Number(amountRaw);
  const manualProofUrls = (document.getElementById('refundProofUrls').value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const proofUrls = [...manualProofUrls, ...refundPastedImages].slice(0, 4);

  if (!reason) {
    toast('Please enter refund reason', 'error');
    return;
  }

  if (refundPastedImages.length) {
    const totalBytes = new TextEncoder().encode(JSON.stringify(refundPastedImages)).length;
    if (totalBytes > 1400000) {
      toast('Pasted proof images are too large. Paste smaller images.', 'error');
      return;
    }
  }

  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/refund/request`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason,
        amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
        proofUrls
      })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Refund request failed');

    toast('Refund request submitted', 'info');
    closeRefundModal();
    refundPastedImages = [];
    renderRefundPastedPreview();
    await loadOrders();
  } catch (err) {
    toast(err.message || 'Refund request failed', 'error');
  }
};

/* ══════════════════════════════════════════════
   CANCEL ORDER — smart (1-minute window logic)
   ══════════════════════════════════════════════ */
let _pendingCancelOrderId = null;  // holds orderId while reason modal is open

window.cancelOrder = async function(orderId) {
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return;

  const ageMs        = Date.now() - new Date(order.createdAt).getTime();
  const withinOneMin = ageMs <= 60 * 1000;

  if (withinOneMin) {
    // ── Instant cancel (confirm dialog only) ──
    if (!confirm('Cancel this order? You placed it less than a minute ago.')) return;

    try {
      const res  = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
        method:  'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        toast('Order cancelled successfully ✅', 'success');
        await loadOrders();
      } else {
        toast(data.message || 'Failed to cancel', 'error');
      }
    } catch (err) {
      toast('Failed to cancel order', 'error');
    }
    return;
  }

  // ── After 1 minute: show reason modal ──
  _pendingCancelOrderId = orderId;
  document.getElementById('cancelReasonText').value = '';
  showOverlayModal('cancelReasonModal');
};

window.closeCancelReasonModal = function() {
  _pendingCancelOrderId = null;
  hideOverlayModal('cancelReasonModal');
};

window.submitCancelRequest = async function() {
  const reason = document.getElementById('cancelReasonText').value.trim();
  if (!reason) {
    toast('Please enter a reason for cancellation', 'error');
    return;
  }
  if (!_pendingCancelOrderId) return;

  const btn = document.getElementById('submitCancelRequestBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…';

  try {
    const res  = await fetch(`${API_BASE}/orders/${_pendingCancelOrderId}/cancel`, {
      method:  'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ reason })
    });
    const data = await res.json();

    if (data.success && !data.autoCancel) {
      toast('Cancel request submitted. Our team will review it shortly. 🕐', 'info');
      closeCancelReasonModal();
      await loadOrders();
    } else if (data.success && data.autoCancel) {
      toast('Order cancelled successfully ✅', 'success');
      closeCancelReasonModal();
      await loadOrders();
    } else {
      toast(data.message || 'Failed to submit request', 'error');
    }
  } catch (err) {
    toast('Failed to submit cancel request', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request';
  }
};

/* Check for unread admin responses (cancel request approved / rejected) */
function checkUnreadNotifications() {
  const shownKey = 'blaze_shown_notifs';
  const shown    = JSON.parse(localStorage.getItem(shownKey) || '[]');

  orders.forEach(async order => {
    const notif = order.userNotification;
    if (!notif || !notif.message || notif.read) return;

    // Unique key per order notification
    const key = `${order.orderId}_notif`;
    if (shown.includes(key)) return;

    // Show the message
    const type = notif.type === 'success' ? 'success' : 'error';
    toastLong(notif.message, type);

    // Mark as read on backend
    try {
      await fetch(`${API_BASE}/orders/${order.orderId}/notification/read`, {
        method:  'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (_) { /* silent */ }

    shown.push(key);
    localStorage.setItem(shownKey, JSON.stringify(shown));
  });
}

/* Long-duration toast for admin responses */
function toastLong(message, type = 'default') {
  const container = document.getElementById('ordToastContainer');
  const icons = { success: '✅', error: '🔥', info: 'ℹ️', default: '🔔' };
  const el = document.createElement('div');
  el.className = `ord-toast ${type}`;
  el.style.maxWidth = '340px';
  el.style.padding  = '14px 18px';
  el.style.lineHeight = '1.5';
  el.innerHTML = `<span style="font-size:1.1rem">${icons[type] || icons.default}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 7000);  // stays for 7 seconds
}

/* ══════════════════════════════════════════════
   PDF BILL DOWNLOAD
   ══════════════════════════════════════════════ */
window.downloadBill = function(orderId) {
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFillColor(255, 94, 0);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('BLAZE KITCHEN', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Fire-Crafted Excellence', pageWidth / 2, 28, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Cloud Kitchen | Bangalore', pageWidth / 2, 35, { align: 'center' });

  y = 52;

  // Order info bar
  doc.setFillColor(245, 245, 240);
  doc.rect(14, y - 6, pageWidth - 28, 20, 'F');
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Order #${order.orderId}`, 20, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Date: ${formatDate(order.createdAt)}`, pageWidth - 20, y + 2, { align: 'right' });
  doc.text(`Status: ${STATUS_META[order.status]?.label || order.status}`, 20, y + 10);

  const payLabels = { upi: 'UPI', card: 'Card', wallet: 'Wallet', cod: 'Cash on Delivery' };
  doc.text(`Payment: ${payLabels[order.paymentMethod] || order.paymentMethod}`, pageWidth - 20, y + 10, { align: 'right' });

  y += 26;

  // Customer info
  if (user) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(user.name || 'Customer', 45, y);
    y += 6;
    doc.text(user.email || '', 45, y);
    y += 6;
  }

  // Delivery address
  const addr = order.address || {};
  if (addr.line1) {
    doc.setFont('helvetica', 'bold');
    doc.text('Deliver To:', 20, y);
    doc.setFont('helvetica', 'normal');
    const addrText = `${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}, ${addr.city || ''} - ${addr.pin || ''}`;
    doc.text(addrText, 52, y);
    y += 10;
  }

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Table header
  doc.setFillColor(50, 50, 50);
  doc.rect(14, y - 5, pageWidth - 28, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM', 20, y + 1);
  doc.text('QTY', 120, y + 1, { align: 'center' });
  doc.text('PRICE', 150, y + 1, { align: 'center' });
  doc.text('TOTAL', pageWidth - 20, y + 1, { align: 'right' });

  y += 10;
  doc.setTextColor(30, 30, 30);

  // Items
  const items = order.items || [];
  items.forEach((item, i) => {
    const bg = i % 2 === 0 ? 255 : 248;
    doc.setFillColor(bg, bg, bg - 3);
    doc.rect(14, y - 5, pageWidth - 28, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // Truncate long names
    const name = item.name.length > 35 ? item.name.substring(0, 35) + '…' : item.name;
    doc.text(name, 20, y + 1);
    doc.text(`${item.quantity}`, 120, y + 1, { align: 'center' });
    doc.text(`Rs. ${item.price}`, 150, y + 1, { align: 'center' });
    doc.text(`Rs. ${item.price * item.quantity}`, pageWidth - 20, y + 1, { align: 'right' });

    y += 10;
  });

  // Divider
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(110, y, pageWidth - 14, y);
  y += 8;

  // Bill summary
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const addBillLine = (label, value, opts = {}) => {
    if (opts.bold) doc.setFont('helvetica', 'bold');
    if (opts.color) doc.setTextColor(...opts.color);
    doc.text(label, 120, y);
    doc.text(value, pageWidth - 20, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    y += 7;
  };

  addBillLine('Subtotal', `Rs. ${order.subtotal}`);
  if (order.discount > 0) {
    addBillLine(`Discount ${order.coupon ? '(' + order.coupon + ')' : ''}`, `-Rs. ${order.discount}`, { color: [34, 197, 94] });
  }
  addBillLine('Delivery Fee', order.deliveryFee === 0 ? 'FREE' : `Rs. ${order.deliveryFee}`);
  addBillLine('CGST (2.5%)',    `Rs. ${order.cgst || Math.round((order.gst||0)/2)}`);
  addBillLine('SGST (2.5%)',    `Rs. ${order.sgst || Math.round((order.gst||0)/2)}`);
  addBillLine('Packaging (7%)', `Rs. ${order.packagingFee || Math.round(Math.max(0,(order.subtotal||0)-(order.discount||0))*0.07)}`, { color: [255, 94, 0] });

  y += 2;
  doc.setDrawColor(255, 94, 0);
  doc.setLineWidth(0.5);
  doc.line(110, y, pageWidth - 14, y);
  y += 8;

  doc.setFillColor(255, 94, 0);
  doc.rect(110, y - 6, pageWidth - 124, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', 116, y + 2);
  doc.text(`Rs. ${order.total}`, pageWidth - 20, y + 2, { align: 'right' });

  // Footer
  y += 24;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for ordering from Blaze Kitchen!', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text('This is a computer generated bill.', pageWidth / 2, y, { align: 'center' });

  // Save
  doc.save(`BlazeKitchen_${order.orderId}.pdf`);
  toast('Bill downloaded!', 'success');
};

/* ══════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════ */
function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── TOAST ── */
function toast(message, type = 'default') {
  const container = document.getElementById('ordToastContainer');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', default: '🔥' };
  const el = document.createElement('div');
  el.className = `ord-toast ${type}`;
  el.innerHTML = `<span>${icons[type] || icons.default}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}
