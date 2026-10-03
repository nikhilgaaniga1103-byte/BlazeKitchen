/* ============================================================
   BLAZE KITCHEN — scroll-anim.js
   Universal scroll-triggered entrance animations.
   Self-contained: injects its own CSS, wires IntersectionObserver
   + MutationObserver for dynamic content.
   Works on every page — no dependencies.
   ============================================================ */
(function () {
  'use strict';

  /* ── 1. Inject CSS ── */
  const style = document.createElement('style');
  style.textContent = `
    /* ── Base hidden state ── */
    .sa {
      opacity: 0;
      will-change: opacity, transform;
      transition:
        opacity  0.65s cubic-bezier(0.22, 1, 0.36, 1),
        transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
    }

    /* ── Direction variants ── */
    .sa-up    { transform: translateY(40px); }
    .sa-down  { transform: translateY(-30px); }
    .sa-left  { transform: translateX(-44px); }
    .sa-right { transform: translateX(44px); }
    .sa-scale { transform: scale(0.87) translateY(16px); }
    .sa-zoom  { transform: scale(0.82); }

    /* ── Visible (animated-in) state ── */
    .sa.sa-visible {
      opacity: 1;
      transform: none;
    }

    /* ── Stagger delay helpers ── */
    .sa-d1  { transition-delay: 0.07s; }
    .sa-d2  { transition-delay: 0.14s; }
    .sa-d3  { transition-delay: 0.21s; }
    .sa-d4  { transition-delay: 0.28s; }
    .sa-d5  { transition-delay: 0.35s; }
    .sa-d6  { transition-delay: 0.42s; }
    .sa-d7  { transition-delay: 0.49s; }
    .sa-d8  { transition-delay: 0.56s; }

    /* ── Respect reduced-motion ── */
    @media (prefers-reduced-motion: reduce) {
      .sa { opacity: 1 !important; transform: none !important; transition: none !important; }
    }
  `;
  document.head.appendChild(style);

  /* ── 2. Selectors ─────────────────────────────────────────────
     Each entry: { selector, dir, stagger }
     stagger = true  → children get sequential sa-d1…sa-d8 delays
     dir             → 'sa-up' | 'sa-left' | 'sa-right' | 'sa-scale' | 'sa-zoom'
  ───────────────────────────────────────────────────────────── */
  const RULES = [
    /* ── index.html — section headers & standalone blocks ── */
    { sel: '.section-header',          dir: 'sa-up' },
    { sel: '.analytics-chart-wrap',    dir: 'sa-up' },
    { sel: '.analytics-tabs',          dir: 'sa-up' },
    { sel: '.coupon-banner',           dir: 'sa-scale' },
    { sel: '.map-container',           dir: 'sa-up' },
    { sel: '.testimonials-slider',     dir: 'sa-up' },
    { sel: '.about-visual',            dir: 'sa-left' },
    { sel: '.about-content',           dir: 'sa-right' },

    /* ── index.html — staggered grids ── */
    { sel: '.specials-grid',           dir: 'sa-up',    stagger: true },
    { sel: '.team-grid',               dir: 'sa-scale', stagger: true },
    { sel: '.contact-grid',            dir: 'sa-up',    stagger: true },
    { sel: '.features-grid',           dir: 'sa-up',    stagger: true },
    { sel: '.faq-section',             dir: 'sa-up',    stagger: true },
    { sel: '.about-pillars',           dir: 'sa-up',    stagger: true },
    { sel: '.timeline',                dir: 'sa-left',  stagger: true },
    { sel: '.coupon-cards',            dir: 'sa-up',    stagger: true },
    { sel: '.analytics-stats',         dir: 'sa-up',    stagger: true },

    /* ── category.html ── */
    { sel: '.category-header',         dir: 'sa-up' },
    { sel: '.category-filters',        dir: 'sa-up' },
    { sel: '.subcategory-nav',         dir: 'sa-up' },
    { sel: '#itemGrid',                dir: 'sa-up',    stagger: true },
    { sel: '.items-section',           dir: 'sa-up' },

    /* ── checkout.html ── */
    { sel: '.co-left',                 dir: 'sa-left',  stagger: true },
    { sel: '.co-right',                dir: 'sa-right', stagger: true },
    { sel: '.co-card',                 dir: 'sa-up' },

    /* ── orders.html ── */
    { sel: '.ord-tabs',                dir: 'sa-down' },
    { sel: '.ord-empty',               dir: 'sa-scale' },
    { sel: '#ordList',                 dir: 'sa-up',    stagger: true },

    /* ── footer (index.html) ── */
    { sel: '.footer-brand',            dir: 'sa-left' },
    { sel: '.footer-cols',             dir: 'sa-up',    stagger: true },
    { sel: '.footer-bottom',           dir: 'sa-up' },
  ];

  /* ── 3. Helper: already processed? ── */
  const DONE = 'data-sa';

  function mark(el) { el.setAttribute(DONE, '1'); }
  function done(el) { return el.hasAttribute(DONE); }

  /* ── 4. Apply animation classes to an element ── */
  function applyTo(el, dir, delayClass) {
    if (done(el)) return;
    mark(el);
    el.classList.add('sa', dir || 'sa-up');
    if (delayClass) el.classList.add(delayClass);
  }

  /* ── 5. Process all rules against the DOM ── */
  function prepare() {
    RULES.forEach(({ sel, dir, stagger }) => {
      const containers = document.querySelectorAll(sel);
      containers.forEach(container => {
        if (stagger) {
          /* Animate direct children with sequential delays */
          Array.from(container.children).forEach((child, i) => {
            const delay = i < 8 ? `sa-d${i + 1}` : 'sa-d8';
            applyTo(child, dir, delay);
          });
        } else {
          applyTo(container, dir);
        }
      });
    });
  }

  /* ── 6. IntersectionObserver — trigger .sa-visible ── */
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('sa-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

  function observeAll() {
    document.querySelectorAll('.sa:not(.sa-visible)').forEach(el => observer.observe(el));
  }

  /* ── 7. MutationObserver — handle dynamically added content ── */
  const mutObs = new MutationObserver(() => {
    prepare();
    observeAll();
  });

  /* ── 8. Init ── */
  function init() {
    prepare();
    observeAll();
    mutObs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
