/* ============================================================
   BLAZE KITCHEN — checkout.js
   Full checkout page: addresses, payment, coupon, order summary
   ============================================================ */
'use strict';

/* ── CONSTANTS ── */
const DELIVERY_FEE_FIRST     = 0;   // FREE for first order
const DELIVERY_FEE_RETURNING = 40;  // ₹40 flat for 2nd order onwards
const CGST_RATE              = 0.025;  // Central GST 2.5%
const SGST_RATE              = 0.025;  // State GST   2.5%
const PACKAGING_RATE         = 0.07;   // Packaging charges 7%
const COUPONS = { BLAZE50: 50, FIRST100: 100, MIDNIGHT: 80, VIP200: 200, WELCOME: 120 };
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=85';

/* ── BLAZE KITCHEN LOCATION — Keshava Iyengar Rd, Mysore ── */
const BLAZE_LAT   = 12.3098;
const BLAZE_LNG   = 76.6559;
const MAX_DELIVERY_KM = 20;  // 20 km radius

/**
 * Valid Mysore-area PIN codes within ~20 km of Blaze Kitchen.
 * Covers Mysuru city, surrounding taluks & nearby areas.
 */
const MYSORE_VALID_PINS = new Set([
  '570001','570002','570003','570004','570005','570006','570007','570008',
  '570009','570010','570011','570012','570013','570014','570015','570016',
  '570017','570018','570019','570020','570021','570022','570023','570024',
  '570025','570026','570027','570028','570029','570030','570031',
  '571102','571104','571105','571106','571107','571108',
  '571111','571114','571116','571117','571118','571119',
  '571120','571121','571122','571124','571125','571126','571127','571128',
  '571130','571134',
  '571186','571187','571189',
  '571311','571312','571313','571314','571315','571316','571320',
  '571401','571402','571403','571404','571405',
  '571440','571441','571443','571444','571445',
  '571602','571604','571606','571607','571610',
  '571801','571802','571807','571811','571812',
  '570033','570034',
]);

/* ── STATE ── */
let coState = {
  cart:            [],
  user:            null,
  addresses:       [],
  selectedAddress: null,
  discount:        0,
  appliedCoupon:   '',
  paymentMethod:   'upi',
  isReturning:     false,
  userLat:         null,
  userLng:         null,
  distanceKm:      null,
  deliveryMode:    'asap',
  scheduledFor:    '',
};

function getAddressStorageKeys(user) {
  const rawId = user ? (user._id || user.id || user.email || 'guest') : 'guest';
  const scope = String(rawId).replace(/[^a-zA-Z0-9@._-]/g, '_');
  return {
    addresses: `blaze_addresses_${scope}`,
    selected: `blaze_selected_address_${scope}`,
  };
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  const _run = (name, fn) => { try { fn(); } catch (e) { console.error('[checkout] ' + name + ' failed:', e); } };

  _run('applyTheme',         applyTheme);
  _run('loadCoState',        loadCoState);
  _run('renderAddresses',    renderAddresses);
  _run('renderSummary',      renderSummary);
  _run('setupPaymentMethods',setupPaymentMethods);
  _run('setupCoupon',        setupCoupon);
  _run('setupAddressForm',   setupAddressForm);
  _run('setupDeliverySchedule', setupDeliverySchedule);
  _run('setupPlaceOrder',    setupPlaceOrder);
  _run('setupCookingNote',   setupCookingNote);
  _run('setupThemeToggle',   setupThemeToggle);
  _run('setupLocationButton',setupLocationButton);

  // Redirect to menu if cart is empty
  if (!coState.cart.length) {
    document.getElementById('coPage').innerHTML = `
      <div class="co-empty">
        <div class="co-empty-icon">🛒</div>
        <h2>Your cart is empty</h2>
        <p>Add some delicious items before checking out</p>
        <button type="button" class="btn-go-menu" onclick="window.location.href='index.html'">
          Browse Menu
        </button>
      </div>`;
    return;
  }
})

/* ── LOAD STATE FROM LOCALSTORAGE ── */
function loadCoState() {
  try {
    const cart      = localStorage.getItem('blaze_cart');
    const user      = localStorage.getItem('blaze_user');
    const discount  = localStorage.getItem('blaze_discount');

    if (cart)      coState.cart      = JSON.parse(cart);
    if (user)      coState.user      = JSON.parse(user);
    const addrKeys = getAddressStorageKeys(coState.user);
    const addresses = localStorage.getItem(addrKeys.addresses);
    const selAddr   = localStorage.getItem(addrKeys.selected);
    if (addresses) coState.addresses = JSON.parse(addresses);
    if (discount)  coState.discount  = parseInt(discount) || 0;

    // Default addresses if none saved
    if (!coState.addresses.length) {
      coState.addresses = [
        { id: 1, type: 'Home', name: 'Home', line1: '12, Sayyaji Rao Road', line2: '', city: 'Mysore', pin: '570001', phone: '' },
        { id: 2, type: 'Work', name: 'Work', line1: 'No 5, JLB Road',      line2: '', city: 'Mysore', pin: '570004', phone: '' },
      ];
      saveAddresses();
    }

    // Select first address by default
    coState.selectedAddress = selAddr
      ? parseInt(selAddr)
      : (coState.addresses[0]?.id || null);

    // Restore coupon status
    if (coState.discount > 0) {
      const code = localStorage.getItem('blaze_coupon') || '';
      coState.appliedCoupon = code;
      showCouponApplied(code, coState.discount);
    }

    // Auto-apply WELCOME coupon for first-time users, hide coupon section for returning users
    if (coState.user) {
      const uid = coState.user._id || coState.user.id || coState.user.email;
      const usedKey = 'blaze_welcome_used_' + uid;
      const isReturning = !!localStorage.getItem(usedKey);

      if (isReturning) {
        // Mark as returning — flat delivery fee, no coupon
        coState.isReturning = true;
        const couponCard = document.getElementById('couponCard');
        if (couponCard) couponCard.style.display = 'none';
        coState.discount      = 0;
        coState.appliedCoupon = '';
        localStorage.removeItem('blaze_discount');
        localStorage.removeItem('blaze_coupon');
      } else if (!coState.appliedCoupon) {
        // First-time user — auto-apply WELCOME
        coState.discount      = COUPONS.WELCOME;
        coState.appliedCoupon = 'WELCOME';
        localStorage.setItem('blaze_discount', COUPONS.WELCOME);
        localStorage.setItem('blaze_coupon',   'WELCOME');
        const inp = document.getElementById('couponInput');
        if (inp) inp.value = 'WELCOME';
        showCouponApplied('WELCOME', COUPONS.WELCOME, true);
        renderSummary();
      }
    }
  } catch (e) {
    console.error('loadCoState error', e);
  }
}

function saveAddresses() {
  const addrKeys = getAddressStorageKeys(coState.user);
  localStorage.setItem(addrKeys.addresses, JSON.stringify(coState.addresses));
  localStorage.setItem(addrKeys.selected, coState.selectedAddress);
}

/* ── THEME ── */
function applyTheme() {
  const t = localStorage.getItem('blaze_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}
function setupThemeToggle() {
  const btn  = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('blaze_theme', next);
    if (icon) icon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  });
}

function setupDeliverySchedule() {
  const modeInputs = document.querySelectorAll('input[name="deliveryMode"]');
  const picker = document.getElementById('schedulePicker');
  const scheduledFor = document.getElementById('scheduledFor');

  if (!modeInputs.length || !picker || !scheduledFor) return;

  const minDate = new Date(Date.now() + 20 * 60 * 1000);
  const maxDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  scheduledFor.min = toLocalDateTime(minDate);
  scheduledFor.max = toLocalDateTime(maxDate);

  const updateModeUI = () => {
    document.querySelectorAll('.slot-option').forEach(el => {
      const input = el.querySelector('input');
      el.classList.toggle('active', !!input?.checked);
    });
    picker.style.display = coState.deliveryMode === 'scheduled' ? '' : 'none';
  };

  modeInputs.forEach(input => {
    input.addEventListener('change', () => {
      coState.deliveryMode = input.value;
      if (coState.deliveryMode !== 'scheduled') {
        coState.scheduledFor = '';
        scheduledFor.value = '';
      }
      updateModeUI();
    });
  });

  scheduledFor.addEventListener('change', () => {
    coState.scheduledFor = scheduledFor.value;
  });

  updateModeUI();
}

function toLocalDateTime(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ── ADDRESS RENDERING ── */
function renderAddresses() {
  const list = document.getElementById('addressList');
  if (!list) return;

  if (!coState.addresses.length) {
    list.innerHTML = `<p style="color:var(--text-dim);font-size:0.85rem">No saved addresses. Add one below.</p>`;
    return;
  }

  list.innerHTML = coState.addresses.map(a => {
    const isSelected = a.id === coState.selectedAddress;
    const addrText   = formatAddress(a);
    const distBadge  = a.distanceKm != null
      ? `<span class="addr-dist">${a.distanceKm} km</span>`
      : '';
    return `
      <div class="addr-card ${isSelected ? 'selected' : ''}" onclick="selectAddr(${a.id})">
        <div class="addr-type"><i class="fas ${addrIcon(a.type)}"></i> ${a.type} ${distBadge}</div>
        <div class="addr-text">${addrText}</div>
        <button class="addr-delete" onclick="deleteAddr(event, ${a.id})" title="Remove">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>`;
  }).join('');
}

function formatAddress(a) {
  // Back-compat: old format used `text`
  if (a.text) return a.text;
  const parts = [a.line1, a.line2, a.city ? `${a.city} - ${a.pin}` : ''].filter(Boolean);
  const phone = a.phone ? `<br><small>\u260E\uFE0F ${a.phone}</small>` : '';
  return parts.join(', ') + phone;
}

function addrIcon(type) {
  const map = { Home: 'fa-home', Work: 'fa-briefcase' };
  return map[type] || 'fa-map-marker-alt';
}

function selectAddr(id) {
  coState.selectedAddress = id;
  saveAddresses();
  renderAddresses();
}
window.selectAddr = selectAddr;

function deleteAddr(e, id) {
  e.stopPropagation();
  coState.addresses = coState.addresses.filter(a => a.id !== id);
  if (coState.selectedAddress === id) {
    coState.selectedAddress = coState.addresses[0]?.id || null;
  }
  saveAddresses();
  renderAddresses();
  toast('Address removed', 'info');
}
window.deleteAddr = deleteAddr;

/* ── USE CURRENT LOCATION ── */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function setupLocationButton() {
  const btn = document.getElementById('btnUseLocation');
  if (!btn) return;
  btn.addEventListener('click', detectLocation);
}

/**
 * Geocode an address string → { lat, lng } using OpenStreetMap Nominatim.
 * Uses bounded/viewbox search centred on Mysore for better accuracy.
 * Returns null if the address cannot be resolved.
 */
async function geocodeAddress(addressText) {
  // Bounding box: ~30 km around Blaze Kitchen (Mysore centre)
  // SW corner: 12.10, 76.45   NE corner: 12.55, 76.85
  const viewbox = '76.45,12.10,76.85,12.55';
  try {
    const q = encodeURIComponent(addressText);
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=3&q=${q}&viewbox=${viewbox}&bounded=0&countrycodes=in`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'BlazeKitchen/1.0' }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      // Prefer results closest to Blaze Kitchen
      let best = data[0];
      let bestDist = Infinity;
      for (const r of data) {
        const d = haversineKm(BLAZE_LAT, BLAZE_LNG, parseFloat(r.lat), parseFloat(r.lon));
        if (d < bestDist) { bestDist = d; best = r; }
      }
      return { lat: parseFloat(best.lat), lng: parseFloat(best.lon) };
    }
    return null;
  } catch (e) {
    console.error('Geocoding failed:', e);
    return null;
  }
}

function detectLocation() {
  const btn    = document.getElementById('btnUseLocation');
  const status = document.getElementById('locationStatus');

  if (!navigator.geolocation) {
    toast('Geolocation is not supported by your browser', 'error');
    if (status) { status.style.display = ''; status.className = 'location-status loc-error'; status.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Geolocation is not supported by your browser.'; }
    return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting location…'; }
  if (status) status.style.display = 'none';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat  = pos.coords.latitude;
      const lng  = pos.coords.longitude;
      const dist = haversineKm(BLAZE_LAT, BLAZE_LNG, lat, lng);

      coState.userLat    = lat;
      coState.userLng    = lng;
      coState.distanceKm = Math.round(dist * 10) / 10;

      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-crosshairs"></i> Use Current Location'; }

      if (status) {
        status.style.display = '';
        if (dist <= MAX_DELIVERY_KM) {
          status.className = 'location-status loc-ok';
          status.innerHTML = `<i class="fas fa-check-circle"></i> Your location is <strong>${coState.distanceKm} km</strong> away — within delivery range (≤${MAX_DELIVERY_KM} km)`;
        } else {
          status.className = 'location-status loc-error';
          status.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Your location is <strong>${coState.distanceKm} km</strong> away — outside our <strong>${MAX_DELIVERY_KM} km</strong> delivery range.`;
        }
      }

      if (dist <= MAX_DELIVERY_KM) {
        const geoAddr = {
          id: Date.now(), type: 'Other', name: 'Current Location',
          line1: `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          line2: `~${coState.distanceKm} km from Blaze Kitchen`,
          city: 'Mysore', pin: '570001', phone: '', lat, lng,
          distanceKm: coState.distanceKm
        };
        coState.addresses = coState.addresses.filter(a => !a.lat);
        coState.addresses.unshift(geoAddr);
        coState.selectedAddress = geoAddr.id;
        saveAddresses();
        renderAddresses();
        toast(`📍 Location detected — ${coState.distanceKm} km from Blaze Kitchen`, 'success');
      } else {
        toast('Sorry, your location is outside our 20 km delivery range', 'error');
      }
    },
    (err) => {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-crosshairs"></i> Use Current Location'; }
      let msg = 'Unable to detect location. Please try again.';
      if (err.code === 1) msg = 'Location access denied. Please allow location in your browser settings.';
      else if (err.code === 2) msg = 'Position unavailable. Please check your device location settings.';
      else if (err.code === 3) msg = 'Location request timed out. Please try again.';
      toast(msg, 'error');
      if (status) {
        status.style.display = '';
        status.className = 'location-status loc-error';
        status.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${msg}`;
      }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

/* ── ADD ADDRESS FORM ── */
function setupAddressForm() {
  const btnAdd    = document.getElementById('btnAddAddr');
  const form      = document.getElementById('addAddrForm');
  const btnSave   = document.getElementById('btnSaveAddr');
  const btnCancel = document.getElementById('btnCancelAddr');

  if (!btnAdd || !form) return;

  // Ensure form starts hidden
  form.style.display = 'none';
  let formOpen = false;

  btnAdd.addEventListener('click', () => {
    formOpen = !formOpen;
    form.style.display = formOpen ? 'block' : 'none';
    if (formOpen) {
      clearAddrForm();
      btnAdd.innerHTML = '<i class="fas fa-times"></i> Cancel';
      form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      btnAdd.innerHTML = '<i class="fas fa-plus"></i> Add New Address';
      clearAddrForm();
    }
  });

  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      formOpen = false;
      form.style.display = 'none';
      btnAdd.innerHTML = '<i class="fas fa-plus"></i> Add New Address';
      clearAddrForm();
    });
  }

  if (btnSave) btnSave.addEventListener('click', async () => {
    const result = await saveNewAddress();
    if (result) {
      formOpen = false;
      form.style.display = 'none';
      btnAdd.innerHTML = '<i class="fas fa-plus"></i> Add New Address';
    }
  });

  // Card number formatting
  const cardNum = document.getElementById('cardNum');
  if (cardNum) {
    cardNum.addEventListener('input', () => {
      let v = cardNum.value.replace(/\D/g, '').substring(0, 16);
      cardNum.value = v.replace(/(.{4})/g, '$1 ').trim();
    });
  }

  // Expiry formatting
  const cardExp = document.getElementById('cardExp');
  if (cardExp) {
    cardExp.addEventListener('input', () => {
      let v = cardExp.value.replace(/\D/g, '').substring(0, 4);
      if (v.length > 2) v = v.slice(0, 2) + ' / ' + v.slice(2);
      cardExp.value = v;
    });
  }

  // PIN only numbers
  const addrPin = document.getElementById('addrPin');
  if (addrPin) addrPin.addEventListener('input', () => {
    addrPin.value = addrPin.value.replace(/\D/g, '');
  });

  // City live validation — hide error once user types "Mysore" or "Mysuru"
  const addrCity = document.getElementById('addrCity');
  if (addrCity) addrCity.addEventListener('input', () => {
    const cityErr = document.getElementById('cityError');
    const v = addrCity.value.trim().toLowerCase();
    if (cityErr && (v === 'mysore' || v === 'mysuru')) {
      cityErr.style.display = 'none';
    }
  });
}

function clearAddrForm() {
  ['addrName','addrLine1','addrLine2','addrPin','addrPhone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const city = document.getElementById('addrCity');
  if (city) city.value = 'Mysore';
  const cityErr = document.getElementById('cityError');
  if (cityErr) cityErr.style.display = 'none';
  const type = document.getElementById('addrType');
  if (type) type.value = 'Home';
}

async function saveNewAddress() {
  const type  = document.getElementById('addrType')?.value.trim()  || 'Home';
  const name  = document.getElementById('addrName')?.value.trim()  || '';
  const line1 = document.getElementById('addrLine1')?.value.trim() || '';
  const line2 = document.getElementById('addrLine2')?.value.trim() || '';
  const city  = document.getElementById('addrCity')?.value.trim()  || '';
  const pin   = document.getElementById('addrPin')?.value.trim()   || '';
  const phone = document.getElementById('addrPhone')?.value.trim() || '';

  if (!line1) { toast('Please enter address line 1', 'error'); return false; }

  /* ── City check ── */
  const cityLower = city.toLowerCase();
  if (cityLower !== 'mysore' && cityLower !== 'mysuru') {
    const cityErr = document.getElementById('cityError');
    if (cityErr) cityErr.style.display = 'block';
    document.getElementById('addrCity')?.focus();
    toast('We currently deliver only in Mysore / Mysuru', 'error');
    return false;
  }
  const cityErr = document.getElementById('cityError');
  if (cityErr) cityErr.style.display = 'none';

  /* ── PIN code validation ── */
  if (!pin || pin.length < 6) { toast('Please enter a valid 6-digit PIN code', 'error'); return false; }
  if (!MYSORE_VALID_PINS.has(pin)) {
    toast(`PIN code ${pin} is not in the Mysore delivery area. Mysore PINs start with 570/571.`, 'error');
    document.getElementById('addrPin')?.focus();
    return false;
  }

  /* ── Geocode address & enforce 20 km range ── */
  const btnSave = document.getElementById('btnSaveAddr');
  if (btnSave) { btnSave.disabled = true; btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying address…'; }

  const fullAddress = [line1, line2, city, pin, 'Mysuru, Karnataka, India'].filter(Boolean).join(', ');
  let geo = await geocodeAddress(fullAddress);

  if (!geo) {
    // Fallback: try with just street + city
    geo = await geocodeAddress(`${line1}, Mysuru, Karnataka, India`);
  }
  if (!geo) {
    // Last fallback: PIN-based
    geo = await geocodeAddress(`${pin}, Mysuru, Karnataka, India`);
  }
  if (!geo) {
    if (btnSave) { btnSave.disabled = false; btnSave.innerHTML = '<i class="fas fa-save"></i> Save Address'; }
    toast('Could not verify this address on the map. Please check the address and try again.', 'error');
    return false;
  }

  const dist = haversineKm(BLAZE_LAT, BLAZE_LNG, geo.lat, geo.lng);
  const distRound = Math.round(dist * 10) / 10;

  if (btnSave) { btnSave.disabled = false; btnSave.innerHTML = '<i class="fas fa-save"></i> Save Address'; }

  if (dist > MAX_DELIVERY_KM) {
    toast(`This address is ${distRound} km from Blaze Kitchen. We deliver only within ${MAX_DELIVERY_KM} km.`, 'error');
    const status = document.getElementById('locationStatus');
    if (status) {
      status.style.display = '';
      status.className = 'location-status loc-error';
      status.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <strong>${line1}, ${city}</strong> is <strong>${distRound} km</strong> away — outside our <strong>${MAX_DELIVERY_KM} km</strong> delivery range.`;
    }
    return false;
  }

  const newAddr = {
    id: Date.now(), type, name, line1, line2, city, pin, phone,
    lat: geo.lat, lng: geo.lng, distanceKm: distRound
  };
  coState.addresses.push(newAddr);
  coState.selectedAddress = newAddr.id;
  saveAddresses();
  renderAddresses();
  clearAddrForm();

  const status = document.getElementById('locationStatus');
  if (status) {
    status.style.display = '';
    status.className = 'location-status loc-ok';
    status.innerHTML = `<i class="fas fa-check-circle"></i> <strong>${line1}, ${city}</strong> verified — <strong>${distRound} km</strong> from Blaze Kitchen ✓`;
  }
  toast(`Address saved! (${distRound} km from Blaze Kitchen)`, 'success');
  return true;
}

/* ── PAYMENT METHODS ── */
function setupPaymentMethods() {
  document.querySelectorAll('.pay-method').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pay-method').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      coState.paymentMethod = btn.dataset.method;

      const upi  = document.getElementById('upiSection');
      const card = document.getElementById('cardSection');

      if (upi)  upi.style.display  = coState.paymentMethod === 'upi'  ? '' : 'none';
      if (card) card.classList.toggle('open', coState.paymentMethod === 'card');
    });
  });

  // UPI verify (mock)
  document.getElementById('btnVerifyUpi')?.addEventListener('click', () => {
    const val = document.getElementById('upiId')?.value.trim();
    if (!val) { toast('Enter your UPI ID', 'error'); return; }
    if (!val.includes('@')) { toast('Enter a valid UPI ID (e.g. name@upi)', 'error'); return; }
    toast('UPI ID verified ✓', 'success');
  });
}

/* ── COUPON ── */
function setupCoupon() {
  document.getElementById('btnApplyCoupon')?.addEventListener('click', applyCoupon);
  document.getElementById('couponInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') applyCoupon();
  });
  // Quick-fill chips
  document.querySelectorAll('.coupon-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const inp = document.getElementById('couponInput');
      if (inp) inp.value = chip.dataset.code;
      applyCoupon();
    });
  });
}

function applyCoupon() {
  const code  = (document.getElementById('couponInput')?.value || '').trim().toUpperCase();
  const status = document.getElementById('couponStatus');

  if (!code) { showCouponStatus('Enter a coupon code', 'error'); return; }

  if (COUPONS[code]) {
    const amount = COUPONS[code];
    coState.discount     = amount;
    coState.appliedCoupon = code;
    localStorage.setItem('blaze_discount', amount);
    localStorage.setItem('blaze_coupon', code);
    showCouponApplied(code, amount);
    renderSummary();
    toast(`🎉 Coupon applied! ₹${amount} off`, 'success');
  } else {
    coState.discount     = 0;
    coState.appliedCoupon = '';
    localStorage.removeItem('blaze_discount');
    localStorage.removeItem('blaze_coupon');
    showCouponStatus('Invalid coupon code', 'error');
    document.getElementById('couponAppliedBadge').style.display = 'none';
    const removeBtn = document.getElementById('btnRemoveCoupon');
    if (removeBtn) removeBtn.style.display = 'none';
    renderSummary();
  }
}

function showCouponApplied(code, amount, isAuto = false) {
  showCouponStatus(`✓ "${code}" applied — ₹${amount} off!`, 'success');
  const badge = document.getElementById('couponAppliedBadge');
  if (badge) badge.style.display = '';
  // Show / hide the remove button
  const removeBtn = document.getElementById('btnRemoveCoupon');
  if (removeBtn) removeBtn.style.display = '';
  if (isAuto) {
    const statusEl = document.getElementById('couponStatus');
    if (statusEl) statusEl.innerHTML +=
      ' <span style="font-size:0.72rem;color:var(--text-dim)">(auto-applied for new account)</span>';
  }
}

function showCouponStatus(msg, type) {
  const el = document.getElementById('couponStatus');
  if (!el) return;
  el.textContent = msg;
  el.className   = `coupon-status ${type}`;
}

function removeCoupon() {
  coState.discount      = 0;
  coState.appliedCoupon = '';
  localStorage.removeItem('blaze_discount');
  localStorage.removeItem('blaze_coupon');
  const inp = document.getElementById('couponInput');
  if (inp) inp.value = '';
  const badge = document.getElementById('couponAppliedBadge');
  if (badge) badge.style.display = 'none';
  const removeBtn = document.getElementById('btnRemoveCoupon');
  if (removeBtn) removeBtn.style.display = 'none';
  showCouponStatus('Coupon removed.', 'error');
  renderSummary();
}
window.removeCoupon = removeCoupon;

/* ── ORDER SUMMARY ── */
function renderSummary() {
  const cart     = coState.cart;
  const subtotal  = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount  = coState.discount;
  const taxable   = Math.max(0, subtotal - discount);
  const delivery  = coState.isReturning ? DELIVERY_FEE_RETURNING : DELIVERY_FEE_FIRST;
  const cgst      = Math.round(taxable * CGST_RATE);
  const sgst      = Math.round(taxable * SGST_RATE);
  const packaging = Math.round(taxable * PACKAGING_RATE);
  const total     = Math.max(0, taxable + delivery + cgst + sgst + packaging);

  // Items
  const container = document.getElementById('summaryItems');
  if (container) {
    container.innerHTML = cart.map(item => `
      <div class="si-row">
        <img class="si-img" src="${item.image || DEFAULT_IMG}" alt="${item.name}"
             onerror="this.src='${DEFAULT_IMG}'" />
        <div class="si-info">
          <div class="si-name">${item.name}</div>
          <div class="si-qty">× ${item.quantity}</div>
        </div>
        <div class="si-price">₹${item.price * item.quantity}</div>
      </div>`).join('');
  }

  const count = cart.reduce((s, i) => s + i.quantity, 0);
  const countEl = document.getElementById('summaryCount');
  if (countEl) countEl.textContent = `${count} item${count !== 1 ? 's' : ''}`;

  setText('sumSubtotal',     `₹${subtotal}`);
  setText('sumDeliveryLabel', coState.isReturning ? 'Delivery Fee' : 'Delivery Fee (1st order)');
  setText('sumDelivery',      delivery === 0 ? '🎉 FREE' : `₹${delivery}`);
  setText('sumCGST',         `₹${cgst}`);
  setText('sumSGST',         `₹${sgst}`);
  setText('sumPackaging',    `₹${packaging}`);
  setText('sumTotal',        `₹${total}`);

  const discountRow = document.getElementById('sumDiscountRow');
  if (discountRow) {
    discountRow.style.display = discount ? '' : 'none';
    setText('sumDiscount', `−₹${discount}`);
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setupCookingNote() {
  const input = document.getElementById('cookingNote');
  const count = document.getElementById('cookingNoteCount');
  if (!input || !count) return;

  const updateCount = () => {
    count.textContent = `${input.value.length} / 300`;
  };

  input.addEventListener('input', updateCount);
  updateCount();
}

/* ── PLACE ORDER ── */
function setupPlaceOrder() {
  const slide = document.getElementById('btnPlaceOrderSlide');
  if (!slide || slide.dataset.bound === '1') return;

  const track = slide.querySelector('.slide-action-track');
  const thumb = slide.querySelector('.slide-action-thumb');
  const label = slide.querySelector('.slide-action-label');
  if (!track || !thumb || !label) return;

  slide.dataset.bound = '1';
  let dragging = false;
  let startX = 0;
  let startOffset = 0;
  let offset = 0;
  let maxOffset = 0;
  let submitting = false;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const calcBounds = () => {
    maxOffset = Math.max(0, track.clientWidth - thumb.offsetWidth - 6);
  };
  const paint = () => {
    thumb.style.transform = `translateX(${offset}px)`;
    const pct = maxOffset > 0 ? (offset / maxOffset) : 0;
    slide.style.setProperty('--slide-pct', pct.toFixed(3));
  };
  const reset = () => {
    offset = 0;
    slide.classList.remove('confirmed', 'dragging');
    label.textContent = 'Slide to Confirm Order';
    paint();
  };
  const setSubmitting = isBusy => {
    submitting = isBusy;
    thumb.disabled = isBusy;
    slide.classList.toggle('submitting', isBusy);
    if (isBusy) label.textContent = 'Placing Order...';
  };

  const complete = async () => {
    if (submitting) return;
    offset = maxOffset;
    slide.classList.add('confirmed');
    label.textContent = 'Confirmed';
    paint();
    setSubmitting(true);

    const ok = await placeOrder();
    if (!ok) {
      setSubmitting(false);
      setTimeout(reset, 260);
    }
  };

  const onDown = e => {
    if (submitting) return;
    calcBounds();
    dragging = true;
    startX = e.clientX;
    startOffset = offset;
    slide.classList.add('dragging');
    thumb.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onMove = e => {
    if (!dragging || submitting) return;
    offset = clamp(startOffset + (e.clientX - startX), 0, maxOffset);
    paint();
  };
  const onUp = () => {
    if (!dragging || submitting) return;
    dragging = false;
    slide.classList.remove('dragging');
    if (offset >= maxOffset * 0.88) complete();
    else reset();
  };

  thumb.addEventListener('pointerdown', onDown);
  thumb.addEventListener('pointermove', onMove);
  thumb.addEventListener('pointerup', onUp);
  thumb.addEventListener('pointercancel', onUp);

  window.addEventListener('resize', () => {
    calcBounds();
    if (!slide.classList.contains('confirmed')) offset = clamp(offset, 0, maxOffset);
    paint();
  });

  calcBounds();
  reset();
}

async function placeOrder() {
  if (!coState.user) {
    toast('Please log in before placing an order', 'error');
    setTimeout(() => window.location.href = 'index.html', 1500);
    return false;
  }
  if (!coState.cart.length) {
    toast('Your cart is empty', 'error');
    return false;
  }
  if (!coState.selectedAddress) {
    toast('Please select a delivery address', 'error');
    return false;
  }

  /* ── 20 km delivery range check (always enforced) ── */
  const selectedAddr = coState.addresses.find(a => a.id === coState.selectedAddress) || {};

  if (selectedAddr.lat && selectedAddr.lng) {
    // Already has coordinates — quick haversine check
    const dist = haversineKm(BLAZE_LAT, BLAZE_LNG, selectedAddr.lat, selectedAddr.lng);
    if (dist > MAX_DELIVERY_KM) {
      toast(`Sorry, this address is ${Math.round(dist * 10) / 10} km away. We deliver only within ${MAX_DELIVERY_KM} km.`, 'error');
      return false;
    }
  } else {
    // Manual address without coordinates — geocode it now
    toast('Verifying delivery address…', 'info');
    const addrText = [selectedAddr.line1, selectedAddr.line2, selectedAddr.city, selectedAddr.pin, 'Mysuru, Karnataka, India'].filter(Boolean).join(', ');
    let geo = await geocodeAddress(addrText);
    if (!geo) geo = await geocodeAddress(`${selectedAddr.line1}, Mysuru, Karnataka, India`);
    if (!geo) geo = await geocodeAddress(`${selectedAddr.pin}, Mysuru, Karnataka, India`);

    if (!geo) {
      toast('Could not verify your address on the map. Please update it or use Current Location.', 'error');
      return false;
    }

    const dist = haversineKm(BLAZE_LAT, BLAZE_LNG, geo.lat, geo.lng);
    if (dist > MAX_DELIVERY_KM) {
      toast(`Sorry, this address is ${Math.round(dist * 10) / 10} km away. We deliver only within ${MAX_DELIVERY_KM} km.`, 'error');
      return false;
    }

    // Store coords so we don't re-geocode
    selectedAddr.lat = geo.lat;
    selectedAddr.lng = geo.lng;
    selectedAddr.distanceKm = Math.round(dist * 10) / 10;
    saveAddresses();
  }

  // Validate payment fields
  if (coState.paymentMethod === 'upi') {
    const upi = document.getElementById('upiId')?.value.trim();
    if (!upi || !upi.includes('@')) {
      toast('Please enter & verify your UPI ID', 'error');
      return false;
    }
  }
  if (coState.paymentMethod === 'card') {
    const num  = document.getElementById('cardNum')?.value.replace(/\s/g,'');
    const name = document.getElementById('cardName')?.value.trim();
    const exp  = document.getElementById('cardExp')?.value.trim();
    const cvv  = document.getElementById('cardCvv')?.value.trim();
    if (!num || num.length < 16) { toast('Enter a valid 16-digit card number', 'error'); return false; }
    if (!name)                   { toast('Enter cardholder name', 'error'); return false; }
    if (!exp || exp.length < 7)  { toast('Enter a valid expiry date', 'error'); return false; }
    if (!cvv || cvv.length < 3)  { toast('Enter CVV', 'error'); return false; }
  }

  if (coState.deliveryMode === 'scheduled') {
    const selected = document.getElementById('scheduledFor')?.value || coState.scheduledFor;
    if (!selected) {
      toast('Select scheduled date and time', 'error');
      return false;
    }
    const ms = new Date(selected).getTime();
    if (Number.isNaN(ms) || ms < Date.now() + 20 * 60 * 1000) {
      toast('Scheduled time must be at least 20 minutes from now', 'error');
      return false;
    }
    coState.scheduledFor = selected;
  }

  // Build order data
  const cart     = coState.cart;
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = coState.discount;
  const taxable  = Math.max(0, subtotal - discount);
  const delivery = coState.isReturning ? DELIVERY_FEE_RETURNING : DELIVERY_FEE_FIRST;
  const cgst     = Math.round(taxable * CGST_RATE);
  const sgst     = Math.round(taxable * SGST_RATE);
  const packaging = Math.round(taxable * PACKAGING_RATE);
  const total    = Math.max(0, taxable + delivery + cgst + sgst + packaging);
  const orderId  = 'BLZ' + Math.random().toString(36).substr(2, 7).toUpperCase();

  // Get selected address (reuse from range check above)
  const addr = coState.addresses.find(a => a.id === coState.selectedAddress) || {};
  const cookingNote = (document.getElementById('cookingNote')?.value || '').trim();

  const orderPayload = {
    orderId,
    items: cart.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, image: i.image || '' })),
    address: {
      type:  addr.type  || 'Home',
      name:  addr.name  || '',
      line1: addr.line1 || addr.text || '',
      line2: addr.line2 || '',
      city:  addr.city  || '',
      pin:   addr.pin   || '',
      phone: addr.phone || '',
      lat:   typeof addr.lat === 'number' ? addr.lat : null,
      lng:   typeof addr.lng === 'number' ? addr.lng : null
    },
    deliverySchedule: {
      mode: coState.deliveryMode,
      scheduledFor: coState.deliveryMode === 'scheduled' ? new Date(coState.scheduledFor).toISOString() : null,
      slotLabel: coState.deliveryMode === 'scheduled' ? 'Scheduled' : 'ASAP'
    },
    paymentMethod: coState.paymentMethod,
    subtotal,
    discount,
    deliveryFee: delivery,
    cgst,
    sgst,
    packagingFee: packaging,
    gst: cgst + sgst,
    total,
    coupon: coState.appliedCoupon || '',
    cookingInstructions: cookingNote
  };

  // Try saving to backend (requires auth)
  const token = localStorage.getItem('blaze_token');
  const API   = 'http://localhost:5000/api';

  const saveToBackend = async () => {
    try {
      if (!token) throw new Error('No token');
      const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed');
      return true;
    } catch (e) {
      console.warn('Backend order save failed, continuing locally:', e.message);
      return false;
    }
  };

  await saveToBackend();

  // Mark first-order welcome coupon as used for this user
  if (coState.user) {
    const uid = coState.user._id || coState.user.id || coState.user.email;
    localStorage.setItem('blaze_welcome_used_' + uid, '1');
  }
  // Clear cart & discount
  localStorage.removeItem('blaze_cart');
  localStorage.removeItem('blaze_discount');
  localStorage.removeItem('blaze_coupon');

  // Show success overlay briefly then redirect to orders page
  document.getElementById('coOrderId').textContent = `Order #${orderId}`;
  document.getElementById('coSuccess').classList.add('show');
  document.getElementById('stepConfirm').classList.add('active');

  // Redirect to orders page after a short delay
  setTimeout(() => {
    window.location.href = 'orders.html';
  }, 2000);

  return true;
}

/* ── TOAST ── */
function toast(message, type = 'default') {
  const container = document.getElementById('coToastContainer');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', default: '🔥' };
  const el = document.createElement('div');
  el.className = `co-toast ${type}`;
  el.innerHTML = `<span>${icons[type] || icons.default}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}
