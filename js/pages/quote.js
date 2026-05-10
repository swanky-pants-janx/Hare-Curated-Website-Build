import { resolvePitchDeck, saveInquiry, getQuoteSettings } from '../services/quote.service.js';
import { initNav } from '../components/nav.js';
import { el, setHTML } from '../utils/dom.js';
import { isValidEmail, escapeHTML } from '../utils/sanitize.js';

// ─────────────────────────────────────────────────────────────────────────────
// Default settings used while Supabase loads or if no settings are saved.
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULTS = {
  event_types: [
    {
      value: 'personal',
      label: 'Personal',
      description: 'Birthdays, weddings, anniversaries, high teas & intimate celebrations',
      icon: '✿',
    },
    {
      value: 'corporate',
      label: 'Corporate',
      description: 'Company functions, product launches, conferences & year-end events',
      icon: '◈',
    },
  ],
  guests:  { min: 10,   max: 500,    step: 5,    default: 50    },
  budget:  { min: 5000, max: 200000, step: 1000, default: 30000, prefix: 'R' },
};

// ─────────────────────────────────────────────────────────────────────────────

const answers = { event_type: null, guests: null, budget: null };
let settings  = DEFAULTS;
let step      = 1;
const TOTAL   = 4;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n) {
  return n.toLocaleString('en-ZA').replace(/,/g, ' ');
}

function updateProgress() {
  const pct = Math.round((step / TOTAL) * 100);
  el('#qw-progress-bar').style.width = pct + '%';
  el('#qw-step-label').textContent = `Step ${step} of ${TOTAL}`;
  el('#qw-back-btn').style.display = step > 1 ? '' : 'none';
}

function showStep(n) {
  [1, 2, 3, 4, 'result'].forEach((id) => {
    const s = el(`#qw-step-${id}`);
    if (s) s.style.display = 'none';
  });
  const target = el(`#qw-step-${n}`);
  if (target) {
    target.style.display = 'block';
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  el('#qw-progress').style.display = n === 'result' ? 'none' : '';
  el('#qw-step-label').style.display = n === 'result' ? 'none' : '';
  el('#qw-back-btn').style.display = (n > 1 && n !== 'result') ? '' : 'none';
  if (n !== 'result') {
    step = n;
    updateProgress();
  }
}

// ── Step 1 — Event type ───────────────────────────────────────────────────────

function renderEventCards() {
  const container = el('#qw-event-cards');
  if (!settings.event_types?.length) {
    container.innerHTML = '<p class="qw-error">No event types configured.</p>';
    return;
  }
  setHTML(container, settings.event_types.map((et) => `
    <button class="qw-event-card ${answers.event_type === et.value ? 'selected' : ''}"
      data-value="${escapeHTML(et.value)}">
      <span class="qw-event-icon">${escapeHTML(et.icon ?? '✦')}</span>
      <strong class="qw-event-label">${escapeHTML(et.label)}</strong>
      ${et.description ? `<p class="qw-event-desc">${escapeHTML(et.description)}</p>` : ''}
    </button>
  `).join(''));

  container.querySelectorAll('.qw-event-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      answers.event_type = btn.dataset.value;
      container.querySelectorAll('.qw-event-card').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      setTimeout(() => { step = 1; showStep(2); }, 220);
    });
  });
}

// ── Step 2 — Guests ───────────────────────────────────────────────────────────

function initGuestsSlider() {
  const g = settings.guests;
  const slider  = el('#qw-guests-slider');
  const display = el('#qw-guests-value');

  slider.min   = g.min;
  slider.max   = g.max;
  slider.step  = g.step;
  slider.value = answers.guests ?? g.default;
  display.textContent = formatNumber(Number(slider.value));

  // Tick marks
  const ticks = el('#qw-guests-ticks');
  const steps = 5;
  ticks.innerHTML = Array.from({ length: steps + 1 }, (_, i) => {
    const v = g.min + Math.round(((g.max - g.min) / steps) * i);
    return `<span>${formatNumber(v)}</span>`;
  }).join('');

  slider.addEventListener('input', () => {
    display.textContent = formatNumber(Number(slider.value));
    updateSliderTrack(slider);
  });
  updateSliderTrack(slider);

  el('#qw-guests-next').addEventListener('click', () => {
    answers.guests = Number(slider.value);
    step = 2;
    showStep(3);
  });
}

// ── Step 3 — Budget ───────────────────────────────────────────────────────────

function initBudgetSlider() {
  const b = settings.budget;
  const slider  = el('#qw-budget-slider');
  const display = el('#qw-budget-value');
  const prefix  = el('#qw-budget-prefix');

  slider.min   = b.min;
  slider.max   = b.max;
  slider.step  = b.step;
  slider.value = answers.budget ?? b.default;
  display.textContent = formatNumber(Number(slider.value));
  if (prefix) prefix.textContent = b.prefix ?? 'R';

  // Labels
  el('#qw-budget-labels').innerHTML =
    `<span>${b.prefix ?? 'R'}${formatNumber(b.min)}</span>
     <span>${b.prefix ?? 'R'}${formatNumber(b.max)}+</span>`;

  // Tick marks
  const ticks = el('#qw-budget-ticks');
  const steps = 4;
  ticks.innerHTML = Array.from({ length: steps + 1 }, (_, i) => {
    const v = b.min + Math.round(((b.max - b.min) / steps) * i);
    return `<span>${b.prefix ?? 'R'}${formatNumber(v)}</span>`;
  }).join('');

  slider.addEventListener('input', () => {
    display.textContent = formatNumber(Number(slider.value));
    updateSliderTrack(slider);
  });
  updateSliderTrack(slider);

  el('#qw-budget-next').addEventListener('click', () => {
    answers.budget = Number(slider.value);
    step = 3;
    showStep(4);
  });
}

function updateSliderTrack(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.setProperty('--fill', `${pct}%`);
}

// ── Step 4 — Contact ─────────────────────────────────────────────────────────

function initContactForm() {
  el('#qw-contact-form').addEventListener('submit', handleSubmit);
}

async function handleSubmit(e) {
  e.preventDefault();
  const errEl  = el('#qw-form-error');
  const btn    = el('#qw-submit-btn');
  errEl.textContent = '';

  const name  = el('#qw-name').value.trim();
  const email = el('#qw-email').value.trim();

  if (!isValidEmail(email)) {
    errEl.textContent = 'Please enter a valid email address.';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Sending…';

  try {
    const deck = await resolvePitchDeck(answers);

    await saveInquiry({
      visitor_name:  name || null,
      visitor_email: email,
      responses:     answers,
      pitch_deck_url: deck?.pdf_url ?? null,
    });

    await fetch('/api/send-inquiry', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitor_name:     name,
        visitor_email:    email,
        responses:        answers,
        pitch_deck_url:   deck?.pdf_url ?? null,
        pitch_deck_name:  deck?.name    ?? null,
      }),
    });

    showResult(deck);
  } catch (err) {
    errEl.textContent = 'Something went wrong. Please try again.';
    console.error(err);
    btn.disabled    = false;
    btn.textContent = 'Download My Pitch Deck';
  }
}

// ── Result ────────────────────────────────────────────────────────────────────

function showResult(deck) {
  el('#qw-step-label').style.display = 'none';
  el('#qw-progress').style.display   = 'none';
  el('#qw-back-btn').style.display   = 'none';

  if (deck?.pdf_url) {
    el('#qw-result-heading').textContent   = 'Your Proposal is Ready';
    el('#qw-result-message').textContent   =
      "We've emailed your tailored proposal. You can also download it directly below.";
    setHTML(el('#qw-result-actions'), `
      <a href="${escapeHTML(deck.pdf_url)}" download target="_blank" rel="noopener"
         class="btn btn-gold">Download Pitch Deck</a>
    `);
  } else {
    el('#qw-result-heading').textContent  = 'Thank You!';
    el('#qw-result-message').textContent  =
      "We've received your enquiry and will be in touch shortly with a tailored proposal.";
    setHTML(el('#qw-result-actions'), '');
  }

  showStep('result');
}

// ── Back navigation ───────────────────────────────────────────────────────────

function initBackBtn() {
  el('#qw-back-btn').addEventListener('click', () => {
    if (step > 1) showStep(step - 1);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  initNav();
  updateProgress();

  // Load settings from Supabase; fall back to defaults on error.
  try {
    const saved = await getQuoteSettings();
    if (saved) settings = { ...DEFAULTS, ...saved };
  } catch (_) {}

  renderEventCards();
  initGuestsSlider();
  initBudgetSlider();
  initContactForm();
  initBackBtn();
}

init();
