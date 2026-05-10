import { resolvePitchDeck, saveInquiry } from '../services/quote.service.js';
import { initNav } from '../components/nav.js';
import { el, on, showError, clearError, setHTML } from '../utils/dom.js';
import { isValidEmail, escapeHTML } from '../utils/sanitize.js';

// ─────────────────────────────────────────────────────────────────────────────
// QUESTIONNAIRE DEFINITION
//
// To add/edit questions: modify this array only.
// Each step has:
//   - key:      the answer key stored in the responses object
//   - question: the text shown to the visitor
//   - options:  array of { label, value } choices
//
// Branching: add a `showIf` function (optional) that receives the current
// responses object and returns true if this step should be shown.
// ─────────────────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    key: 'service_type',
    question: 'What can we help you with?',
    options: [
      { label: 'Event Styling', value: 'events' },
      { label: 'Floral Arrangements', value: 'floral' },
      { label: 'Both', value: 'both' },
    ],
  },
  {
    key: 'occasion',
    question: 'What is the occasion?',
    options: [
      { label: 'Wedding', value: 'wedding' },
      { label: 'Birthday', value: 'birthday' },
      { label: 'Corporate Event', value: 'corporate' },
      { label: 'Other', value: 'other' },
    ],
  },
  {
    key: 'scale',
    question: 'How many guests are you expecting?',
    options: [
      { label: 'Intimate (under 30)', value: 'intimate' },
      { label: 'Medium (30–100)', value: 'medium' },
      { label: 'Large (100+)', value: 'large' },
    ],
  },
  {
    key: 'budget',
    question: 'What is your approximate budget?',
    options: [
      { label: 'Under R10,000', value: 'budget_low' },
      { label: 'R10,000 – R30,000', value: 'budget_mid' },
      { label: 'R30,000+', value: 'budget_high' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────

let currentStep = 0;
const responses = {};

// Build the list of steps that should be visible given current responses.
function getActiveSteps() {
  return QUESTIONS.filter((q) => !q.showIf || q.showIf(responses));
}

function renderProgress() {
  const steps = getActiveSteps();
  const total = steps.length + 1; // +1 for contact step
  const progress = el('#quote-progress');
  setHTML(progress, `<span>Step ${currentStep + 1} of ${total}</span>
    <div class="progress-bar">
      <div class="progress-fill" style="width:${((currentStep + 1) / total) * 100}%"></div>
    </div>`);
}

function renderCurrentStep() {
  const stepsEl = el('#quote-steps');
  const steps = getActiveSteps();

  if (currentStep >= steps.length) {
    // Show contact details step.
    stepsEl.style.display = 'none';
    el('#quote-contact-step').style.display = 'block';
    renderProgress();
    return;
  }

  const step = steps[currentStep];
  stepsEl.style.display = 'block';
  el('#quote-contact-step').style.display = 'none';

  setHTML(stepsEl, `
    <div class="quote-step">
      <h2>${escapeHTML(step.question)}</h2>
      <div class="quote-options">
        ${step.options.map((opt) => `
          <button
            class="quote-option-btn ${responses[step.key] === opt.value ? 'selected' : ''}"
            data-key="${escapeHTML(step.key)}"
            data-value="${escapeHTML(opt.value)}"
          >
            ${escapeHTML(opt.label)}
          </button>
        `).join('')}
      </div>
    </div>
  `);

  stepsEl.querySelectorAll('.quote-option-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      responses[btn.dataset.key] = btn.dataset.value;
      currentStep++;
      renderProgress();
      renderCurrentStep();
    });
  });

  renderProgress();
}

async function handleContactSubmit(e) {
  e.preventDefault();
  clearError('quote-contact-error');

  const name = el('#quote-name').value.trim();
  const email = el('#quote-email').value.trim();

  if (!name) {
    showError('quote-contact-error', 'Please enter your name.');
    return;
  }
  if (!isValidEmail(email)) {
    showError('quote-contact-error', 'Please enter a valid email address.');
    return;
  }

  const submitBtn = el('#quote-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try {
    const deck = await resolvePitchDeck(responses);

    // Save the inquiry to Supabase.
    await saveInquiry({
      visitor_name: name,
      visitor_email: email,
      responses,
      pitch_deck_url: deck?.pdf_url ?? null,
    });

    // Notify admin + send deck to visitor via Vercel API.
    await fetch('/api/send-inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitor_name: name,
        visitor_email: email,
        responses,
        pitch_deck_url: deck?.pdf_url ?? null,
        pitch_deck_name: deck?.name ?? null,
      }),
    });

    showResult(deck);
  } catch (err) {
    showError('quote-contact-error', 'Something went wrong. Please try again.');
    console.error(err);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Get My Proposal';
  }
}

function showResult(deck) {
  el('#quote-contact-step').style.display = 'none';
  el('#quote-steps').style.display = 'none';
  el('#quote-progress').style.display = 'none';

  const resultStep = el('#quote-result-step');
  resultStep.style.display = 'block';

  if (deck?.pdf_url) {
    el('#quote-result-message').textContent =
      "We've sent your proposal to your email. You can also view it below.";
    el('#quote-pdf-iframe').src = deck.pdf_url;
    el('#quote-pdf-download').href = deck.pdf_url;
    el('#quote-pdf-viewer').style.display = 'block';
  } else {
    el('#quote-no-deck-message').style.display = 'block';
  }
}

function init() {
  initNav();
  renderProgress();
  renderCurrentStep();
  on(el('#quote-contact-form'), 'submit', handleContactSubmit);
}

init();
