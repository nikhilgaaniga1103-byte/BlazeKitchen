/* =============================================
   BLAZE KITCHEN — mood-order.js
   User-facing mood recommendation flow
   ============================================= */

'use strict';

function resolveApiBase() {
  // Supports localhost, LAN IPs, and same-machine dev without hardcoding host.
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    return `${window.location.protocol}//${window.location.hostname}:5000/api`;
  }
  return 'http://localhost:5000/api';
}

const API_BASE = resolveApiBase();
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=900&q=80';
const GST_RATE = 0.05;
const PACKAGING_RATE = 0.07;

const state = {
  moods: [],
  selectedMood: '',
  recommendations: [],
  cart: [],
};

const refs = {
  moodOptions: null,
  foodPreference: null,
  healthGoal: null,
  budget: null,
  getRecommendationsBtn: null,
  clearFiltersBtn: null,
  resultMeta: null,
  recommendationGrid: null,
  emptyState: null,
  loadingState: null,
  formHint: null,
  viewCartBtn: null,
  cartCountBadge: null,
  cartSummaryText: null,
  clearCartBtn: null,
  checkoutBtn: null,
  gymTracker: null,
  gymProteinValue: null,
  gymCaloriesValue: null,
  moodCartOverlay: null,
  moodCartPanel: null,
  closeMoodCartBtn: null,
  moodCartCountText: null,
  moodCartItems: null,
  moodCartSubtotal: null,
  moodCartGst: null,
  moodCartPackaging: null,
  moodCartGrandTotal: null,
  moodCartCheckoutBtn: null,
};

let moodSSE = null;
let moodSSEClosedByApp = false;
let moodSSEReconnectTimer = null;
let moodRefreshTimer = null;
let isMoodRefreshInFlight = false;

function bindRefs() {
  refs.moodOptions = document.getElementById('moodOptions');
  refs.foodPreference = document.getElementById('foodPreference');
  refs.healthGoal = document.getElementById('healthGoal');
  refs.budget = document.getElementById('budget');
  refs.getRecommendationsBtn = document.getElementById('getRecommendationsBtn');
  refs.clearFiltersBtn = document.getElementById('clearFiltersBtn');
  refs.resultMeta = document.getElementById('resultMeta');
  refs.recommendationGrid = document.getElementById('recommendationGrid');
  refs.emptyState = document.getElementById('emptyState');
  refs.loadingState = document.getElementById('loadingState');
  refs.formHint = document.getElementById('formHint');
  refs.viewCartBtn = document.getElementById('viewCartBtn');
  refs.cartCountBadge = document.getElementById('cartCountBadge');
  refs.cartSummaryText = document.getElementById('cartSummaryText');
  refs.clearCartBtn = document.getElementById('clearCartBtn');
  refs.checkoutBtn = document.getElementById('checkoutBtn');
  refs.gymTracker = document.getElementById('gymTracker');
  refs.gymProteinValue = document.getElementById('gymProteinValue');
  refs.gymCaloriesValue = document.getElementById('gymCaloriesValue');
  refs.moodCartOverlay = document.getElementById('moodCartOverlay');
  refs.moodCartPanel = document.getElementById('moodCartPanel');
  refs.closeMoodCartBtn = document.getElementById('closeMoodCartBtn');
  refs.moodCartCountText = document.getElementById('moodCartCountText');
  refs.moodCartItems = document.getElementById('moodCartItems');
  refs.moodCartSubtotal = document.getElementById('moodCartSubtotal');
  refs.moodCartGst = document.getElementById('moodCartGst');
  refs.moodCartPackaging = document.getElementById('moodCartPackaging');
  refs.moodCartGrandTotal = document.getElementById('moodCartGrandTotal');
  refs.moodCartCheckoutBtn = document.getElementById('moodCartCheckoutBtn');

  return !!(
    refs.moodOptions &&
    refs.foodPreference &&
    refs.healthGoal &&
    refs.budget &&
    refs.getRecommendationsBtn &&
    refs.clearFiltersBtn &&
    refs.resultMeta &&
    refs.recommendationGrid &&
    refs.emptyState &&
    refs.loadingState &&
    refs.formHint &&
    refs.viewCartBtn &&
    refs.cartCountBadge &&
    refs.cartSummaryText &&
    refs.clearCartBtn &&
    refs.checkoutBtn &&
    refs.gymTracker &&
    refs.gymProteinValue &&
    refs.gymCaloriesValue &&
    refs.moodCartOverlay &&
    refs.moodCartPanel &&
    refs.closeMoodCartBtn &&
    refs.moodCartCountText &&
    refs.moodCartItems &&
    refs.moodCartSubtotal &&
    refs.moodCartGst &&
    refs.moodCartPackaging &&
    refs.moodCartGrandTotal &&
    refs.moodCartCheckoutBtn
  );
}

function renderGymTracker(totalProtein, totalCalories, isGymMood) {
  if (!refs.gymTracker || !refs.gymProteinValue || !refs.gymCaloriesValue) return;

  refs.gymTracker.style.display = isGymMood ? 'block' : 'none';
  refs.gymProteinValue.innerHTML = `${Math.max(0, Math.round(totalProtein))}<span>g</span>`;
  refs.gymCaloriesValue.innerHTML = `${Math.max(0, Math.round(totalCalories))}<span>kcal</span>`;
}

function safeText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function titleCaseMood(value) {
  return String(value || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function parseBudget() {
  const raw = refs.budget.value.trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function showLoading(isLoading) {
  refs.loadingState.style.display = isLoading ? 'block' : 'none';
  refs.getRecommendationsBtn.disabled = isLoading;
}

function sanitizeCart() {
  if (!Array.isArray(state.cart)) {
    state.cart = [];
    return;
  }

  state.cart = state.cart
    .filter((item) => item && String(item.name || '').trim())
    .map((item) => ({
      id: item.id || item._id || Date.now() + Math.floor(Math.random() * 1000),
      name: String(item.name || '').trim(),
      price: Number(item.price) > 0 ? Math.round(Number(item.price)) : 0,
      category: String(item.category || '').trim() || 'Mood Special',
      image: String(item.image || '').trim() || FALLBACK_IMG,
      source: String(item.source || 'blaze').trim().toLowerCase() === 'mood' ? 'mood' : 'blaze',
      calories: Number(item.calories) > 0 ? Math.round(Number(item.calories)) : 0,
      protein: Number(item.protein) > 0 ? Math.round(Number(item.protein)) : 0,
      quantity: Number(item.quantity) > 0 ? Math.round(Number(item.quantity)) : 1,
    }));
}

function loadCart() {
  try {
    const raw = localStorage.getItem('blaze_cart');
    state.cart = raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Cart load failed:', err);
    state.cart = [];
  }

  sanitizeCart();
  saveCart();
}

function saveCart() {
  localStorage.setItem('blaze_cart', JSON.stringify(state.cart));
}

function sourceLabel(source) {
  return source === 'mood' ? 'Mood Based' : 'Blaze Kitchen';
}

function renderCombinedCartDrawer() {
  if (!refs.moodCartItems) return;

  const totalQty = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = state.cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const gst = Math.round(subtotal * GST_RATE);
  const packaging = Math.round(subtotal * PACKAGING_RATE);
  const total = subtotal + gst + packaging;

  refs.moodCartCountText.textContent = `${totalQty} item${totalQty === 1 ? '' : 's'}`;
  refs.moodCartSubtotal.textContent = `₹${subtotal}`;
  refs.moodCartGst.textContent = `₹${gst}`;
  refs.moodCartPackaging.textContent = `₹${packaging}`;
  refs.moodCartGrandTotal.textContent = `₹${total}`;

  if (!state.cart.length) {
    refs.moodCartItems.innerHTML = '<div class="mo-cart-empty"><i class="fas fa-basket-shopping"></i><p>Your combined cart is empty.</p></div>';
    refs.moodCartCheckoutBtn.disabled = true;
    return;
  }

  refs.moodCartCheckoutBtn.disabled = false;
  refs.moodCartItems.innerHTML = state.cart.map((item, index) => {
    const lineTotal = item.price * item.quantity;
    return `
      <article class="mo-cart-item">
        <img src="${safeText(item.image || FALLBACK_IMG)}" alt="${safeText(item.name)}" onerror="this.src='${FALLBACK_IMG}'" />
        <div>
          <p class="mo-cart-item-name">${safeText(item.name)}</p>
          <p class="mo-cart-item-meta">₹${safeText(item.price)} x ${safeText(item.quantity)} = ₹${safeText(lineTotal)}</p>
          <span class="mo-cart-source">${safeText(sourceLabel(item.source))}</span>
        </div>
        <div class="mo-cart-actions">
          <button type="button" class="mo-cart-qty-btn" data-action="decrease" data-index="${index}" aria-label="Decrease item quantity">-</button>
          <span class="mo-cart-qty-val">${safeText(item.quantity)}</span>
          <button type="button" class="mo-cart-qty-btn" data-action="increase" data-index="${index}" aria-label="Increase item quantity">+</button>
          <button type="button" class="mo-cart-del-btn" data-action="remove" data-index="${index}" aria-label="Remove item"><i class="fas fa-trash"></i></button>
        </div>
      </article>
    `;
  }).join('');
}

function openCombinedCart() {
  renderCombinedCartDrawer();
  refs.moodCartOverlay.classList.add('open');
  refs.moodCartPanel.classList.add('open');
  refs.moodCartOverlay.setAttribute('aria-hidden', 'false');
  refs.moodCartPanel.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeCombinedCart() {
  refs.moodCartOverlay.classList.remove('open');
  refs.moodCartPanel.classList.remove('open');
  refs.moodCartOverlay.setAttribute('aria-hidden', 'true');
  refs.moodCartPanel.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function updateCartItemByIndex(index, delta) {
  const item = state.cart[index];
  if (!item) return;
  const nextQty = (Number(item.quantity) || 0) + delta;
  if (nextQty <= 0) {
    state.cart.splice(index, 1);
  } else {
    item.quantity = nextQty;
  }
  saveCart();
  renderCartSummary();
  renderCombinedCartDrawer();
}

function removeCartItemByIndex(index) {
  if (index < 0 || index >= state.cart.length) return;
  state.cart.splice(index, 1);
  saveCart();
  renderCartSummary();
  renderCombinedCartDrawer();
}

function syncCartFromStorage() {
  loadCart();
  renderCartSummary();
  renderCombinedCartDrawer();
}

function renderCartSummary() {
  const totalQty = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = state.cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const totalCalories = state.cart.reduce((sum, item) => sum + (item.quantity * (Number(item.calories) || 0)), 0);
  const totalProtein = state.cart.reduce((sum, item) => sum + (item.quantity * (Number(item.protein) || 0)), 0);
  const isGymMood = state.selectedMood === 'gym';

  renderGymTracker(totalProtein, totalCalories, isGymMood);

  refs.cartCountBadge.textContent = String(totalQty);

  if (!totalQty) {
    refs.cartSummaryText.textContent = 'Your cart is empty.';
    refs.checkoutBtn.disabled = true;
    refs.clearCartBtn.disabled = true;
    return;
  }

  const baseSummary = `${totalQty} item${totalQty === 1 ? '' : 's'} • Subtotal ₹${subtotal}`;
  if (isGymMood) {
    refs.cartSummaryText.textContent = `${baseSummary} • ${totalProtein}g protein • ${totalCalories} kcal`;
  } else {
    refs.cartSummaryText.textContent = baseSummary;
  }

  refs.checkoutBtn.disabled = false;
  refs.clearCartBtn.disabled = false;
}

function addRecommendationToCart(item) {
  const name = String(item?.itemName || '').trim();
  if (!name) {
    setHint('Could not add this item to cart.', true);
    return;
  }

  const existing = state.cart.find((cartItem) => cartItem.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.quantity += 1;
    existing.source = 'mood';
    if ((existing.calories || 0) <= 0 && Number(item.calories) > 0) existing.calories = Math.round(Number(item.calories));
    if ((existing.protein || 0) <= 0 && Number(item.protein) > 0) existing.protein = Math.round(Number(item.protein));
  } else {
    state.cart.push({
      id: item._id || item.id || Date.now(),
      name,
      price: Number(item.price) > 0 ? Math.round(Number(item.price)) : 0,
      category: String(item.categoryName || 'Mood Special'),
      image: String(item.image_url || FALLBACK_IMG),
      source: 'mood',
      calories: Number(item.calories) > 0 ? Math.round(Number(item.calories)) : 0,
      protein: Number(item.protein) > 0 ? Math.round(Number(item.protein)) : 0,
      quantity: 1,
    });
  }

  saveCart();
  renderCartSummary();
  renderCombinedCartDrawer();
  setHint(`${name} added to cart.`, false);
}

function clearCart() {
  state.cart = [];
  saveCart();
  renderCartSummary();
  renderCombinedCartDrawer();
  setHint('Cart cleared.', false);
}

function openCheckout() {
  if (!state.cart.length) {
    setHint('Your cart is empty. Add items first.', true);
    return;
  }
  window.location.href = 'checkout.html';
}

function viewCartDetails() {
  if (!state.cart.length) {
    setHint('Your cart is empty. Add mood recommendations first.', true);
    return;
  }

  openCombinedCart();
}

function setHint(message, isError) {
  refs.formHint.textContent = message;
  refs.formHint.style.color = isError ? '#ef4444' : '';
}

function renderMoodOptions() {
  const moods = state.moods || [];

  if (!moods.length) {
    refs.moodOptions.innerHTML = '<button class="mo-chip mo-chip-loading" type="button"><i class="fas fa-triangle-exclamation"></i> No mood categories available.</button>';
    return;
  }

  refs.moodOptions.innerHTML = moods
    .map((mood) => {
      const isActive = mood.slug === state.selectedMood;
      return `
        <button type="button"
                class="mo-chip ${isActive ? 'active' : ''}"
                data-mood-slug="${safeText(mood.slug)}"
                title="${safeText(mood.description || mood.label || mood.slug)}">
          <i class="fas fa-face-smile"></i>
          <span>${safeText(mood.label || titleCaseMood(mood.slug))}</span>
        </button>
      `;
    })
    .join('');

  refs.moodOptions.querySelectorAll('[data-mood-slug]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedMood = btn.dataset.moodSlug || '';
      renderMoodOptions();
      renderCartSummary();
      setHint('Mood selected. Click Get Recommendations.', false);
    });
  });
}

function renderRecommendations(items, query) {
  const list = items || [];

  refs.recommendationGrid.innerHTML = '';

  if (!list.length) {
    refs.emptyState.style.display = 'block';
    refs.emptyState.innerHTML = '<i class="fas fa-bowl-food"></i><p>No matching mood items found. Try a different mood or remove budget limit.</p>';
    refs.resultMeta.textContent = '0 items found for current selection.';
    return;
  }

  refs.emptyState.style.display = 'none';
  refs.resultMeta.textContent = `${list.length} recommendation${list.length > 1 ? 's' : ''} for ${titleCaseMood(query.mood || '')}.`;

  refs.recommendationGrid.innerHTML = list
    .map((item, index) => {
      const whyList = (item.whyThisFood || []).slice(0, 4);
      const image = item.image_url || FALLBACK_IMG;

      return `
        <article class="mo-card">
          <div class="mo-card-media">
            <img src="${safeText(image)}" alt="${safeText(item.itemName || 'Mood item')}" loading="lazy" onerror="this.src='${FALLBACK_IMG}'" />
            <span class="mo-price-pill">₹${safeText(item.price)}</span>
          </div>
          <div class="mo-card-body">
            <h3 class="mo-item-name">${safeText(item.itemName || 'Unnamed Item')}</h3>
            <p class="mo-item-sub">${safeText(item.categoryName || '—')} / ${safeText(item.subcategoryName || '—')}</p>

            <div class="mo-metrics">
              <span class="mo-metric">${safeText(item.calories)} kcal</span>
              <span class="mo-metric">${safeText(item.protein)}g protein</span>
              <span class="mo-metric">${safeText(item.prepTime)} min prep</span>
            </div>

            <div class="mo-why-box">
              <h4>Why this food?</h4>
              <ul class="mo-why-list">
                ${whyList.map((why) => `<li>${safeText(why)}</li>`).join('')}
              </ul>
            </div>

            <span class="mo-item-score"><i class="fas fa-check-circle"></i> Match score: ${safeText(Math.round(item.score || 0))}</span>

            <div class="mo-card-actions">
              <button class="mo-btn mo-btn-primary mo-add-to-cart" type="button" data-rec-index="${safeText(index)}">
                <i class="fas fa-cart-plus"></i>
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  refs.recommendationGrid.querySelectorAll('.mo-add-to-cart').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.getAttribute('data-rec-index'));
      if (!Number.isInteger(index) || index < 0 || index >= state.recommendations.length) return;
      addRecommendationToCart(state.recommendations[index]);
    });
  });
}

async function loadMoodCategories() {
  try {
    const res = await fetch(`${API_BASE}/mood/categories`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Could not load mood categories');
    }

    state.moods = json.data || [];
    if (!state.selectedMood && state.moods.length) {
      state.selectedMood = state.moods[0].slug;
      setHint('Pick your preferences and click Get Recommendations.', false);
    }

    renderMoodOptions();
  } catch (err) {
    console.error('Mood category load error:', err);
    state.moods = [];
    renderMoodOptions();
    setHint('Could not load mood categories from server.', true);
  }
}

async function fetchRecommendations() {
  if (!state.selectedMood) {
    setHint('Please select a mood first.', true);
    return;
  }

  const payload = {
    mood: state.selectedMood,
    foodPreference: refs.foodPreference.value,
    healthGoal: refs.healthGoal.value,
    budget: parseBudget(),
  };

  showLoading(true);
  refs.emptyState.style.display = 'none';
  refs.recommendationGrid.innerHTML = '';

  try {
    const res = await fetch(`${API_BASE}/mood/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Failed to fetch recommendations');
    }

    state.recommendations = json.data?.recommendations || [];
    renderRecommendations(state.recommendations, json.data?.query || payload);
    setHint('Recommendations updated from latest admin mood mappings.', false);
  } catch (err) {
    console.error('Mood recommendation error:', err);
    refs.emptyState.style.display = 'block';
    refs.emptyState.innerHTML = '<i class="fas fa-triangle-exclamation"></i><p>Could not fetch recommendations right now. Please try again.</p>';
    refs.resultMeta.textContent = 'Failed to load recommendations.';
    setHint(err.message || 'Failed to fetch recommendations.', true);
  } finally {
    showLoading(false);
  }
}

function resetFormState() {
  refs.foodPreference.value = 'both';
  refs.healthGoal.value = '';
  refs.budget.value = '';
  state.recommendations = [];
  refs.resultMeta.textContent = 'No recommendations yet.';
  refs.recommendationGrid.innerHTML = '';
  refs.emptyState.style.display = 'block';
  refs.emptyState.innerHTML = '<i class="fas fa-bowl-food"></i><p>Select mood and click <strong>Get Recommendations</strong>.</p>';
  setHint('Filters reset. Choose your mood and preferences.', false);
}

function clearMoodSSEReconnectTimer() {
  if (moodSSEReconnectTimer) {
    clearTimeout(moodSSEReconnectTimer);
    moodSSEReconnectTimer = null;
  }
}

function clearMoodRefreshTimer() {
  if (moodRefreshTimer) {
    clearTimeout(moodRefreshTimer);
    moodRefreshTimer = null;
  }
}

async function refreshFromMoodSSE(reasonText) {
  if (isMoodRefreshInFlight) return;
  isMoodRefreshInFlight = true;

  try {
    await loadMoodCategories();
    if (state.selectedMood) {
      await fetchRecommendations();
    }
    setHint(`Live update received (${reasonText}). Recommendations refreshed.`, false);
  } catch (err) {
    console.error('SSE mood refresh failed:', err);
    setHint('Live update received, but refresh failed. Please try again.', true);
  } finally {
    isMoodRefreshInFlight = false;
  }
}

function queueMoodRefresh(reasonText) {
  clearMoodRefreshTimer();
  moodRefreshTimer = setTimeout(() => {
    refreshFromMoodSSE(reasonText || 'mood data changed');
  }, 350);
}

function connectMoodSSE() {
  if (!window.EventSource || moodSSE) return;

  moodSSEClosedByApp = false;
  const source = new EventSource(`${API_BASE}/events/public`);
  moodSSE = source;

  source.addEventListener('connected', () => {
    setHint('Live updates connected.', false);
  });

  source.addEventListener('mood-updated', (event) => {
    try {
      const payload = JSON.parse(event.data || '{}');
      const reason = payload.action ? String(payload.action).replace(/-/g, ' ') : 'mood data changed';
      queueMoodRefresh(reason);
    } catch {
      queueMoodRefresh('mood data changed');
    }
  });

  source.onerror = () => {
    if (moodSSEClosedByApp) return;

    if (source.readyState === EventSource.CLOSED) {
      moodSSE = null;
      clearMoodSSEReconnectTimer();
      moodSSEReconnectTimer = setTimeout(connectMoodSSE, 3000);
    }
  };
}

function closeMoodSSE() {
  moodSSEClosedByApp = true;
  clearMoodSSEReconnectTimer();
  clearMoodRefreshTimer();
  if (moodSSE) {
    moodSSE.close();
    moodSSE = null;
  }
}

function bindEvents() {
  if (!refs.getRecommendationsBtn || !refs.clearFiltersBtn || !refs.budget) return;

  refs.getRecommendationsBtn.addEventListener('click', fetchRecommendations);
  refs.clearFiltersBtn.addEventListener('click', resetFormState);
  refs.budget.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchRecommendations();
    }
  });

  refs.viewCartBtn.addEventListener('click', viewCartDetails);
  refs.clearCartBtn.addEventListener('click', clearCart);
  refs.checkoutBtn.addEventListener('click', openCheckout);
  refs.closeMoodCartBtn.addEventListener('click', closeCombinedCart);
  refs.moodCartOverlay.addEventListener('click', closeCombinedCart);
  refs.moodCartCheckoutBtn.addEventListener('click', openCheckout);

  refs.moodCartItems.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const index = Number(btn.getAttribute('data-index'));
    if (!Number.isInteger(index) || index < 0) return;
    const action = btn.getAttribute('data-action');
    if (action === 'increase') updateCartItemByIndex(index, 1);
    if (action === 'decrease') updateCartItemByIndex(index, -1);
    if (action === 'remove') removeCartItemByIndex(index);
  });

  window.addEventListener('storage', (event) => {
    if (event.key === 'blaze_cart') syncCartFromStorage();
  });
}

function initMoodOrderPage() {
  const ok = bindRefs();
  if (!ok) {
    console.error('Mood page initialization failed: required DOM nodes not found.');
    return;
  }

  bindEvents();
  loadCart();
  renderCartSummary();
  renderCombinedCartDrawer();
  loadMoodCategories();
  connectMoodSSE();

  window.addEventListener('beforeunload', closeMoodSSE);
  window.addEventListener('pagehide', closeMoodSSE);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMoodOrderPage);
} else {
  initMoodOrderPage();
}
