/* ============================================================
   BLAZE KITCHEN — app.js  v2.0
   Advanced Frontend: AI Recs, Reviews, Wishlist, PWA,
   Dark Mode, Live Chat, Counters, Timeline, Testimonials
   ============================================================ */

'use strict';

/* ════════════ KITCHEN CLOSED CHECK ════════════ */
(function initKitchenClosed() {
  const OPEN_HOUR  = 8;   // 8 AM
  const CLOSE_HOUR = 23;  // 11 PM
  const KS_KEY     = 'blaze_kitchen_override'; // set by admin panel

  function isKitchenClosed() {
    const override = localStorage.getItem(KS_KEY);
    if (override === 'open')   return false; // admin forced open
    if (override === 'closed') return true;  // admin forced closed
    // 'auto' or unset — use time
    const h = new Date().getHours();
    return h >= CLOSE_HOUR || h < OPEN_HOUR;
  }

  function getSecondsUntilOpen() {
    const now  = new Date();
    const open = new Date();
    open.setHours(OPEN_HOUR, 0, 0, 0);
    if (open <= now) open.setDate(open.getDate() + 1); // next day
    return Math.floor((open - now) / 1000);
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function updateCountdown() {
    const total = getSecondsUntilOpen();
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const elH = document.getElementById('kcHH');
    const elM = document.getElementById('kcMM');
    const elS = document.getElementById('kcSS');
    if (elH) elH.textContent = pad(h);
    if (elM) elM.textContent = pad(m);
    if (elS) elS.textContent = pad(s);
  }

  function spawnEmbers() {
    const container = document.getElementById('kcEmbers');
    if (!container) return;
    const count = 28;
    for (let i = 0; i < count; i++) {
      const e = document.createElement('div');
      e.className = 'kc-ember';
      const size = 2 + Math.random() * 4;
      e.style.cssText = [
        `left:${Math.random() * 100}%`,
        `bottom:${Math.random() * 15}%`,
        `width:${size}px`,
        `height:${size}px`,
        `--dur:${4 + Math.random() * 8}s`,
        `--delay:${Math.random() * 6}s`,
        `--dx:${(Math.random() - 0.5) * 120}px`,
        `opacity:0`
      ].join(';');
      container.appendChild(e);
    }
  }

  function setupClosedAudio() {
    const audio = document.getElementById('kcAudio');
    const toggle = document.getElementById('kcAudioToggle');
    const testBtn = document.getElementById('kcAudioTestBtn');
    if (!toggle) return;

    if (toggle.dataset.bound === '1') return;
    toggle.dataset.bound = '1';

    let ctx = null;
    let masterGain = null;
    let ambientStarted = false;
    let ambientOn = false;
    let chimeTimer = null;

    function ensureAmbientGraph() {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;

      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(ctx.destination);

      const base = ctx.createOscillator();
      base.type = 'sine';
      base.frequency.value = 220;
      const baseGain = ctx.createGain();
      baseGain.gain.value = 0.02;

      const warmth = ctx.createOscillator();
      warmth.type = 'triangle';
      warmth.frequency.value = 329.63;
      const warmthGain = ctx.createGain();
      warmthGain.gain.value = 0.012;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.16;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 0.005;

      lfo.connect(lfoDepth);
      lfoDepth.connect(baseGain.gain);

      base.connect(baseGain);
      warmth.connect(warmthGain);
      baseGain.connect(masterGain);
      warmthGain.connect(masterGain);

      base.start();
      warmth.start();
      lfo.start();
      ambientStarted = true;
    }

    function setToggleUi(isOn, needsGesture = false) {
      toggle.classList.toggle('needs-gesture', needsGesture);
      toggle.setAttribute('aria-pressed', isOn ? 'true' : 'false');
      toggle.innerHTML = isOn
        ? '<i class="fas fa-volume-high"></i><span>Sound On</span>'
        : '<i class="fas fa-volume-xmark"></i><span>Sound Off</span>';
      if (needsGesture) {
        toggle.innerHTML = '<i class="fas fa-hand-pointer"></i><span>Tap for Sound</span>';
      }
    }

    function playSubtleChime() {
      if (!ctx || !masterGain || !ambientOn) return;
      const now = ctx.currentTime;

      const oscA = ctx.createOscillator();
      oscA.type = 'sine';
      oscA.frequency.value = 659.25; // E5
      const gainA = ctx.createGain();
      gainA.gain.setValueAtTime(0.0001, now);
      gainA.gain.exponentialRampToValueAtTime(0.012, now + 0.03);
      gainA.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      const oscB = ctx.createOscillator();
      oscB.type = 'triangle';
      oscB.frequency.value = 987.77; // B5
      const gainB = ctx.createGain();
      gainB.gain.setValueAtTime(0.0001, now + 0.12);
      gainB.gain.exponentialRampToValueAtTime(0.008, now + 0.18);
      gainB.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

      oscA.connect(gainA);
      oscB.connect(gainB);
      gainA.connect(masterGain);
      gainB.connect(masterGain);

      oscA.start(now);
      oscA.stop(now + 0.62);
      oscB.start(now + 0.12);
      oscB.stop(now + 0.8);
    }

    function playPowerOnTone() {
      if (!ctx || !masterGain) return;
      const now = ctx.currentTime;

      const o1 = ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.setValueAtTime(440, now);
      o1.frequency.exponentialRampToValueAtTime(660, now + 0.12);

      const g1 = ctx.createGain();
      g1.gain.setValueAtTime(0.0001, now);
      g1.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
      g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      o1.connect(g1);
      g1.connect(ctx.destination);
      o1.start(now);
      o1.stop(now + 0.3);
    }

    function playTestBeep() {
      ensureAmbientGraph();
      if (!ctx) return;
      const now = ctx.currentTime;

      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(880, now);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      o.connect(g);
      g.connect(ctx.destination);
      o.start(now);
      o.stop(now + 0.24);
    }

    function startChimeLoop() {
      if (chimeTimer) return;
      chimeTimer = setInterval(() => {
        if (!ambientOn) return;
        playSubtleChime();
      }, 18000);
    }

    function stopChimeLoop() {
      if (!chimeTimer) return;
      clearInterval(chimeTimer);
      chimeTimer = null;
    }

    async function startAmbient() {
      ensureAmbientGraph();
      if (!ctx || !masterGain || !ambientStarted) {
        setToggleUi(false, true);
        return;
      }
      try {
        if (ctx.state === 'suspended') await ctx.resume();
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setTargetAtTime(0.22, ctx.currentTime, 0.12);

        if (audio) {
          try {
            audio.volume = 1;
            audio.muted = false;
            await audio.play();
          } catch (_) {
            // Ignore and keep synthesized fallback running.
          }
        }

        ambientOn = true;
        setToggleUi(true, false);
        playPowerOnTone();
        playSubtleChime();
        startChimeLoop();
      } catch (_) {
        setToggleUi(false, true);
      }
    }

    function stopAmbient() {
      if (!ctx || !masterGain) {
        ambientOn = false;
        setToggleUi(false, false);
        return;
      }
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      ambientOn = false;
      stopChimeLoop();
      if (audio) {
        try { audio.pause(); } catch (_) { }
        audio.currentTime = 0;
      }
      setToggleUi(false, false);
    }

    toggle.addEventListener('click', async () => {
      if (ambientOn) {
        stopAmbient();
        return;
      }
      await startAmbient();
    });

    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        ensureAmbientGraph();
        if (ctx && ctx.state === 'suspended') {
          try { await ctx.resume(); } catch (_) { }
        }
        playTestBeep();
      });
    }

    // Keep media paused until user enables sound.
    if (audio) {
      try { audio.pause(); } catch (_) { }
      audio.muted = true;
      audio.currentTime = 0;
    }

    window.__kcStopAudio = stopAmbient;
    setToggleUi(false, false);
  }

  function showKitchenClosed() {
    const overlay = document.getElementById('kitchenClosedOverlay');
    if (!overlay) return;
    overlay.classList.add('active');
    spawnEmbers();
    setupClosedAudio();
    updateCountdown();
    setInterval(updateCountdown, 1000);
    // Auto-hide when kitchen opens (poll every minute)
    setInterval(() => {
      if (!isKitchenClosed()) {
        overlay.classList.remove('active');
        const audio = document.getElementById('kcAudio');
        if (audio) {
          try { audio.pause(); } catch (_) { }
          audio.currentTime = 0;
        }
        if (typeof window.__kcStopAudio === 'function') {
          window.__kcStopAudio();
        }
      }
    }, 60000);
  }

  if (isKitchenClosed()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showKitchenClosed);
    } else {
      showKitchenClosed();
    }
  }
})();
/* ═══════════════════════════════════════════════ */

const API_BASE = 'http://localhost:5000/api';
const ITEMS_PER_PAGE = 12;

/* ── USE MONGODB DATA ONLY - NO HARDCODED IMAGES ── */
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=85';

/* ── SUBCATEGORY IMAGE MAP ── */
const SUBCATEGORY_IMAGES = {
  'Purely Black':                         'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80',
  'Classic Milk & Foam':                  'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&q=80',
  'Cold Brews / Iced Coffee / Frappes':   'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80',
  'Manual Brew Bar':                      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80',
  'Affogato':                             'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80',
  'Matcha':                               'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=80',
  'Hojicha':                              'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
  'Milkshakes & Smoothies':               'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80',
  'Hot Chocolate':                        'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&q=80',
  'Speciality Hot Tea Pots':              'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
  'Iced Tea':                             'https://images.unsplash.com/photo-1562547256-2c5ee8cbfd4a?w=600&q=80',
  'Mojitos':                              'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=600&q=80',
  'Lemonade':                             'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&q=80',
  'Fresh Juices':                         'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80',
  'Toasts & Platters':                    'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=600&q=80',
  'Eggs':                                 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&q=80',
  'Smoothie Bowls':                       'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600&q=80',
  'Oats Bowls':                           'https://images.unsplash.com/photo-1494597564530-871f2b93ac55?w=600&q=80',
  'Pancakes':                             'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80',
  'French Toast':                         'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&q=80',
  'Waffles':                              'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=600&q=80',
  'Dinner':                               'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&q=80',
  'Pasta':                                'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&q=80',
  'All-Time Favourites':                  'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=600&q=80',
  'Salads':                               'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  'Soups':                                'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80',
  'Burgers':                              'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  'Sandwiches':                           'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
};

/* ── ITEM-SPECIFIC IMAGE MAP ── */
const ITEM_IMAGES = {
  // ── Coffee & Brews ──
  'Espresso':                              'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80',
  'Espresso Doppio':                       'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80',
  'Café Americano':                        'https://images.unsplash.com/photo-1582482030567-85b4d6a7a54f?w=600&q=80',
  'Espresso Sunrise':                      'https://images.unsplash.com/photo-1582482030567-85b4d6a7a54f?w=600&q=80',
  'Sunrise Americano':                     'https://images.unsplash.com/photo-1582482030567-85b4d6a7a54f?w=600&q=80',
  'Sparkling Americano':                   'https://images.unsplash.com/photo-1582482030567-85b4d6a7a54f?w=600&q=80',
  'Macchiato':                             'https://images.unsplash.com/photo-1485808191679-5f86510df711?w=600&q=80',
  'Espresso Bon Bon':                      'https://images.unsplash.com/photo-1485808191679-5f86510df711?w=600&q=80',
  'Piccolo (Hot)':                         'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&q=80',
  'Cortado (Hot)':                         'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&q=80',
  'Cappuccino':                            'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&q=80',
  'Flat White':                            'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&q=80',
  'Orange Mocha':                          'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&q=80',
  'Winter Latte':                          'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&q=80',
  'Coffee Lemonade':                       'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80',
  'Classic Cold Coffee':                   'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=600&q=80',
  'The Classic Cold Brew':                 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80',
  'Classic Frappe':                        'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80',
  'Cold Brew Sangria':                     'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80',
  'Cold Brew with Tender Coconut':         'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80',
  'Lemon Honey Cold Brew':                 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80',
  'Mazagran Cold Brew':                    'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80',
  'Japanese Iced Pour Over':               'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80',
  'Pour Over':                             'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80',
  'French Press':                          'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80',
  'Affogato al Caffè':                     'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80',
  // ── Matcha & Hojicha ──
  'Matcha Latte':                          'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=80',
  'Matchacano':                            'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=80',
  'Mango Matcha Latte':                    'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=80',
  'Matcha Pure Coconut Latte':             'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=80',
  'Banana Milk Matcha Latte':              'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=80',
  'Matcha Frappe':                         'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=80',
  'Soft Girl Matcha Latte':                'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=80',
  'Lemon Pie Matcha':                      'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=80',
  'Matcha Coconut Cloud':                  'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=80',
  'Hojicha Coconut Cloud':                 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
  // ── Beverages ──
  'Nutorious':                             'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80',
  'Caramel Crunch':                        'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80',
  'Rocher Road':                           'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80',
  'Salted Caramel and Brownie':            'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80',
  'Milky Way':                             'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80',
  'Berry Blush':                           'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&q=80',
  'Chocolate Cake Shake':                  'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80',
  'Mixed Berry Smoothie':                  'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&q=80',
  'Mango Smoothie':                        'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&q=80',
  'Green Smoothie':                        'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&q=80',
  'Hot Chocolate (Regular Style)':         'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&q=80',
  'Hot Chocolate (Thick Italian Style)':   'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&q=80',
  'Rose Lemon':                            'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
  'Orange Clove':                          'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
  'Spearmint':                             'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
  'Turmeric':                              'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
  'Hibiscus':                              'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
  'Black Tea':                             'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
  'Lemon Iced Tea':                        'https://images.unsplash.com/photo-1562547256-2c5ee8cbfd4a?w=600&q=80',
  'Peach Iced Tea':                        'https://images.unsplash.com/photo-1562547256-2c5ee8cbfd4a?w=600&q=80',
  'Cranberry Iced Tea':                    'https://images.unsplash.com/photo-1562547256-2c5ee8cbfd4a?w=600&q=80',
  'Blueberry Iced Tea':                    'https://images.unsplash.com/photo-1562547256-2c5ee8cbfd4a?w=600&q=80',
  'Passion Fruit Iced Tea':                'https://images.unsplash.com/photo-1562547256-2c5ee8cbfd4a?w=600&q=80',
  'Virgin Mojito':                         'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=600&q=80',
  'Blueberry Mojito':                      'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=600&q=80',
  'Passion Fruit Mojito':                  'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=600&q=80',
  'Peach Mojito':                          'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=600&q=80',
  'Cranberry Mojito':                      'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=600&q=80',
  'Classic Lemonade (Mint & Lemon)':       'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&q=80',
  'Watermelon Juice':                      'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80',
  'Pineapple Juice':                       'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80',
  'Founders Paradise':                     'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80',
  'Summer is Back':                        'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80',
  'Mango Coconut':                         'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80',
  'Pineapple Coconut':                     'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80',
  'Cucumber Coconut':                      'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80',
  'Just Orange':                           'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80',
  'Livestrong (Orange, Beetroot, Carrot, Honey)': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80',
  // ── Breakfast Plates ──
  'Avocado Toast':                         'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=600&q=80',
  'Creamy Mushroom Toast':                 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80',
  'Protein Toast':                         'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80',
  'Grilled Tomato & Fresh Mozzarella':     'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80',
  'Scrambled Paneer / Tofu with Toast':    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80',
  'Farmhouse Platter':                     'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&q=80',
  'English Platter':                       'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&q=80',
  'Classic Scrambled Egg':                 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&q=80',
  'Cheese Scrambled Egg':                  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&q=80',
  'Masala Scrambled Egg':                  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&q=80',
  'Fried Eggs':                            'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&q=80',
  '3 Egg French Fold Omelette (Classic / Cheese / Masala / Mushroom)': 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&q=80',
  'Turkish Yogurt & Eggs':                 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&q=80',
  'Shakshuka':                             'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80',
  'Tropical Mango & Pineapple':            'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600&q=80',
  'Coconut Pineapple':                     'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600&q=80',
  'Banana Matcha':                         'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600&q=80',
  'Chocolate + Peanut Butter + Banana':    'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600&q=80',
  'Chocolate, Cinnamon & Banana':          'https://images.unsplash.com/photo-1494597564530-871f2b93ac55?w=600&q=80',
  'Peanut Butter & Banana':               'https://images.unsplash.com/photo-1494597564530-871f2b93ac55?w=600&q=80',
  'Mixed Fruit':                           'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600&q=80',
  // ── Pancakes & Waffles ──
  'Original Pancake':                      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80',
  'Nutella Banana Pancake':                'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80',
  'Fruit Wheel Pancake':                   'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80',
  'Triple Chocolate Pancake':              'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80',
  'White Chocolate & Seasonal Fruit Pancake': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80',
  'Original French Toast':                 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&q=80',
  'Nutella & Banana French Toast':         'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&q=80',
  'Fruit French Toast':                    'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&q=80',
  'Matcha French Toast':                   'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&q=80',
  'Matcha & Mango French Toast':           'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&q=80',
  'Classic Waffle':                        'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=600&q=80',
  'Triple Chocolate Waffle':               'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=600&q=80',
  'Fruit Waffle':                          'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=600&q=80',
  'Nutella, Banana & Almond Waffle':       'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=600&q=80',
  'Blueberry Cheesecake Waffle':           'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=600&q=80',
  'White Chocolate & Seasonal Fruit Waffle': 'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=600&q=80',
  // ── Mains ──
  'Thai Curry & Rice':                     'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&q=80',
  'Makhani & Rice':                        'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&q=80',
  'Chicken Grill':                         'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80',
  'Cottage Cheese Grill':                  'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80',
  'Fish Grill':                            'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80',
  'Rigatoni / Penne':                      'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&q=80',
  'Spaghetti':                             'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&q=80',
  'Spaghetti Parmesano Chicken':           'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&q=80',
  'Truffle Parmesan Fries':                'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=600&q=80',
  'French Fries':                          'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=600&q=80',
  'Jalapeño Poppers':                      'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=600&q=80',
  'Chicken Wings':                         'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&q=80',
  'Chicken Strips':                        'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&q=80',
  'Chicken Nuggets':                       'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&q=80',
  'Fish & Chips':                          'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80',
  'Cheesy Garlic Bread':                   'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=600&q=80',
  'Pull Me Garlic Bun':                    'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=600&q=80',
  'Korean Cream Cheese Garlic Bun':        'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=600&q=80',
  'Chicken Quesadilla':                    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
  'Crispy Sliders Paneer':                 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  'Crispy Sliders Chicken':                'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  'Mushroom Stuffed Spinach Tortilla':     'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
  'Paneer Stuffed Spinach Tortilla':       'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
  'Creamy Broccoli Soup with Pita Bread':  'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80',
  // ── Salads & Soups ──
  'Pineapple Mint Bowl':                   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  'Papaya Bowl':                           'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600&q=80',
  'Mixed Fruits Bowl':                     'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600&q=80',
  'Caesar Salad':                          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  'Thai Salad':                            'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  'Waldorf Salad':                         'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  'Greek Salad':                           'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  'Watermelon Feta':                       'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  // ── Burgers & Sandwiches ──
  'Spicy Chicken Burger':                  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  'Bang Bang Chicken Burger':              'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  'Home Style Chicken Burger':             'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  'Smash Chicken Burger':                  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  'Chickpea Patty Burger':                 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&q=80',
  'Cottage Cheese Crispy Burger':          'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&q=80',
  'Beetroot Patty Burger':                 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&q=80',
  'Cilantro Lime Chicken Burger':          'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  'Gochujang Burger':                      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  'Egg & Cheese Sandwich':                 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
  'Chicken & Cheese Sandwich':             'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
  'Crispy Chicken Sandwich':               'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
  'Chicken Tikka Sandwich':                'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
  'Caprese Sandwich':                      'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
  'Paneer Tikka Sandwich':                 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
  'Pickled Paneer Sandwich':               'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
  "Grandma's Grilled Vegetable Sandwich":  'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
};

const COUPONS = { 'BLAZE50':50, 'FIRST100':100, 'MIDNIGHT':80, 'VIP200':200 };
const GST_RATE = 0.05;
const DELIVERY_FEE = 40;
const FREE_DELIVERY_THRESHOLD = 499;

/* ── MOCK REVIEWS ── */
const MOCK_REVIEWS = {
  default: [
    {name:'Rahul M.',rating:5,text:'Absolutely incredible! The smash burger is the best I\'ve had in Bangalore.',date:'2 days ago'},
    {name:'Priya S.',rating:4,text:'Super fast delivery, food was hot and fresh. Loving the Korean BBQ Burger!',date:'5 days ago'},
    {name:'Arjun K.',rating:5,text:'The Molten Lava Cake is life-changing. Will order again.',date:'1 week ago'},
  ]
};

/* ── MOCK AI RECOMMENDATIONS ── */
const AI_RECOMMENDATIONS = [
  {name:'Truffle Cheese Burger',price:389,image:DEFAULT_IMG,category:'burgers',reason:'Based on your taste'},
  {name:'Matcha Latte',price:169,image:DEFAULT_IMG,category:'coffee',reason:'Trending now'},
  {name:'Churros & Dip',price:159,image:DEFAULT_IMG,category:'desserts',reason:'Pairs well with your order'},
  {name:'Nachos Supreme',price:219,image:DEFAULT_IMG,category:'appetizers',reason:'Crowd favourite'},
];

/* ── TRENDING ── */
const TRENDING_ITEMS = [
  {name:'Korean BBQ Burger',price:319,image:DEFAULT_IMG,category:'burgers'},
  {name:'Loaded Fries',price:179,image:DEFAULT_IMG,category:'appetizers'},
  {name:'Molten Lava Cake',price:199,image:DEFAULT_IMG,category:'desserts'},
  {name:'Blaze Signature Punch',price:159,image:DEFAULT_IMG,category:'beverages'},
];

/* ── CATEGORY CONFIG ── */
const CATEGORY_CONFIG = {
  'burgers': { name: 'Burgers', icon: '🍔', color: '#FF5E00' },
  'coffee': { name: 'Coffee & Shakes', icon: '☕', color: '#8B4513' },
  'beverages': { name: 'Beverages', icon: '🥤', color: '#FF6B9D' },
  'desserts': { name: 'Desserts', icon: '🍰', color: '#FFB6C1' },
  'appetizers': { name: 'Appetizers', icon: '🍟', color: '#FFA500' },
  'combos': { name: 'Combos', icon: '🍱', color: '#FF7F50' }
};

/* ── STATE ── */
let state = {
  user: null, cart: [], wishlist: [],
  allItems: [], filtered: [], currentPage: 0,
  filter: 'all', search: '', sort: 'default',
  itemModal: null, itemQty: 1,
  reviews: {}, recentlyViewed: [], 
  activeCategory: 'all',
  addresses: [
    {id:1,type:'Home',name:'Home',line1:'12, Brigade Road',line2:'',city:'Bangalore',pin:'560001',phone:''},
    {id:2,type:'Work',name:'Work',line1:'No 5, MG Road',line2:'',city:'Bangalore',pin:'560025',phone:''},
  ],
  selectedAddress: 1,
  failedLogins: 0, accountLocked: false, lockExpiry: null,
  pendingOtp: null, otpEmail: null,
  userRole: 'user',
};


/* ═══════════════════════
   INIT
═══════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setupCursor();
  setupNavbar();
  setupHeroSlider();
  setupEventListeners();
  setupCategoryCarousel();
  loadMenu();
  setupScrollTop();
  setupThemeToggle();
  setupFabDial();
  setupPWA();
  setupScrollReveal();
  setupCounters();
  setupTestimonials();
  setupFAQ();
  setupLiveChat();
  setupWhatsApp();
  renderRecentlyViewed();
  setupContactForm();
  loadSiteContactInfo();
});

/* ── CUSTOM CURSOR ── */
function setupCursor() {
  const cursor = document.getElementById('cursor');
  const cursorDot = document.getElementById('cursorDot');
  if (!cursor || window.matchMedia('(pointer: coarse)').matches) return;
  let mouseX=0,mouseY=0,curX=0,curY=0;
  document.addEventListener('mousemove', e => {
    mouseX=e.clientX; mouseY=e.clientY;
    cursorDot.style.left=mouseX+'px'; cursorDot.style.top=mouseY+'px';
  });
  (function animateCursor() {
    curX+=(mouseX-curX)*0.12; curY+=(mouseY-curY)*0.12;
    cursor.style.left=curX+'px'; cursor.style.top=curY+'px';
    requestAnimationFrame(animateCursor);
  })();
  document.querySelectorAll('button,a,.menu-card,.filter-pill,.payment-method,.coupon-chip,.faq-question,.team-card,.trending-item,.ai-rec-card,.rv-chip').forEach(el => {
    el.addEventListener('mouseenter',()=>cursor.classList.add('hover-state'));
    el.addEventListener('mouseleave',()=>cursor.classList.remove('hover-state'));
  });
}

/* ── DARK / LIGHT TOGGLE ── */
function setupThemeToggle() {
  const saved = localStorage.getItem('blaze_theme') || 'dark';
  applyTheme(saved);

  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('blaze_theme', next);
  });
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
}

/* ── NAVBAR ── */
function setupNavbar() {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');
  window.addEventListener('scroll',()=>navbar.classList.toggle('scrolled',window.scrollY>60),{passive:true});
  toggle?.addEventListener('click',()=>{
    toggle.classList.toggle('open'); mobileNav.classList.toggle('open');
  });
}
function closeMobileMenu() {
  document.getElementById('menuToggle')?.classList.remove('open');
  document.getElementById('mobileNav')?.classList.remove('open');
}

/* ── HERO VIDEO SLIDER ── */
function setupHeroSlider() {
  const videos = document.querySelectorAll('.hero-video-slide');
  const dots   = document.querySelectorAll('.slider-dot');
  if (!videos.length) return;
  let current = 0;

  function playSlide(idx) {
    videos[current].classList.remove('active');
    videos[current].pause();
    if (dots[current]) dots[current].classList.remove('active');
    current = (idx + videos.length) % videos.length;
    const vid = videos[current];
    vid.currentTime = 0;
    vid.play().catch(() => {});
    vid.classList.add('active');
    if (dots[current]) dots[current].classList.add('active');
  }

  // Auto-advance when video ends
  videos.forEach((vid, i) => {
    vid.addEventListener('ended', () => playSlide(i + 1));
  });

  // Manual dot clicks
  dots.forEach(dot => {
    dot.addEventListener('click', () => playSlide(parseInt(dot.dataset.index)));
  });

  // Start first video
  videos[0].play().catch(() => {});
}

/* ── SCROLL TOP ── */
function setupScrollTop() {
  // scroll-top is now inside FAB dial — just wire the click
  document.getElementById('scrollTop')?.addEventListener('click', () =>
    window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ── FAB SPEED DIAL ── */
function setupFabDial() {
  const dial    = document.getElementById('fabDial');
  const trigger = document.getElementById('fabTrigger');
  if (!dial || !trigger) return;

  trigger.addEventListener('click', () => {
    const isOpen = dial.classList.toggle('open');
    trigger.setAttribute('aria-expanded', isOpen);
  });

  // Close when clicking outside
  document.addEventListener('click', e => {
    if (!dial.contains(e.target)) {
      dial.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ── SCROLL REVEAL ── */
function setupScrollReveal() {
  const els=document.querySelectorAll('.reveal');
  const obs=new IntersectionObserver(entries=>entries.forEach(e=>{
    if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);}
  }),{threshold:0.1});
  els.forEach(el=>obs.observe(el));
}

/* ── COUNTERS ── */
function setupCounters() {
  const counters=document.querySelectorAll('.counter-num');
  const obs=new IntersectionObserver(entries=>entries.forEach(e=>{
    if(e.isIntersecting){
      animateCounter(e.target); obs.unobserve(e.target);
    }
  }),{threshold:0.5});
  counters.forEach(c=>obs.observe(c));
}
function animateCounter(el) {
  const target=parseInt(el.dataset.target)||0;
  const suffix=el.dataset.suffix||'';
  const dur=2000; const step=dur/60;
  let current=0;
  const inc=target/60;
  const timer=setInterval(()=>{
    current=Math.min(current+inc,target);
    el.textContent=Math.floor(current).toLocaleString()+suffix;
    if(current>=target)clearInterval(timer);
  },step);
}

/* ── TESTIMONIALS ── */
function setupTestimonials() {
  const track=document.getElementById('testimonialsTrack');
  const dots=document.querySelectorAll('.t-dot');
  const btns=document.querySelectorAll('.testimonial-btn');
  let current=0,count=dots.length;
  if(!track||!count)return;
  function goto(idx) {
    current=(idx+count)%count;
    track.style.transform=`translateX(-${current*100}%)`;
    dots.forEach((d,i)=>d.classList.toggle('active',i===current));
  }
  btns[0]?.addEventListener('click',()=>goto(current-1));
  btns[1]?.addEventListener('click',()=>goto(current+1));
  dots.forEach((d,i)=>d.addEventListener('click',()=>goto(i)));
  setInterval(()=>goto(current+1),5000);
}

/* ── FAQ ── */
function setupFAQ() {
  document.querySelectorAll('.faq-item').forEach(item=>{
    item.querySelector('.faq-question')?.addEventListener('click',()=>{
      const isOpen=item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(o=>o.classList.remove('open'));
      if(!isOpen)item.classList.add('open');
    });
  });
}

/* ── LIVE CHAT ── */
function setupLiveChat() {
  const btn=document.getElementById('liveChatBtn');
  const panel=document.getElementById('chatPanel');
  const closeBtn=document.getElementById('closeChatBtn');
  const input=document.getElementById('chatInput');
  const sendBtn=document.getElementById('sendChatBtn');
  const messages=document.getElementById('chatMessages');
  if(!btn||!panel)return;

  btn.addEventListener('click',()=>panel.classList.toggle('open'));
  closeBtn?.addEventListener('click',()=>panel.classList.remove('open'));

  const chatHistory=[];
  let inFlight=false;

  // Auto greeting
  setTimeout(()=>addChatMsg('Hi! I am Blaze AI (Ollama). Ask me about menu, delivery, timings, or offers.','bot'),600);

  function addChatMsg(text,type) {
    const msg=document.createElement('div');
    msg.className=`chat-msg ${type}`;msg.textContent=text;
    messages.appendChild(msg);messages.scrollTop=messages.scrollHeight;
    return msg;
  }

  function setInputState(disabled) {
    if (input) input.disabled = disabled;
    if (sendBtn) sendBtn.disabled = disabled;
  }

  async function sendMsg() {
    if (inFlight) return;
    const val=input.value.trim();if(!val)return;

    addChatMsg(val,'user');
    input.value='';
    inFlight=true;
    setInputState(true);

    const typingEl = addChatMsg('Blaze AI is typing...','bot');

    try {
      const res = await fetch(`${API_BASE}/chat/ollama`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: val,
          history: chatHistory
        })
      });

      const data = await res.json();
      typingEl.remove();

      if (!res.ok || !data.success) {
        addChatMsg(data.message || 'AI is unavailable right now. Please try again in a moment.','bot');
      } else {
        chatHistory.push({ role: 'user', content: val });
        chatHistory.push({ role: 'assistant', content: data.reply });
        addChatMsg(data.reply,'bot');
      }
    } catch (err) {
      typingEl.remove();
      addChatMsg('Could not connect to AI support. Make sure backend and Ollama are running.','bot');
    } finally {
      inFlight=false;
      setInputState(false);
      input?.focus();
    }
  }
  sendBtn?.addEventListener('click',sendMsg);
  input?.addEventListener('keydown',e=>{if(e.key==='Enter')sendMsg();});
}

/* ── WHATSAPP ── */
function setupWhatsApp() {
  document.getElementById('whatsappBtn')?.addEventListener('click',()=>{
    window.open('https://wa.me/919876543210?text=Hi%20Blaze%20Kitchen!%20I%27d%20like%20to%20place%20an%20order.','_blank');
  });
}

/* ── PWA ── */
let deferredPrompt=null;
function setupPWA() {
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();deferredPrompt=e;
    document.getElementById('pwaBanner')?.classList.add('visible');
  });
  document.getElementById('pwaInstall')?.addEventListener('click',()=>{
    deferredPrompt?.prompt();
    deferredPrompt?.userChoice.then(()=>{
      deferredPrompt=null;
      document.getElementById('pwaBanner')?.classList.remove('visible');
    });
  });
  document.getElementById('pwaDismiss')?.addEventListener('click',()=>{
    document.getElementById('pwaBanner')?.classList.remove('visible');
  });
  if('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }
}

/* ── MENU LOADING (REAL DATA ONLY) ── */
/* ── MENU JSON (loaded from white_teak_roasters_menu_fixed.json) ── */
let MENU_DATA = [];

function buildSimpleItemDescription(name, category, subcategory) {
  const nameText = String(name || 'House Special').trim();
  const n = nameText.toLowerCase();
  const sectionText = String(subcategory || category || 'kitchen').trim();

  function hashSeed(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function pick(list, seed, offset) {
    return list[(seed + offset) % list.length];
  }

  const seed = hashSeed(`${nameText}|${category || ''}|${subcategory || ''}`);
  const moods = ['flavor-packed', 'well-balanced', 'freshly crafted', 'comfort-style', 'signature'];
  const methods = ['made to order', 'prepared with care', 'finished with house seasoning', 'served fresh', 'built for a satisfying bite'];
  const endings = ['perfect for any time of day', 'a guest favorite on our menu', 'great when you want bold taste', 'crafted for a clean and rich finish', 'designed to keep every bite interesting'];

  let type = 'house special';
  if (n.includes('burger')) type = 'burger';
  else if (n.includes('sandwich')) type = 'sandwich';
  else if (n.includes('pasta') || n.includes('spaghetti') || n.includes('rigatoni') || n.includes('penne')) type = 'pasta bowl';
  else if (n.includes('coffee') || n.includes('espresso') || n.includes('latte') || n.includes('cappuccino')) type = 'coffee brew';
  else if (n.includes('matcha') || n.includes('hojicha')) type = 'tea blend';
  else if (n.includes('mojito') || n.includes('lemonade') || n.includes('juice') || n.includes('smoothie') || n.includes('shake')) type = 'refreshing drink';
  else if (n.includes('pancake') || n.includes('waffle') || n.includes('toast')) type = 'sweet plate';
  else if (n.includes('salad')) type = 'fresh salad';
  else if (n.includes('soup')) type = 'warm soup';

  return `${nameText} is a ${pick(moods, seed, 0)} ${type} from our ${sectionText} selection, ${pick(methods, seed, 2)} and ${pick(endings, seed, 4)}.`;
}

async function loadMenu() {
  try {
    console.log('🔥 Loading menu from API...');
    const res = await fetch(`${API_BASE}/menus`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const apiData = await res.json();
    
    const categories = apiData.data || apiData;
    console.log(`✅ Loaded ${categories.length} categories from API`);

    let allFlatItems = [];
    let categoryMap = {};
    let categoryImageMap = {};

    categories.forEach(categoryDoc => {
      const mainCategory = categoryDoc.category || 'Menu';
      const categoryImage = categoryDoc.image || CATEGORY_META[mainCategory]?.img || DEFAULT_IMG;
      categoryMap[mainCategory] = [];
      categoryImageMap[mainCategory] = categoryImage;

      if (categoryDoc.subcategories && Array.isArray(categoryDoc.subcategories)) {
        categoryDoc.subcategories.forEach(subcat => {
          if (subcat.items && Array.isArray(subcat.items)) {
            subcat.items.forEach(item => {
              // Skip unavailable items — don't show on frontend
              if (item.available === false) return;

              const flatItem = {
                _id: item._id || item.id || 'item-' + Math.random(),
                name: item.name || 'Unknown Item',
                prices: Array.isArray(item.prices) ? item.prices : [item.price || 0],
                price: (item.prices && item.prices[0]) || Number(item.price) || 0,
                description: item.description || item.note || buildSimpleItemDescription(item.name, mainCategory, subcat.name),
                image_url: item.image_url || item.image || '',
                category: mainCategory,
                categoryImage,
                subcategory: subcat.name || '',
                availability: item.available !== false,
                badge: item.badge || categoryDoc.badge || '',
                rating: Number(item.rating) || 0,
                reviewCount: Number(item.reviewCount) || 0,
              };
              
              const normalized = normalizeItem(flatItem);
              allFlatItems.push(normalized);
              categoryMap[mainCategory].push(normalized);
            });
          }
        });
      }
    });

    state.allItems = allFlatItems;
    console.log(`✅ Flattened into ${allFlatItems.length} items across ${categories.length} categories`);

    MENU_DATA = Object.keys(categoryMap).map(cat => ({
      category: cat,
      items: categoryMap[cat],
      image: categoryImageMap[cat] || categoryMap[cat][0]?.categoryImage || CATEGORY_META[cat]?.img || DEFAULT_IMG,
    }));

    setTimeout(() => {
      renderCategoryCards();
      renderTrending();
      applyFilters();
    }, 50);
  } catch (err) {
    console.error('❌ Menu loading error:', err.message);
    const grid = document.getElementById('menuGrid');
    if (grid) grid.innerHTML = `<div class="no-results"><div class="no-results-icon">⚠️</div><p>Could not load menu. Make sure the backend is running at <strong>http://localhost:5000</strong></p></div>`;
    state.allItems = [];
    MENU_DATA = [];
    renderCategoryCards();
  }
}

function normalizeItem(item) {
  const calorieMap = {
    'coffee & brews': 15, 'just matcha & hojicha': 20, 'beverages': 120,
    'breakfast plates': 380, 'pancakes & waffles': 420, 'mains': 480,
    'salads & soups': 180, 'burgers & sandwiches': 550, 'default': 300
  };
  const categoryKey = (item.category || 'menu').toLowerCase();

  // Resolve image: item-specific → subcategory → category → default
  const resolvedImage = item.image_url || item.image
    || ITEM_IMAGES[item.name]
    || SUBCATEGORY_IMAGES[item.subcategory]
    || CATEGORY_META[item.category]?.img
    || DEFAULT_IMG;

  // Compute display price (lowest of prices array or fallback to price field)
  const pricesArr = Array.isArray(item.prices) && item.prices.length > 0
    ? item.prices.map(Number).filter(p => p > 0)
    : [Number(item.price) || 0];
  const displayPrice = pricesArr[0] || 0;
  const priceRange = pricesArr.length > 1
    ? `₹${Math.min(...pricesArr)}–₹${Math.max(...pricesArr)}`
    : `₹${displayPrice}`;

  return {
    ...item,
    _id: item._id || item.id || 'item-' + Math.random(),
    name: item.name || 'Unknown Item',
    category: item.category || 'Menu',
    price: displayPrice,
    prices: pricesArr,
    priceRange,
    description: item.description || item.note || buildSimpleItemDescription(item.name, item.category, item.subcategory),
    image: resolvedImage,
    rating: Number(item.rating) || 4.2 + Math.random() * 0.6,
    reviewCount: Number(item.reviewCount) || Math.floor(Math.random() * 80) + 10,
    badge: item.badge || '',
    available: item.available !== false && item.availability !== false,
    calories: item.calories || calorieMap[categoryKey] || calorieMap.default,
    subcategory: item.subcategory || '',
  };
}



/* ── RENDER TRENDING ── */
function renderTrending() {
  const section = document.getElementById('trendingSection');
  const scroll  = document.getElementById('trendingScroll');
  if (!section || !scroll) return;
  // Pick top-rated items from each category (one per category, max 8)
  const picks = [];
  const seen  = new Set();
  [...state.allItems]
    .sort((a, b) => b.rating - a.rating)
    .forEach(item => {
      if (!seen.has(item.category) && picks.length < 8) {
        seen.add(item.category); picks.push(item);
      }
    });
  if (!picks.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  scroll.innerHTML = picks.map((item, i) => `
    <div class="trending-item" onclick="openItemModalByName('${item.name.replace(/'/g,"\\'")}')">
      <span class="trending-rank">${String(i + 1).padStart(2, '0')}</span>
      <img src="${item.image}" alt="${item.name}" onerror="this.src='${DEFAULT_IMG}'">
      <div class="trending-item-info">
        <div class="trending-item-name">${item.name}</div>
        <div class="trending-item-price">${item.priceRange || '₹' + item.price}</div>
      </div>
    </div>`).join('');
}

/* ── RECENTLY VIEWED ── */
function addToRecentlyViewed(item) {
  state.recentlyViewed=state.recentlyViewed.filter(i=>i.name!==item.name);
  state.recentlyViewed.unshift(item);
  if(state.recentlyViewed.length>6)state.recentlyViewed.pop();
  renderRecentlyViewed();
}
function renderRecentlyViewed() {
  const scroll=document.getElementById('rvScroll');
  const section=document.getElementById('rvSection');
  if(!scroll)return;
  if(!state.recentlyViewed.length){
    section?.style&&(section.style.display='none');return;
  }
  section?.style&&(section.style.display='block');
  scroll.innerHTML=state.recentlyViewed.map(item=>`
    <div class="rv-chip" onclick="openItemModalByName('${item.name}')">
      <img src="${item.image}" alt="${item.name}" onerror="this.src='${DEFAULT_IMG}'">
      <span>${item.name}</span>
    </div>
  `).join('');
}

/* ── APPLY FILTERS ── */
function applyFilters() {
  let items=[...state.allItems];
  // Max calories filter
  const calMax=parseInt(document.getElementById('calFilter')?.value||9999);
  // Veg only
  const vegOnly=document.getElementById('advVeg')?.classList.contains('active');
  if(state.search){
    const q=state.search.toLowerCase();
    items=items.filter(i=>i.name.toLowerCase().includes(q)||i.description.toLowerCase().includes(q)||i.category.toLowerCase().includes(q));
  }
  if(state.filter!=='all')items=items.filter(i=>i.category===state.filter);
  if(vegOnly)items=items.filter(i=>i.badge&&i.badge.toLowerCase().includes('veg'));
  items=items.filter(i=>i.calories<=calMax);
  if(state.sort==='price-asc')items.sort((a,b)=>a.price-b.price);
  if(state.sort==='price-desc')items.sort((a,b)=>b.price-a.price);
  if(state.sort==='name')items.sort((a,b)=>a.name.localeCompare(b.name));
  if(state.sort==='rating')items.sort((a,b)=>b.rating-a.rating);
  state.filtered=items; state.currentPage=0; renderMenu(true);
}

/* ── RENDER MENU ── */
function renderMenu(reset=false) {
  const grid    = document.getElementById('menuGrid');
  const count   = document.getElementById('resultCount');
  const loadBtn = document.getElementById('loadMoreBtn');
  if (!grid) return; // menu grid hidden on homepage — skip
  const start = reset ? 0 : state.currentPage * ITEMS_PER_PAGE;
  const end   = (state.currentPage + 1) * ITEMS_PER_PAGE;
  const chunk = state.filtered.slice(start, end);
  if (reset) { grid.innerHTML = ''; state.currentPage = 0; }
  if (state.filtered.length === 0) {
    grid.innerHTML = `<div class="no-results"><div class="no-results-icon">🔍</div><p>No items found for "<strong>${state.search || state.filter}</strong>"</p></div>`;
    if (loadBtn) loadBtn.style.display = 'none';
    if (count)   count.textContent = '0 items';
    return;
  }
  chunk.forEach((item, i) => {
    const card = createMenuCard(item);
    card.style.animationDelay = `${i * 40}ms`;
    card.style.animation = 'cardIn 0.4s ease both';
    grid.appendChild(card);
  });
  if (!document.getElementById('card-anim')) {
    const style = document.createElement('style');
    style.id = 'card-anim';
    style.textContent = '@keyframes cardIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(style);
  }
  const shown = Math.min(end, state.filtered.length);
  if (count)   count.textContent = `${state.filtered.length} item${state.filtered.length !== 1 ? 's' : ''}`;
  state.currentPage++;
  if (loadBtn) loadBtn.style.display = shown < state.filtered.length ? 'inline-flex' : 'none';
}

/* ── CREATE MENU CARD ── */
function createMenuCard(item) {
  const card = document.createElement('div');
  card.className = 'menu-card'; card.dataset.id = item._id || item.id;
  const img = item.image || DEFAULT_IMG;
  const badge = item.badge ? `<span class="menu-badge">${item.badge}</span>` : '';
  const newBadge = !item.badge ? '' : '';
  const isWished = state.wishlist.some(w => w.name === item.name);
  const priceDisplay = item.priceRange || `₹${item.price}`;
  const subcatLabel = item.subcategory ? `<span class="menu-card-subcat">${item.subcategory}</span>` : '';
  const stars = Math.round(item.rating || 4.5);
  const starsHtml = '⭐'.repeat(Math.min(stars, 5));
  const unavailabledClass = !item.available ? ' unavailable' : '';
  const hasDescription = Boolean(item.description && String(item.description).trim());
  const safeDescription = hasDescription ? String(item.description).trim() : '';

  card.innerHTML = `
    <div class="menu-card-img-wrap${unavailabledClass}">
      <img src="${img}" alt="${item.name}" loading="lazy" onerror="this.src='${DEFAULT_IMG}'">
      <div class="menu-card-img-overlay"></div>
      ${badge}
      <button class="wishlist-heart${isWished ? ' active' : ''}" data-name="${item.name}" aria-label="Wishlist">${isWished ? '❤️' : '🤍'}</button>
      ${!item.available ? '<div class="sold-out-ribbon">Sold Out</div>' : ''}
      <button class="quick-view-btn"><i class="fas fa-eye"></i> Quick View</button>
    </div>
    <div class="menu-card-body">
      <div class="menu-card-top-row">
        <span class="menu-card-category">${item.category}</span>
        ${subcatLabel}
      </div>
      <div class="menu-card-name${hasDescription ? ' menu-desc-trigger' : ''}">${item.name}</div>
      ${hasDescription ? `
        <div class="menu-card-desc-wrap">
          <div class="menu-card-desc">${safeDescription}</div>
        </div>` : ''}
      <div class="menu-card-meta">
        <span class="rating-mini" title="${(item.rating||4.5).toFixed(1)} stars">⭐ ${(item.rating||4.5).toFixed(1)} <em>(${item.reviewCount||0})</em></span>
      </div>
      <div class="menu-card-footer">
        <div class="menu-card-price">${priceDisplay}</div>
        <button class="btn-add-cart${!item.available ? ' disabled' : ''}" ${!item.available ? 'disabled' : ''}>
          <i class="fas fa-plus"></i> ${item.available ? 'Add' : 'Sold Out'}
        </button>
      </div>
    </div>`;

  // Wishlist toggle
  card.querySelector('.wishlist-heart').addEventListener('click', e => {
    e.stopPropagation(); toggleWishlist(item);
    const h = card.querySelector('.wishlist-heart');
    const wished = state.wishlist.some(w => w.name === item.name);
    h.classList.toggle('active', wished);
    h.textContent = wished ? '❤️' : '🤍';
  });
  // Quick view
  card.querySelector('.quick-view-btn').addEventListener('click', e => {
    e.stopPropagation(); openItemModal(item);
  });
  // Add to cart
  const addBtn = card.querySelector('.btn-add-cart');
  if (item.available) {
    addBtn.addEventListener('click', e => {
      e.stopPropagation(); addToCart(item);
      addBtn.classList.add('added');
      addBtn.innerHTML = '<i class="fas fa-check"></i> Added';
      setTimeout(() => { addBtn.classList.remove('added'); addBtn.innerHTML = '<i class="fas fa-plus"></i> Add'; }, 1800);
    });
  }

  const descTrigger = card.querySelector('.menu-desc-trigger');
  const descWrap = card.querySelector('.menu-card-desc-wrap');
  const descText = card.querySelector('.menu-card-desc');
  if (descTrigger && descWrap) {
    const toggleDescription = e => {
      e.stopPropagation();
      const isOpen = descWrap.classList.toggle('expanded');
      descTrigger.classList.toggle('expanded', isOpen);
    };
    descTrigger.addEventListener('click', toggleDescription);
    descText?.addEventListener('click', toggleDescription);
  }

  // Card click → modal
  card.addEventListener('click', () => { openItemModal(item); addToRecentlyViewed(item); });
  return card;
}

/* ── ITEM MODAL ── */
function openItemModal(item) {
  state.itemModal=item; state.itemQty=1;
  const isWished=state.wishlist.some(w=>w.name===item.name);
  document.getElementById('itemModalImg').src=item.image||DEFAULT_IMG;
  document.getElementById('itemModalImg').alt=item.name;
  document.getElementById('itemModalBadge').textContent=item.badge||'';
  document.getElementById('itemModalBadge').style.display=item.badge?'block':'none';
  document.getElementById('itemModalCat').textContent=item.category;
  document.getElementById('itemModalName').textContent=item.name;
  document.getElementById('itemModalDesc').textContent=item.description;
  document.getElementById('itemModalPrice').textContent=`₹${item.price}`;
  document.getElementById('itemModalRating').innerHTML=`⭐ ${item.rating?.toFixed(1)||'4.5'} <span>(${item.reviewCount||0} reviews)</span>`;
  document.getElementById('itemModalCalories').textContent=`🔥 ${item.calories||''} kcal`;
  document.getElementById('itemModalAdd').innerHTML='<i class="fas fa-bag-shopping"></i> Add to Cart';
  document.getElementById('itemQtyVal').textContent=1;
  const wishBtn=document.getElementById('itemModalWishlist');
  wishBtn.classList.toggle('active',isWished);
  wishBtn.innerHTML=isWished?'❤️':'🤍';

  // Load reviews
  renderModalReviews(item);
  document.getElementById('itemModal').classList.add('open');
  document.getElementById('itemOverlay').classList.add('active');
  document.body.style.overflow='hidden';
  addToRecentlyViewed(item);
}
function closeItemModal() {
  document.getElementById('itemModal').classList.remove('open');
  document.getElementById('itemOverlay').classList.remove('active');
  document.body.style.overflow=''; state.itemModal=null;
}
function openItemModalByName(name) {
  const item=state.allItems.find(i=>i.name===name);
  if(item)openItemModal(item);
}

function renderModalReviews(item) {
  const container=document.getElementById('itemReviews');
  if(!container)return;
  const reviews=state.reviews[item.name]||MOCK_REVIEWS.default;
  container.innerHTML=reviews.map(r=>`
    <div class="review-card">
      <div class="review-top">
        <div class="reviewer">
          <div class="reviewer-avatar">${r.name[0]}</div>
          <div>
            <div class="reviewer-name">${r.name}</div>
            <div class="reviewer-date">${r.date}</div>
          </div>
        </div>
        <div class="review-stars">${'⭐'.repeat(r.rating)}</div>
      </div>
      <div class="review-text">${r.text}</div>
    </div>
  `).join('');
}

/* ── WISHLIST ── */
function toggleWishlist(item) {
  const idx=state.wishlist.findIndex(w=>w.name===item.name);
  if(idx>=0){state.wishlist.splice(idx,1);toast(`💔 Removed from wishlist`);}
  else{state.wishlist.push(item);toast(`❤️ Added to wishlist!`);}
  saveState(); updateWishlistUI();
  // Update wishlist btn in modal
  const wishBtn=document.getElementById('itemModalWishlist');
  if(wishBtn){
    const isWished=state.wishlist.some(w=>w.name===item.name);
    wishBtn.classList.toggle('active',isWished);
    wishBtn.innerHTML=isWished?'❤️':'🤍';
  }
}
function updateWishlistUI() {
  const count=state.wishlist.length;
  const badge=document.getElementById('wishlistCount');
  if(badge)badge.textContent=count;

  // Update count pill in new header
  const pill=document.getElementById('wishlistCountPill');
  if(pill)pill.textContent=count===0?'Empty':count===1?'1 item':`${count} items`;

  // Show/hide footer
  const footer=document.getElementById('wishlistFooter');
  if(footer)footer.style.display=count>0?'flex':'none';

  const body=document.getElementById('wishlistBody');
  if(!body)return;
  if(!count){
    body.innerHTML=`<div class="wishlist-empty">
      <div class="wishlist-empty-icon">🤍</div>
      <h4>Nothing saved yet</h4>
      <p>Tap the ❤️ on any dish to save it here for later.</p>
    </div>`;return;
  }
  body.innerHTML=state.wishlist.map((item,i)=>`
    <div class="wishlist-item">
      <img class="wishlist-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='${DEFAULT_IMG}'">
      <div class="wishlist-item-info">
        <div class="wishlist-item-name">${item.name}</div>
        <div class="wishlist-item-price">₹${item.price}</div>
        <button class="btn-wl-add" onclick="window.__wlAddCart(${i})"><i class="fas fa-bag-shopping" style="font-size:0.7rem"></i> Add to Cart</button>
      </div>
      <button class="btn-wl-remove" title="Remove" onclick="window.__wlRemove(${i})"><i class="fas fa-trash-alt" style="font-size:0.72rem"></i></button>
    </div>
  `).join('');
  // Index-based helpers — safe for any item name (avoids apostrophe/quote escaping issues)
  window.__wlAddCart=function(i){const it=state.wishlist[i];if(it)addToCart(it);};
  window.__wlRemove=function(i){state.wishlist.splice(i,1);saveState();updateWishlistUI();};
}
function clearWishlist(){
  state.wishlist=[];
  saveState(); updateWishlistUI();
  toast('Wishlist cleared');
}
function openWishlist(){document.getElementById('wishlistPanel').classList.add('open');document.getElementById('wishlistOverlay').classList.add('active');document.body.style.overflow='hidden';}
function closeWishlist(){document.getElementById('wishlistPanel').classList.remove('open');document.getElementById('wishlistOverlay').classList.remove('active');document.body.style.overflow='';}
function removeFromWishlistByName(name){
  state.wishlist=state.wishlist.filter(w=>w.name!==name);
  saveState(); updateWishlistUI();
}

/* ── CART ── */
function addToCart(item,qty=1) {
  const existing=state.cart.find(c=>c.name===item.name);
  if(existing){
    existing.quantity+=qty;
    if(!existing.source)existing.source='blaze';
  }
  else state.cart.push({
    id:item._id||item.id||Date.now(),
    name:item.name,
    price:item.price,
    category:item.category,
    image:item.image||DEFAULT_IMG,
    quantity:qty,
    source:item.source||'blaze'
  });
  saveState(); updateCartUI(); toast(`🛒 ${item.name} added!`);
}
function addToCartByName(name,price,category,image) {
  addToCart({name,price,category,image});
}
function removeFromCart(id){state.cart=state.cart.filter(i=>i.id!=id);saveState();updateCartUI();}
function removeFromCartByIndex(index){
  if(index<0||index>=state.cart.length)return;
  state.cart.splice(index,1);
  saveState();updateCartUI();
}
function updateQty(id,delta){
  const item=state.cart.find(i=>i.id==id);if(!item)return;
  item.quantity+=delta;
  if(item.quantity<=0)removeFromCart(id);else{saveState();updateCartUI();}
}
function updateQtyByIndex(index,delta){
  const item=state.cart[index];
  if(!item)return;
  item.quantity+=delta;
  if(item.quantity<=0)removeFromCartByIndex(index);else{saveState();updateCartUI();}
}
function updateCartUI(){
  const count=state.cart.reduce((s,i)=>s+i.quantity,0);
  const badge=document.getElementById('cartCount');
  if(badge){
    badge.textContent=count;
    if(count>0){badge.classList.remove('bump');void badge.offsetWidth;badge.classList.add('bump');}
  }
  const body=document.getElementById('cartItems');
  const footer=document.getElementById('cartFooter');
  const label=document.getElementById('cartItemLabel');
  if(label)label.textContent=`${count} item${count!==1?'s':''}`;
  if(!body||!footer)return;
  if(!state.cart.length){
    body.innerHTML=`<div class="cart-empty"><div class="cart-empty-icon">🛒</div><p>Your cart is empty</p><button class="btn-browse" onclick="closeCart();document.getElementById('menu').scrollIntoView({behavior:'smooth'})">Browse Menu</button></div>`;
    footer.style.display='none';return;
  }
  body.innerHTML=state.cart.map((item,index)=>`
    <div class="cart-item">
      <img class="cart-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='${DEFAULT_IMG}'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₹${item.price} × ${item.quantity} = ₹${item.price*item.quantity}</div>
      </div>
      <div class="qty-controls">
        <button class="qty-btn-sm" onclick="updateQtyByIndex(${index},-1)">−</button>
        <span class="qty-val">${item.quantity}</span>
        <button class="qty-btn-sm" onclick="updateQtyByIndex(${index},1)">+</button>
      </div>
      <button class="cart-remove" onclick="removeFromCartByIndex(${index})"><i class="fas fa-trash-alt"></i></button>
    </div>`).join('');
  footer.style.display='block';
  updateCartSummary();
}
function updateCartSummary(){
  const subtotal=state.cart.reduce((s,i)=>s+i.price*i.quantity,0);
  const discount=parseInt(localStorage.getItem('blaze_discount')||'0');
  const taxable=Math.max(0,subtotal-discount);
  const delivery=subtotal>=FREE_DELIVERY_THRESHOLD?0:DELIVERY_FEE;
  const gst=Math.round(taxable*GST_RATE);
  const packaging=Math.round(taxable*0.07);
  const total=Math.max(0,taxable+gst+delivery+packaging);
  const elSub=document.getElementById('subtotal');
  const elTotal=document.getElementById('total');
  const elDisc=document.getElementById('discount');
  const discRow=document.getElementById('discountRow');
  const elGst=document.getElementById('cartGst');
  const elPkg=document.getElementById('cartPackaging');
  if(elSub)elSub.textContent=`₹${subtotal}`;
  if(elGst)elGst.textContent=`₹${gst}`;
  if(elPkg)elPkg.textContent=`₹${packaging}`;
  if(elTotal)elTotal.textContent=`₹${total}`;
  if(discRow){
    if(discount>0){if(elDisc)elDisc.textContent=`−₹${discount}`;discRow.style.display='flex';}
    else discRow.style.display='none';
  }
}
function openCart(){document.getElementById('cartPanel').classList.add('open');document.getElementById('cartOverlay').classList.add('active');document.body.style.overflow='hidden';}
function closeCart(){document.getElementById('cartPanel').classList.remove('open');document.getElementById('cartOverlay').classList.remove('active');document.body.style.overflow='';}

/* ── AUTH ── */
function openAuthModal(){document.getElementById('authModal').classList.add('open');document.getElementById('authOverlay').classList.add('active');document.body.style.overflow='hidden';}
function closeAuthModal(){document.getElementById('authModal').classList.remove('open');document.getElementById('authOverlay').classList.remove('active');document.body.style.overflow='';}
function updateAuthUI(){
  const loginBtn    = document.getElementById('loginBtn');
  const accountMenu = document.getElementById('accountMenu');
  if (!loginBtn || !accountMenu) return;
  if (state.user) {
    loginBtn.style.display    = 'none';
    accountMenu.style.display = 'block';
    const initial = (state.user.name||'U')[0].toUpperCase();
    const first   = state.user.name?.split(' ')[0] || 'Account';
    const el = (id) => document.getElementById(id);
    if (el('accountAvatar'))  el('accountAvatar').textContent  = initial;
    if (el('accountName'))    el('accountName').textContent    = first;
    if (el('acctAvatarLg'))   el('acctAvatarLg').textContent   = initial;
    if (el('acctFullName'))   el('acctFullName').textContent   = state.user.name || 'User';
    if (el('acctEmail'))      el('acctEmail').textContent      = state.user.email || '';
  } else {
    loginBtn.style.display    = '';
    accountMenu.style.display = 'none';
    closeAccountDropdown();
  }
}
function closeAccountDropdown(){
  const m = document.getElementById('accountMenu');
  if (m) m.classList.remove('open');
}

/* ── PASSWORD STRENGTH ── */
function checkPasswordStrength(pw) {
  let score=0;
  if(pw.length>=6)score++;if(pw.length>=10)score++;
  if(/[A-Z]/.test(pw))score++;if(/[0-9]/.test(pw))score++;if(/[^A-Za-z0-9]/.test(pw))score++;
  return score;
}
function updateStrengthBar(pw) {
  const score=checkPasswordStrength(pw);
  const segs=document.querySelectorAll('.pw-segment');
  const label=document.querySelector('.pw-strength-text');
  segs.forEach((s,i)=>{s.className='pw-segment';if(i<score){s.classList.add(score<=2?'weak':score<=3?'medium':'strong');}});
  const labels=['','Weak','Weak','Medium','Strong','Very Strong'];
  if(label)label.textContent=pw?labels[score]:'';
}

/* ── OTP ── */
function generateOTP(){return Math.floor(100000+Math.random()*900000).toString();}
function setupOTPInputs(){
  const inputs=document.querySelectorAll('.otp-input');
  inputs.forEach((inp,i)=>{
    inp.addEventListener('input',()=>{
      if(inp.value&&i<inputs.length-1)inputs[i+1].focus();
    });
    inp.addEventListener('keydown',e=>{if(e.key==='Backspace'&&!inp.value&&i>0)inputs[i-1].focus();});
  });
}

/* ── ACCOUNT LOCK ── */
function recordFailedLogin(){
  state.failedLogins++;
  if(state.failedLogins>=5){
    state.accountLocked=true;state.lockExpiry=Date.now()+5*60*1000;
    toast('Account locked for 5 minutes due to too many failed attempts','error');
  } else toast(`Invalid credentials. ${5-state.failedLogins} attempts left`,'error');
}
function isAccountLocked(){
  if(!state.accountLocked)return false;
  if(Date.now()>state.lockExpiry){state.accountLocked=false;state.failedLogins=0;return false;}
  return true;
}

/* ── PAYMENT ── */
function openPaymentModal(){
  const subtotal=state.cart.reduce((s,i)=>s+i.price*i.quantity,0);
  const discount=parseInt(localStorage.getItem('blaze_discount')||'0');
  const taxable=Math.max(0,subtotal-discount);
  const delivery=subtotal>=FREE_DELIVERY_THRESHOLD?0:DELIVERY_FEE;
  const gst=Math.round(taxable*GST_RATE);
  const packaging=Math.round(taxable*0.07);
  const total=Math.max(0,taxable+gst+delivery+packaging);
  document.getElementById('paySubtotal').textContent=`₹${subtotal}`;
  document.getElementById('payDiscount').textContent=discount?`−₹${discount}`:'₹0';
  document.getElementById('payDelivery').textContent=delivery===0?'FREE':`₹${delivery}`;
  document.getElementById('payGST').textContent=`₹${gst}`;
  const pkgEl=document.getElementById('payPackaging');if(pkgEl)pkgEl.textContent=`₹${packaging}`;
  document.getElementById('payTotal').textContent=`₹${total}`;
  // Addresses
  renderAddresses();
  document.getElementById('paymentModal').classList.add('open');
  document.getElementById('paymentOverlay').classList.add('active');
  document.body.style.overflow='hidden';
}
function closePaymentModal(){document.getElementById('paymentModal').classList.remove('open');document.getElementById('paymentOverlay').classList.remove('active');document.body.style.overflow='';}

function renderAddresses(){
  const grid=document.getElementById('addressGrid');
  if(!grid)return;
  grid.innerHTML=state.addresses.map(a=>{
    const txt=a.text||[a.line1,a.line2,a.city?`${a.city} - ${a.pin}`:''].filter(Boolean).join(', ');
    return `<div class="address-card ${a.id===state.selectedAddress?'active':''}" onclick="selectAddress(${a.id})">
      <div class="address-type">${a.type}</div>
      <div class="address-text">${txt}</div>
    </div>`;
  }).join('');
}
function selectAddress(id){state.selectedAddress=id;renderAddresses();}

/* ── TRACKING ── */
function openTrackingModal(orderId){
  const steps=[
    {icon:'✅',label:'Order Confirmed',time:'Just now',done:true,active:false},
    {icon:'👨‍🍳',label:'Preparing Your Food',time:'In kitchen now',done:false,active:true},
    {icon:'🛵',label:'Out for Delivery',time:'In ~25 minutes',done:false,active:false},
    {icon:'🚪',label:'Delivered',time:'Pending',done:false,active:false},
  ];
  document.getElementById('trackingInfo').innerHTML=steps.map(s=>`
    <div class="tracking-step ${s.done?'done':''} ${s.active?'active':''}">
      <div class="tracking-icon">${s.icon}</div>
      <div class="tracking-text"><strong>${s.label}</strong><span>${s.time}</span></div>
    </div>`).join('')+`<p style="margin-top:20px;font-family:'Space Mono',monospace;font-size:0.78rem;color:var(--text-muted)">Order ID: <strong style="color:var(--orange)">#${orderId}</strong></p>`;
  document.getElementById('trackingModal').classList.add('open');
  document.getElementById('trackingOverlay').classList.add('active');
  document.body.style.overflow='hidden';
}
function closeTrackingModal(){document.getElementById('trackingModal').classList.remove('open');document.getElementById('trackingOverlay').classList.remove('active');document.body.style.overflow='';}

/* ── ORDER SUCCESS ── */
function showOrderSuccess(orderId){
  const el=document.getElementById('orderSuccess');
  if(!el)return;
  el.querySelector('.success-id').textContent=`Order #${orderId}`;
  el.classList.add('show');
  setTimeout(()=>{el.classList.remove('show');openTrackingModal(orderId);},3000);
}

/* ── CONTACT FORM ── */
function setupContactForm(){
  document.getElementById('contactForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('.btn-cf-submit');
    const name    = document.getElementById('cfName')?.value.trim();
    const email   = document.getElementById('cfEmail')?.value.trim();
    const phone   = document.getElementById('cfPhone')?.value.trim();
    const subject = document.getElementById('cfSubject')?.value;
    const message = document.getElementById('cfMessage')?.value.trim();

    if (!name || !email || !message) {
      toast('Please fill in all required fields.', 'error');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';

    try {
      const res = await fetch(`${API_BASE}/feedback`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, phone, subject, message })
      });
      const data = await res.json();
      if (data.success) {
        btn.innerHTML = '<i class="fas fa-check"></i> Sent!';
        btn.style.background = '#2D9B51';
        toast('Message sent successfully!', 'success');
        e.target.reset();
        setTimeout(() => {
          btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
          btn.style.background = '';
          btn.disabled = false;
        }, 3000);
      } else {
        throw new Error(data.message || 'Failed to send');
      }
    } catch (err) {
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
      btn.disabled = false;
      toast(err.message || 'Failed to send message. Please try again.', 'error');
    }
  });
}

/* ── LOAD SITE CONTACT INFO FROM API ── */
async function loadSiteContactInfo() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success || !json.data) return;

    const s = json.data;

    // Phone
    const phoneEl = document.getElementById('contactPhone');
    if (phoneEl && s.phone) {
      const phoneLine = s.phone;
      const hoursLine = s.hours?.mainHours ? s.hours.mainHours.replace(/:/g, ',') : '';
      phoneEl.innerHTML = `${phoneLine}${hoursLine ? '<br>' + hoursLine : ''}`;
    }

    // Email
    const emailEl = document.getElementById('contactEmail');
    if (emailEl && s.emails && s.emails.length) {
      emailEl.innerHTML = s.emails.join('<br>');
    }

    // Hours
    const hoursEl = document.getElementById('contactHours');
    if (hoursEl && s.hours) {
      const parts = [];
      if (s.hours.mainHours) parts.push(s.hours.mainHours);
      if (s.hours.lateNight) parts.push(s.hours.lateNight);
      hoursEl.innerHTML = parts.join('<br>');
    }

    // Address
    const addrEl = document.getElementById('contactAddress');
    if (addrEl && s.address) {
      addrEl.innerHTML = s.address.replace(/,\s*/g, ',<br>');
    }
  } catch (err) {
    console.log('Could not load site contact settings, using defaults.');
  }
}

/* ══════════════════════════════════════════════
   SSE — Real-time updates from admin (no refresh)
   Uses EventSource built-in auto-reconnect.
   ══════════════════════════════════════════════ */
let _blazeSSE = null;
let _blazeSSEClosing = false;   // true during intentional page unload

function connectPublicSSE() {
  if (_blazeSSE) return; // already connected
  _blazeSSEClosing = false;
  const url = `${API_BASE}/events/public`;
  const es  = new EventSource(url);
  _blazeSSE = es;

  es.addEventListener('connected', () => {
    console.log('[SSE] ⚡ Live-update stream connected');
  });

  /* ── Menu changed (items, categories, availability) ── */
  es.addEventListener('menu-updated', () => {
    console.log('[SSE] 🔄 Menu updated — refreshing…');
    loadMenu();
  });

  /* ── Site settings changed (phone, email, hours) ── */
  es.addEventListener('settings-updated', (e) => {
    console.log('[SSE] 📞 Settings updated — refreshing contact info…');
    try {
      const s = JSON.parse(e.data);
      const phoneEl = document.getElementById('contactPhone');
      if (phoneEl && s.phone) {
        const hoursLine = s.hours?.mainHours ? s.hours.mainHours.replace(/:/g, ',') : '';
        phoneEl.innerHTML = `${s.phone}${hoursLine ? '<br>' + hoursLine : ''}`;
      }
      const emailEl = document.getElementById('contactEmail');
      if (emailEl && s.emails && s.emails.length) emailEl.innerHTML = s.emails.join('<br>');
      const hoursEl = document.getElementById('contactHours');
      if (hoursEl && s.hours) {
        const parts = [];
        if (s.hours.mainHours) parts.push(s.hours.mainHours);
        if (s.hours.lateNight) parts.push(s.hours.lateNight);
        hoursEl.innerHTML = parts.join('<br>');
      }
      const addrEl = document.getElementById('contactAddress');
      if (addrEl && s.address) addrEl.innerHTML = s.address.replace(/,\s*/g, ',<br>');
    } catch {
      loadSiteContactInfo();
    }
  });

  /* ── Order status changed ── */
  es.addEventListener('order-status-updated', (e) => {
    try {
      const d = JSON.parse(e.data);
      console.log(`[SSE] 📦 Order ${d.orderId} → ${d.status}`);
      if (typeof window.loadOrders === 'function') window.loadOrders();
    } catch { /* ignore */ }
  });

  // Let EventSource auto-reconnect on transient errors.
  // Only do manual reconnect if the browser gave up (readyState === CLOSED).
  es.onerror = () => {
    if (_blazeSSEClosing) return;                 // page unloading — don't retry
    if (es.readyState === EventSource.CLOSED) {
      console.warn('[SSE] Connection closed — reconnecting in 5s…');
      _blazeSSE = null;
      setTimeout(connectPublicSSE, 5000);
    }
    // readyState === CONNECTING → EventSource is auto-reconnecting, do nothing
  };
}

// Graceful shutdown on page unload — prevents stale connections on server
window.addEventListener('beforeunload', () => {
  _blazeSSEClosing = true;
  if (_blazeSSE) { _blazeSSE.close(); _blazeSSE = null; }
});

// Start SSE on page load
connectPublicSSE();

/* ── EVENT LISTENERS ── */
function setupEventListeners(){
  // Guard: only register listeners once per page lifetime
  if (window._blazeListenersSetup) return;
  window._blazeListenersSetup = true;
  // Nav scroll links
  document.getElementById('scrollToMenu')?.addEventListener('click',()=>document.getElementById('menu').scrollIntoView({behavior:'smooth'}));
  document.getElementById('heroOrderBtn')?.addEventListener('click',()=>document.getElementById('menu').scrollIntoView({behavior:'smooth'}));

  // Cart
  document.getElementById('cartBtn')?.addEventListener('click',openCart);
  document.getElementById('closeCart')?.addEventListener('click',closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click',closeCart);

  // Wishlist
  document.getElementById('wishlistBtn')?.addEventListener('click',openWishlist);
  document.getElementById('closeWishlist')?.addEventListener('click',closeWishlist);
  document.getElementById('wishlistOverlay')?.addEventListener('click',closeWishlist);

  // Checkout (slide action)
  setupCheckoutSlideAction();

  // Login btn — redirect to dedicated login page
  document.getElementById('loginBtn')?.addEventListener('click',()=>{
    window.location.href = 'login.html';
  });

  // Account trigger — toggle dropdown
  document.getElementById('accountTrigger')?.addEventListener('click',(e)=>{
    e.stopPropagation();
    document.getElementById('accountMenu')?.classList.toggle('open');
  });

  // Logout btn
  document.getElementById('logoutBtn')?.addEventListener('click',()=>{
    state.user = null;
    localStorage.removeItem('blaze_user');
    localStorage.removeItem('blaze_token');
    saveState();
    updateAuthUI();
    closeAccountDropdown();
    toast('You\'ve been signed out');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click',()=>{ closeAccountDropdown(); });

  // Reset dropdown state when page is shown from bfcache (browser back/forward)
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) closeAccountDropdown();
  });

  // Auth modal close
  document.getElementById('closeAuth')?.addEventListener('click',closeAuthModal);
  document.getElementById('authOverlay')?.addEventListener('click',closeAuthModal);

  // Auth tabs
  document.querySelectorAll('.auth-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f=>f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab+'Form')?.classList.add('active');
    });
  });

  // Password toggles
  document.querySelectorAll('.toggle-pass').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const input=document.getElementById(btn.dataset.target);
      input.type=input.type==='password'?'text':'password';
      btn.querySelector('i').className=input.type==='password'?'fas fa-eye':'fas fa-eye-slash';
    });
  });

  // Password strength
  document.getElementById('regPassword')?.addEventListener('input',e=>updateStrengthBar(e.target.value));

  // OTP inputs
  setupOTPInputs();

  // Role selector
  document.querySelectorAll('.role-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.role-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');state.userRole=btn.dataset.role;
    });
  });

  // Google Auth (mock)
  document.querySelectorAll('.btn-google-auth').forEach(btn=>{
    btn.addEventListener('click',()=>{
      toast('Google OAuth requires backend setup. See INTEGRATION.md','info');
    });
  });

  // Forgot password
  document.getElementById('forgotPwLink')?.addEventListener('click',e=>{
    e.preventDefault();
    const email=document.getElementById('loginEmail')?.value.trim();
    if(!email){toast('Enter your email first','error');return;}
    toast(`Password reset link sent to ${email}`,'success');
  });

  // Login form
  document.getElementById('loginForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    if(isAccountLocked()){toast('Account locked. Try again in 5 minutes','error');return;}
    const email=document.getElementById('loginEmail').value.trim();
    const password=document.getElementById('loginPassword').value;
    const btn=document.getElementById('loginSubmit');
    btn.disabled=true;btn.innerHTML='<span>Logging in…</span>';
    try {
      const res=await fetch(`${API_BASE}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,role:state.userRole})});
      const data=await res.json();
      if(data.success){
        state.user={...data.data.user,token:data.token};state.failedLogins=0;
        saveState();updateAuthUI();closeAuthModal();
        document.getElementById('loginForm').reset();
        toast(`Welcome back, ${data.data.user.name.split(' ')[0]}! 👋`);
      } else {recordFailedLogin();}
    } catch {
      // Demo fallback
      if(email==='user@blazekitchen.com'&&password==='User@123'){
        state.user={name:'Demo User',email,role:'user',token:'demo-jwt-token'};
        state.failedLogins=0;saveState();updateAuthUI();closeAuthModal();
        document.getElementById('loginForm').reset();
        toast(`Welcome, Demo User! 👋`,'success');
      } else if(email==='admin@blazekitchen.com'&&password==='Admin@123'){
        state.user={name:'Admin',email,role:'admin',token:'demo-admin-jwt-token'};
        state.failedLogins=0;saveState();updateAuthUI();closeAuthModal();
        document.getElementById('loginForm').reset();
        toast(`Welcome, Admin! 🔑`,'success');
      } else recordFailedLogin();
    } finally {
      btn.disabled=false;btn.innerHTML='<span>Login</span><i class="fas fa-arrow-right"></i>';
    }
  });

  // OTP verify
  document.getElementById('verifyOtpBtn')?.addEventListener('click',()=>{
    const inputs=document.querySelectorAll('.otp-input');
    const entered=[...inputs].map(i=>i.value).join('');
    if(entered===state.pendingOtp){
      toast('Email verified! Please complete registration.','success');
      document.getElementById('otpSection').style.display='none';
      document.getElementById('registerForm').style.display='flex';
    } else toast('Invalid OTP. Please try again','error');
  });

  // Register form (send OTP)
  document.getElementById('sendOtpBtn')?.addEventListener('click',async ()=>{
    const email=document.getElementById('regEmail')?.value.trim();
    if(!email){toast('Enter your email','error');return;}
    state.pendingOtp=generateOTP();state.otpEmail=email;
    toast(`OTP sent to ${email} (Demo: ${state.pendingOtp})`,'info');
    document.getElementById('registerPreOtp').style.display='none';
    document.getElementById('otpSection').style.display='block';
  });

  // Register final
  document.getElementById('registerForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const name=document.getElementById('regName').value.trim();
    const email=document.getElementById('regEmail').value.trim();
    const password=document.getElementById('regPassword').value;
    const btn=document.getElementById('registerSubmit');
    if(!name){toast('Enter your full name','error');return;}
    if(!email){toast('Enter your email','error');return;}
    if(password.length<6){toast('Password must be 6+ characters','error');return;}
    btn.disabled=true;btn.innerHTML='<span>Creating…</span>';
    try {
      const res=await fetch(`${API_BASE}/auth/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password,role:state.userRole})});
      if(!res.ok){
        const data=await res.json();
        toast(data.message||`Registration failed: ${res.statusText}`,'error');
        return;
      }
      const data=await res.json();
      if(data.success){
        state.user={...data.data.user,token:data.token};
        saveState();updateAuthUI();closeAuthModal();
        toast(`Welcome to Blaze Kitchen, ${name.split(' ')[0]}! 🔥`,'success');
      } else toast(data.message||'Registration failed','error');
    } catch (err) {
      console.error('Registration error:', err);
      toast('Failed to connect to server. Make sure backend is running on http://localhost:5000','error');
    } finally {btn.disabled=false;btn.innerHTML='<span>Create Account</span><i class="fas fa-arrow-right"></i>';}
  });

  // Item modal
  document.getElementById('closeItem')?.addEventListener('click',closeItemModal);
  document.getElementById('itemOverlay')?.addEventListener('click',closeItemModal);
  document.getElementById('itemQtyMinus')?.addEventListener('click',()=>{
    if(state.itemQty>1){state.itemQty--;document.getElementById('itemQtyVal').textContent=state.itemQty;}
  });
  document.getElementById('itemQtyPlus')?.addEventListener('click',()=>{
    state.itemQty++;document.getElementById('itemQtyVal').textContent=state.itemQty;
  });
  document.getElementById('itemModalAdd')?.addEventListener('click',()=>{
    if(!state.itemModal)return;
    addToCart(state.itemModal,state.itemQty);
    const btn=document.getElementById('itemModalAdd');
    btn.innerHTML='<i class="fas fa-check"></i> Added!';btn.style.background='#2D7D46';
    setTimeout(()=>{btn.innerHTML='<i class="fas fa-bag-shopping"></i> Add to Cart';btn.style.background='';closeItemModal();},1200);
  });
  document.getElementById('itemModalWishlist')?.addEventListener('click',()=>{
    if(state.itemModal)toggleWishlist(state.itemModal);
  });

  // Write review (modal)
  let selectedReviewRating=5;
  document.querySelectorAll('.star-input span').forEach((star,i)=>{
    star.addEventListener('click',()=>{
      selectedReviewRating=i+1;
      document.querySelectorAll('.star-input span').forEach((s,j)=>s.classList.toggle('active',j<=i));
    });
  });
  document.getElementById('submitReviewBtn')?.addEventListener('click',()=>{
    const text=document.getElementById('reviewText')?.value.trim();
    if(!text||!state.itemModal){toast('Please write a review','error');return;}
    if(!state.reviews[state.itemModal.name])state.reviews[state.itemModal.name]=[...MOCK_REVIEWS.default];
    state.reviews[state.itemModal.name].unshift({name:state.user?.name||'Guest',rating:selectedReviewRating,text,date:'Just now'});
    renderModalReviews(state.itemModal);document.getElementById('reviewText').value='';
    toast('Review submitted!','success');
  });

  // Payment modal
  document.getElementById('closePayment')?.addEventListener('click',closePaymentModal);
  document.getElementById('paymentOverlay')?.addEventListener('click',closePaymentModal);
  document.querySelectorAll('.payment-method').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.payment-method').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.getElementById('applyCoupon')?.addEventListener('click',()=>{
    const code=document.getElementById('couponCode').value.trim().toUpperCase();
    if(COUPONS[code]){
      localStorage.setItem('blaze_discount',COUPONS[code]);
      openPaymentModal();toast(`🎉 Coupon applied! ₹${COUPONS[code]} off`,'success');
    } else toast('Invalid coupon code','error');
  });
  document.getElementById('confirmPayment')?.addEventListener('click',()=>{
    const orderId='BLZ'+Math.random().toString(36).substr(2,7).toUpperCase();
    closePaymentModal();
    state.cart=[];localStorage.removeItem('blaze_discount');saveState();updateCartUI();closeCart();
    showOrderSuccess(orderId);
    toast(`🔥 Order #${orderId} placed!`,'success');
  });
  document.getElementById('closeTracking')?.addEventListener('click',closeTrackingModal);
  document.getElementById('trackingOverlay')?.addEventListener('click',closeTrackingModal);
  document.getElementById('successTrackBtn')?.addEventListener('click',()=>{
    document.getElementById('orderSuccess').classList.remove('show');
  });

  // Filters
  document.querySelectorAll('.filter-pill').forEach(pill=>{
    pill.addEventListener('click',()=>{
      document.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('active'));
      pill.classList.add('active');state.filter=pill.dataset.category;applyFilters();
    });
  });
  // Advanced filter chips
  document.querySelectorAll('.adv-filter-chip').forEach(chip=>{
    chip.addEventListener('click',()=>{chip.classList.toggle('active');applyFilters();});
  });
  // Calorie slider
  const calFilter=document.getElementById('calFilter');
  const calVal=document.getElementById('calVal');
  calFilter?.addEventListener('input',()=>{calVal.textContent=calFilter.value+' kcal';applyFilters();});

  // Search
  const searchInput=document.getElementById('searchInput');
  const clearBtn=document.getElementById('searchClear');
  searchInput?.addEventListener('input',()=>{
    state.search=searchInput.value.trim().toLowerCase();
    if(clearBtn)clearBtn.style.display=state.search?'flex':'none';applyFilters();
  });
  clearBtn?.addEventListener('click',()=>{if(searchInput)searchInput.value='';state.search='';clearBtn.style.display='none';applyFilters();});

  // Sort
  document.getElementById('sortSelect')?.addEventListener('change',e=>{state.sort=e.target.value;applyFilters();});

  // Load more
  document.getElementById('loadMoreBtn')?.addEventListener('click',()=>renderMenu(false));

  // ESC key
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeItemModal();closeAuthModal();closePaymentModal();closeTrackingModal();closeCart();closeWishlist();}
  });
}

function setupCheckoutSlideAction() {
  const slide = document.getElementById('checkoutSlide');
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
    label.textContent = 'Slide to Checkout';
    paint();
  };

  const tryCheckout = () => {
    if (!state.user) {
      closeCart();
      window.location.href = 'login.html?redirect=checkout.html';
      return true;
    }
    if (!state.cart.length) {
      toast('Your cart is empty', 'error');
      return false;
    }
    saveState();
    window.location.href = 'checkout.html';
    return true;
  };

  const complete = () => {
    offset = maxOffset;
    slide.classList.add('confirmed');
    label.textContent = 'Confirmed';
    paint();

    const ok = tryCheckout();
    if (!ok) setTimeout(reset, 280);
  };

  const onDown = e => {
    calcBounds();
    dragging = true;
    startX = e.clientX;
    startOffset = offset;
    slide.classList.add('dragging');
    thumb.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onMove = e => {
    if (!dragging) return;
    offset = clamp(startOffset + (e.clientX - startX), 0, maxOffset);
    paint();
  };
  const onUp = () => {
    if (!dragging) return;
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

/* ── STATE PERSISTENCE ── */
function loadState(){
  try {
    const user=localStorage.getItem('blaze_user');
    const cart=localStorage.getItem('blaze_cart');
    const wishlist=localStorage.getItem('blaze_wishlist');
    const rv=localStorage.getItem('blaze_rv');
    if(user)state.user=JSON.parse(user);
    const addrKeys=getAddressStorageKeys(state.user);
    const addresses=localStorage.getItem(addrKeys.addresses);
    const selAddr=localStorage.getItem(addrKeys.selected);
    if(cart)state.cart=JSON.parse(cart);
    state.cart=(Array.isArray(state.cart)?state.cart:[]).map((item)=>({
      id:item.id||item._id||Date.now()+Math.floor(Math.random()*1000),
      name:String(item.name||'').trim(),
      price:Number(item.price)||0,
      category:item.category||'',
      image:item.image||DEFAULT_IMG,
      quantity:Math.max(1,Number(item.quantity)||1),
      source:item.source==='mood'?'mood':'blaze'
    })).filter(item=>item.name);
    if(wishlist)state.wishlist=JSON.parse(wishlist);
    if(rv)state.recentlyViewed=JSON.parse(rv);
    if(addresses)state.addresses=JSON.parse(addresses);
    if(selAddr)state.selectedAddress=parseInt(selAddr);
  } catch {}
  updateAuthUI();updateCartUI();updateWishlistUI();
}
function saveState(){
  const addrKeys=getAddressStorageKeys(state.user);
  if(state.user)localStorage.setItem('blaze_user',JSON.stringify(state.user));
  else localStorage.removeItem('blaze_user');
  localStorage.setItem('blaze_cart',JSON.stringify(state.cart));
  localStorage.setItem('blaze_wishlist',JSON.stringify(state.wishlist));
  localStorage.setItem('blaze_rv',JSON.stringify(state.recentlyViewed));
  localStorage.setItem(addrKeys.addresses,JSON.stringify(state.addresses));
  localStorage.setItem(addrKeys.selected,state.selectedAddress);
}

function getAddressStorageKeys(user){
  const rawId=user?(user._id||user.id||user.email||'guest'):'guest';
  const scope=String(rawId).replace(/[^a-zA-Z0-9@._-]/g,'_');
  return {
    addresses:`blaze_addresses_${scope}`,
    selected:`blaze_selected_address_${scope}`,
  };
}

/* ── TOAST ── */
function toast(message,type='default'){
  const container=document.getElementById('toastContainer');
  const icons={success:'✅',error:'❌',info:'ℹ️',default:'🔥'};
  const el=document.createElement('div');
  el.className=`toast ${type}`;
  el.innerHTML=`<span class="toast-icon">${icons[type]||icons.default}</span><span class="toast-text">${message}</span>`;
  container.appendChild(el);
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),300);},3200);
}

/* ── CATEGORY CAROUSEL NAVIGATION ── */
function setupCategoryCarousel(){
  const carousel = document.getElementById('categoryCarousel');
  if (!carousel) return;

  // Populate categories dynamically
  renderCategoryTabs();

  // Touch drag-scroll support
  let isDown = false, startX, scrollLeft;
  carousel.addEventListener('mousedown', e => { isDown = true; startX = e.pageX - carousel.offsetLeft; scrollLeft = carousel.scrollLeft; });
  carousel.addEventListener('mouseleave', () => { isDown = false; });
  carousel.addEventListener('mouseup',    () => { isDown = false; });
  carousel.addEventListener('mousemove',  e => {
    if (!isDown) return; e.preventDefault();
    const x = e.pageX - carousel.offsetLeft;
    carousel.scrollLeft = scrollLeft - (x - startX);
  });
}

/* ── RENDER CATEGORY TABS (FROM REAL DATA) ── */
/* Category icons & images mapping */
const CATEGORY_META = {
  'Coffee & Brews':        { icon: '☕', img: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&q=80',        color: '#F5E6D3', textColor: '#1a0800' },
  'Just Matcha & Hojicha': { icon: '🍵', img: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&q=80',        color: '#C8F0D8', textColor: '#0d2b1a' },
  'Beverages':             { icon: '🥤', img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',            color: '#B8D8F8', textColor: '#0a1a2b' },
  'Breakfast Plates':      { icon: '🍳', img: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80',        color: '#FFF0C8', textColor: '#2b1a00' },
  'Pancakes & Waffles':    { icon: '🥞', img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',        color: '#FFD8D8', textColor: '#2b0a0a' },
  'Mains':                 { icon: '🍝', img: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&q=80',        color: '#FFD8B0', textColor: '#2b1000' },
  'Salads & Soups':        { icon: '🥗', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',        color: '#C8F0C8', textColor: '#0a2b0a' },
  'Burgers & Sandwiches':  { icon: '🍔', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',        color: '#FFE8B0', textColor: '#2b1a00' },
};

function renderCategoryTabs() {
  renderCategoryCards();
}

function renderCategoryCards() {
  const carousel = document.getElementById('categoryCarousel');
  if (!carousel) return;
  carousel.innerHTML = '';

  if (!MENU_DATA || !MENU_DATA.length) return;

  MENU_DATA.forEach(cat => {
    const meta       = CATEGORY_META[cat.category] || {};
    const img        = cat.image || meta.img || DEFAULT_IMG;
    const totalItems = cat.items?.length || 0;

    const btn = document.createElement('div');
    btn.className = 'category-item';
    btn.dataset.category = cat.category;
    btn.innerHTML = `
      <div class="cat-img-wrap">
        <img src="${img}" alt="${cat.category}" loading="lazy" onerror="this.src='${DEFAULT_IMG}'">
      </div>
      <div class="cat-label">${cat.category}</div>
      <span class="cat-arrow"><i class="fas fa-arrow-right"></i></span>`;

    // Ripple on click
    btn.addEventListener('click', e => {
      const r   = btn.getBoundingClientRect();
      const rip = document.createElement('span');
      rip.className = 'ripple';
      const size = Math.max(r.width, r.height);
      rip.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-r.left-size/2}px;top:${e.clientY-r.top-size/2}px`;
      btn.appendChild(rip);
      rip.addEventListener('animationend', () => rip.remove());
      setTimeout(() => { window.location.href = `category.html?cat=${encodeURIComponent(cat.category)}`; }, 200);
    });
    carousel.appendChild(btn);
  });
}

/* ── FILTER BY CATEGORY ── */
function filterByCategory(categoryKey) {
  state.activeCategory = categoryKey;
  state.filter = categoryKey === 'all' ? 'all' : categoryKey;
  applyFilters();
  // Smooth scroll to menu grid
  const menuSection = document.querySelector('.menu-section');
  if (menuSection) menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}



// Global expose
window.quickAdd=(n,p,c,i)=>addToCart({name:n,price:p,category:c,image:i});
window.addToCartByName=addToCartByName;
window.removeFromCart=removeFromCart;
window.updateQty=updateQty;
window.openWishlist=openWishlist;
window.closeWishlist=closeWishlist;
window.clearWishlist=clearWishlist;
window.removeFromWishlistByName=removeFromWishlistByName;
window.closeMobileMenu=closeMobileMenu;
window.selectAddress=selectAddress;
window.openItemModalByName=openItemModalByName;
window.filterByCategory=filterByCategory;
window.renderTrending=renderTrending;
window.closeAccountDropdown=closeAccountDropdown;

/* ════════════════════════════════════════════════════════════════
   DAILY SPECIALS — Rotates every day, countdown to next refresh
   ════════════════════════════════════════════════════════════════ */
(function initDailySpecials() {
  const allSpecials = [
    { name:'Spicy Ghost Burger', desc:'Ghost pepper sauce, fiery jalapeños, pepper jack cheese', price:279, cat:'burgers', tag:'🔥 HOT', img:'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&q=80', popularity:92, orders:1280 },
    { name:'Molten Lava Cake', desc:'Warm chocolate cake, flowing molten center, vanilla ice cream', price:199, cat:'desserts', tag:'⭐ BESTSELLER', img:'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80', popularity:88, orders:1140 },
    { name:'Signature Cold Brew', desc:'Single origin beans, cold brewed 24 hours. Black or oat milk.', price:149, cat:'coffee', tag:'☕ NEW', img:'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80', popularity:78, orders:980 },
    { name:'BBQ Blaze Wings', desc:'Smoky BBQ glazed wings, blue cheese dip, celery sticks', price:249, cat:'starters', tag:'🔥 TRENDING', img:'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=800&q=80', popularity:95, orders:1450 },
    { name:'Truffle Mushroom Pizza', desc:'Wild mushrooms, truffle oil, mozzarella, fresh arugula', price:349, cat:'pizza', tag:'👨‍🍳 CHEF PICK', img:'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', popularity:85, orders:1100 },
    { name:'Mango Tango Shake', desc:'Fresh Alphonso mango, vanilla ice cream, whipped cream', price:179, cat:'beverages', tag:'🥭 SEASONAL', img:'https://images.unsplash.com/photo-1546173159-315724a31696?w=800&q=80', popularity:82, orders:960 },
    { name:'Double Smash Burger', desc:'Two smashed patties, American cheese, pickles, secret sauce', price:299, cat:'burgers', tag:'🔥 HOT', img:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', popularity:97, orders:1650 },
    { name:'Tiramisu Cup', desc:'Classic Italian layers of espresso-soaked ladyfingers, mascarpone', price:219, cat:'desserts', tag:'⭐ PREMIUM', img:'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=80', popularity:80, orders:870 },
    { name:'Loaded Nachos', desc:'Crispy tortilla chips, jalapeños, cheese sauce, guacamole', price:189, cat:'starters', tag:'🎉 PARTY FAV', img:'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=800&q=80', popularity:87, orders:1050 },
    { name:'Matcha Latte', desc:'Ceremonial grade matcha, oat milk, light honey sweetness', price:169, cat:'coffee', tag:'🍵 WELLNESS', img:'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=800&q=80', popularity:76, orders:820 },
    { name:'Peri Peri Chicken Wrap', desc:'Grilled chicken, peri peri sauce, coleslaw, garlic mayo', price:229, cat:'wraps', tag:'🌶️ SPICY', img:'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80', popularity:89, orders:1200 },
    { name:'Chocolate Brownie Sundae', desc:'Warm fudgy brownie, vanilla ice cream, hot chocolate sauce', price:199, cat:'desserts', tag:'🍫 INDULGENT', img:'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=800&q=80', popularity:91, orders:1300 },
  ];

  // Day-based rotation: pick 3 specials based on day of year
  function getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now - start) / 86400000);
  }

  function getTodaysSpecials() {
    const day = getDayOfYear();
    const shuffled = [...allSpecials];
    // Seed-based shuffle using day
    let seed = day;
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 16807 + 0) % 2147483647;
      const j = seed % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 3);
  }

  function renderSpecials() {
    const grid = document.getElementById('specialsGrid');
    if (!grid) return;
    const items = getTodaysSpecials();
    grid.innerHTML = items.map((item, i) => `
      <div class="special-card" data-tilt>
        <div class="special-card-bg" style="background-image:url('${item.img}')"></div>
        <div class="special-card-content">
          <span class="special-tag">${item.tag}</span>
          <h3>${item.name}</h3>
          <p>${item.desc}</p>
          <div class="popularity-meter">
            <div class="popularity-bar"><div class="popularity-fill" data-width="${item.popularity}"></div></div>
            <span class="popularity-text">${item.popularity}% loved</span>
          </div>
          <div class="special-price">₹${item.price}</div>
          <button class="btn-special" onclick="blazeQuickAdd(this,'${item.name.replace(/'/g,"\\'")}',${item.price},'${item.cat}','${item.img}')">Add to Cart</button>
        </div>
      </div>
    `).join('');

    // Animate cards in
    setTimeout(() => {
      grid.querySelectorAll('.special-card').forEach((card, i) => {
        setTimeout(() => {
          card.classList.add('visible');
          // Animate popularity bars
          const fill = card.querySelector('.popularity-fill');
          if (fill) setTimeout(() => fill.style.width = fill.dataset.width + '%', 300);
        }, i * 200);
      });
    }, 200);

    // 3D tilt effect on special cards
    grid.querySelectorAll('.special-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(800px) rotateY(${x*8}deg) rotateX(${-y*8}deg) translateY(-8px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  // Date display
  const dateEl = document.getElementById('specialsDate');
  if (dateEl) {
    const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('en-IN', opts);
  }

  // Countdown to midnight
  function updateSpecialsTimer() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = Math.floor((midnight - now) / 1000);
    const h = String(Math.floor(diff / 3600)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
    const s = String(diff % 60).padStart(2, '0');
    const el = document.getElementById('specialsTimer');
    if (el) el.textContent = `${h}:${m}:${s}`;
  }
  setInterval(updateSpecialsTimer, 1000);
  updateSpecialsTimer();

  renderSpecials();
})();

// Quick add with button animation
window.blazeQuickAdd = function(btn, name, price, cat, img) {
  // Ripple
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'btn-ripple-fx';
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = '50%'; ripple.style.top = '50%';
  ripple.style.marginLeft = -size/2 + 'px';
  ripple.style.marginTop = -size/2 + 'px';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 500);

  // Add to cart
  if (typeof quickAdd === 'function') quickAdd(name, price, cat, img);

  // Button state
  const origText = btn.textContent;
  btn.textContent = '✓ Added!';
  btn.classList.add('added');
  setTimeout(() => { btn.textContent = origText; btn.classList.remove('added'); }, 1500);
};

/* ════════════════════════════════════════════════════════════════
   ORDER ANALYTICS — Charts & Live Stats
   ════════════════════════════════════════════════════════════════ */
(function initAnalytics() {
  if (typeof Chart === 'undefined') return;

  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today = new Date().getDay();

  // Generate realistic-looking data seeded by current date
  function seed() { return new Date().getDate(); }
  function seededRandom(s, i) { return ((s * 9301 + 49297 + i * 233) % 233280) / 233280; }

  // Weekly orders data
  const weeklyData = dayNames.map((_, i) => {
    const base = [180, 220, 195, 280, 340, 420, 380]; // typical pattern
    const variation = Math.floor(seededRandom(seed(), i) * 60 - 30);
    return i <= today ? base[i] + variation : 0;
  });
  const todayOrders = weeklyData[today] || 0;

  // Category data
  const categories = ['Burgers', 'Desserts', 'Coffee', 'Starters', 'Wraps', 'Pizza', 'Beverages'];
  const categoryData = categories.map((_, i) => Math.floor(seededRandom(seed(), i + 10) * 200 + 50));

  // Hourly data
  const hours = ['8AM','9AM','10AM','11AM','12PM','1PM','2PM','3PM','4PM','5PM','6PM','7PM','8PM','9PM','10PM'];
  const hourlyData = hours.map((_, i) => {
    const pattern = [12, 18, 25, 35, 58, 65, 48, 30, 28, 35, 52, 68, 72, 55, 30];
    return pattern[i] + Math.floor(seededRandom(seed(), i + 20) * 15);
  });

  // Stat cards
  const statToday = document.getElementById('statTodayOrders');
  const statTop = document.getElementById('statTopItem');
  const statAvg = document.getElementById('statAvgOrders');
  const statPeak = document.getElementById('statPeakHour');

  if (statToday) animateNumber(statToday, todayOrders);
  if (statTop) statTop.textContent = 'Smash Burger';
  if (statAvg) animateNumber(statAvg, Math.round(weeklyData.reduce((a,b)=>a+b,0) / Math.max(today+1,1)));
  if (statPeak) {
    const peakIdx = hourlyData.indexOf(Math.max(...hourlyData));
    statPeak.textContent = hours[peakIdx] || '1PM';
  }

  function animateNumber(el, target) {
    let current = 0;
    const step = Math.ceil(target / 40);
    const interval = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(interval); }
      el.textContent = current.toLocaleString();
    }, 30);
  }

  const ctx = document.getElementById('orderChart');
  if (!ctx) return;

  let chart;

  function getThemeColors() {
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    return {
      isLight: light,
      orange: '#FF5E00',
      orangeLight: light ? 'rgba(255,94,0,0.12)' : 'rgba(255,94,0,0.15)',
      grid: light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)',
      text: light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.5)',
      title: light ? '#1a1a1a' : '#ffffff',
      tooltipBg: light ? 'rgba(255,255,255,0.97)' : 'rgba(0,0,0,0.85)',
      tooltipTitle: light ? '#1a1a1a' : '#fff',
      tooltipBody: light ? '#444' : '#ccc',
      doughnutBorder: light ? '#f0ede6' : '#0b0b0b',
      pointBorder: light ? '#ffffff' : '#0b0b0b',
    };
  }

  function getChartOptions(title) {
    const c = getThemeColors();
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1200, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        title: { display: true, text: title, color: c.title, font: { family: "'Bebas Neue',sans-serif", size: 20, weight: '400' }, padding: { bottom: 20 } },
        tooltip: { backgroundColor: c.tooltipBg, titleColor: c.tooltipTitle, bodyColor: c.tooltipBody, titleFont: { family: "'DM Sans',sans-serif" }, bodyFont: { family: "'Space Mono',monospace" }, borderColor: 'rgba(255,94,0,0.3)', borderWidth: 1, padding: 12, cornerRadius: 8 }
      },
      scales: {
        x: { grid: { color: c.grid }, ticks: { color: c.text, font: { family: "'DM Sans',sans-serif", size: 11 } } },
        y: { grid: { color: c.grid }, ticks: { color: c.text, font: { family: "'Space Mono',monospace", size: 11 } }, beginAtZero: true }
      }
    };
  }

  function buildChartConfig(type) {
    const c = getThemeColors();
    if (type === 'weekly') {
      return {
        type: 'bar',
        data: {
          labels: dayNames,
          datasets: [{
            label: 'Orders',
            data: weeklyData,
            backgroundColor: dayNames.map((_, i) => i === today ? c.orange : c.orangeLight),
            borderColor: dayNames.map((_, i) => i === today ? c.orange : 'rgba(255,94,0,0.3)'),
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false,
          }]
        },
        options: getChartOptions('Daily Orders This Week')
      };
    }
    if (type === 'categories') {
      return {
        type: 'doughnut',
        data: {
          labels: categories,
          datasets: [{
            data: categoryData,
            backgroundColor: ['#FF5E00','#FF8C40','#FFB347','#FFD700','#E04500','#CD7F32','#FF6B35'],
            borderColor: c.doughnutBorder,
            borderWidth: 2,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: c.text, font: { family: "'DM Sans',sans-serif", size: 12 }, padding: 16, usePointStyle: true, pointStyleWidth: 10 }
            },
            title: { display: true, text: 'Orders by Category', color: c.title, font: { family: "'Bebas Neue',sans-serif", size: 20, weight: '400' }, padding: { bottom: 20 } },
            tooltip: { backgroundColor: c.tooltipBg, titleColor: c.tooltipTitle, bodyColor: c.tooltipBody, titleFont: { family: "'DM Sans',sans-serif" }, bodyFont: { family: "'Space Mono',monospace" }, borderColor: 'rgba(255,94,0,0.3)', borderWidth: 1 }
          }
        }
      };
    }
    // hourly
    return {
      type: 'line',
      data: {
        labels: hours,
        datasets: [{
          label: 'Orders per Hour',
          data: hourlyData,
          borderColor: c.orange,
          backgroundColor: (context) => {
            const ct = context.chart.ctx;
            const gradient = ct.createLinearGradient(0, 0, 0, 350);
            gradient.addColorStop(0, 'rgba(255,94,0,0.3)');
            gradient.addColorStop(1, 'rgba(255,94,0,0)');
            return gradient;
          },
          tension: 0.4,
          fill: true,
          pointBackgroundColor: c.orange,
          pointBorderColor: c.pointBorder,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 8,
        }]
      },
      options: getChartOptions('Orders by Hour (Today)')
    };
  }

  function renderChart(type) {
    if (chart) chart.destroy();
    const config = buildChartConfig(type);
    const canvasEl = document.getElementById('orderChart');
    canvasEl.parentElement.style.height = '380px';
    chart = new Chart(canvasEl.getContext('2d'), {
      type: config.type,
      data: config.data,
      options: config.options
    });
  }

  // Track active chart type
  let activeChartType = 'weekly';

  // Tab switching
  document.querySelectorAll('.analytics-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.analytics-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeChartType = tab.dataset.chart;
      renderChart(activeChartType);
    });
  });

  // Intersection observer — render chart when visible
  const analyticsSection = document.getElementById('analyticsSection');
  if (analyticsSection) {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        renderChart(activeChartType);
        obs.unobserve(analyticsSection);
      }
    }, { threshold: 0.2 });
    obs.observe(analyticsSection);
  }

  // Re-render chart when theme changes so colors update immediately
  new MutationObserver(() => {
    if (chart) renderChart(activeChartType);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // Simulate live order count incrementing
  setInterval(() => {
    if (statToday && Math.random() > 0.6) {
      const current = parseInt(statToday.textContent.replace(/,/g, '')) || 0;
      statToday.textContent = (current + 1).toLocaleString();
      statToday.style.transform = 'scale(1.15)';
      statToday.style.color = '#FF5E00';
      setTimeout(() => { statToday.style.transform = ''; statToday.style.color = ''; }, 300);
    }
  }, 5000);
})();

console.log('🔥 Blaze Kitchen v2.0 — Startup Grade');