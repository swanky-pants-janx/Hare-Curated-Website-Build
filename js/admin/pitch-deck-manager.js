import { supabase } from '../lib/supabase-client.js';
import { uploadPDF } from '../services/storage.service.js';
import { getPitchDecks, getQuoteSettings, upsertQuoteSettings } from '../services/quote.service.js';
import { el, on, setHTML, showError, clearError } from '../utils/dom.js';
import { escapeHTML } from '../utils/sanitize.js';

let decks = [];
let rules = [];
let editingRuleId = null;

// In-memory list of event type rows being edited
let editingEventTypes = [];

export async function initPitchDeckManager() {
  // Settings
  on(el('#settings-edit-btn'),   'click',  openSettingsForm);
  on(el('#settings-cancel-btn'), 'click',  closeSettingsForm);
  on(el('#settings-form'),       'submit', handleSettingsSave);
  on(el('#event-type-add-btn'),  'click',  addEventTypeRow);

  // Pitch decks
  on(el('#deck-upload-btn'),  'click', () => {
    el('#deck-upload-wrapper').style.display = 'block';
    el('#deck-upload-btn').style.display = 'none';
  });
  on(el('#deck-cancel-btn'), 'click', () => {
    el('#deck-upload-wrapper').style.display = 'none';
    el('#deck-upload-btn').style.display = '';
  });
  on(el('#deck-form'), 'submit', handleDeckUpload);

  // Rules
  on(el('#rule-new-btn'),    'click',  () => openRuleForm());
  on(el('#rule-cancel-btn'), 'click',  closeRuleForm);
  on(el('#rule-form'),       'submit', handleRuleSubmit);

  await loadSettings();
  await loadDecks();
  await loadRules();
}

// ── Quote Settings ────────────────────────────────────────────────────────────

const SETTING_DEFAULTS = {
  event_types: [
    { value: 'personal',  label: 'Personal',  icon: '✿', description: 'Birthdays, weddings, anniversaries & intimate celebrations' },
    { value: 'corporate', label: 'Corporate', icon: '◈', description: 'Company functions, launches, conferences & year-end events' },
  ],
  guests:  { min: 10,   max: 500,    step: 5,    default: 50    },
  budget:  { min: 5000, max: 200000, step: 1000, default: 30000, prefix: 'R' },
};

let currentSettings = null;

async function loadSettings() {
  const display = el('#settings-display');
  try {
    currentSettings = await getQuoteSettings();
    if (!currentSettings) currentSettings = SETTING_DEFAULTS;
    renderSettingsDisplay();
  } catch (err) {
    display.textContent = 'Failed to load settings.';
    console.error(err);
  }
}

function renderSettingsDisplay() {
  const s = currentSettings;
  const display = el('#settings-display');
  const ets = (s.event_types ?? []).map(et =>
    `<span style="margin-right:0.75rem;">${escapeHTML(et.icon ?? '')} <strong>${escapeHTML(et.label)}</strong> (${escapeHTML(et.value)})</span>`
  ).join('');
  const g = s.guests ?? {};
  const b = s.budget ?? {};
  display.innerHTML = `
    <div class="item-row" style="flex-direction:column;align-items:flex-start;gap:0.5rem;">
      <div><strong>Event Types:</strong> ${ets || '<em>None</em>'}</div>
      <div><strong>Guests Slider:</strong> ${g.min ?? '—'} – ${g.max ?? '—'} (step ${g.step ?? '—'}, default ${g.default ?? '—'})</div>
      <div><strong>Budget Slider:</strong> ${b.prefix ?? 'R'}${b.min ?? '—'} – ${b.prefix ?? 'R'}${b.max ?? '—'} (step ${b.step ?? '—'}, default ${b.default ?? '—'})</div>
    </div>`;
}

function openSettingsForm() {
  const s = currentSettings ?? SETTING_DEFAULTS;
  clearError('settings-form-error');

  // Populate slider fields
  el('#guests-min').value     = s.guests?.min     ?? 10;
  el('#guests-max').value     = s.guests?.max     ?? 500;
  el('#guests-step').value    = s.guests?.step    ?? 5;
  el('#guests-default').value = s.guests?.default ?? 50;

  el('#budget-prefix').value  = s.budget?.prefix  ?? 'R';
  el('#budget-min').value     = s.budget?.min     ?? 5000;
  el('#budget-max').value     = s.budget?.max     ?? 200000;
  el('#budget-step').value    = s.budget?.step    ?? 1000;
  el('#budget-default').value = s.budget?.default ?? 30000;

  // Build event type rows
  editingEventTypes = JSON.parse(JSON.stringify(s.event_types ?? []));
  renderEventTypeRows();

  el('#settings-form-wrapper').style.display = 'block';
  el('#settings-edit-btn').style.display     = 'none';
}

function closeSettingsForm() {
  el('#settings-form-wrapper').style.display = 'none';
  el('#settings-edit-btn').style.display     = '';
}

function renderEventTypeRows() {
  const container = el('#event-types-list');
  if (!editingEventTypes.length) {
    container.innerHTML = '<p style="color:#888;font-size:0.82rem;margin-bottom:0.75rem;">No event types. Add one below.</p>';
    return;
  }
  container.innerHTML = editingEventTypes.map((et, i) => `
    <div class="event-type-row" data-index="${i}"
      style="display:grid;grid-template-columns:0.5fr 1fr 1fr 2fr auto;gap:0.5rem;align-items:end;margin-bottom:0.5rem;">
      <div class="form-group" style="margin:0;">
        <label style="font-size:0.65rem;">Icon</label>
        <input type="text" class="et-icon" value="${escapeHTML(et.icon ?? '')}" maxlength="4" style="font-size:1.2rem;text-align:center;">
      </div>
      <div class="form-group" style="margin:0;">
        <label style="font-size:0.65rem;">Label</label>
        <input type="text" class="et-label" value="${escapeHTML(et.label ?? '')}" required>
      </div>
      <div class="form-group" style="margin:0;">
        <label style="font-size:0.65rem;">Value (no spaces)</label>
        <input type="text" class="et-value" value="${escapeHTML(et.value ?? '')}" required pattern="[a-z0-9_]+">
      </div>
      <div class="form-group" style="margin:0;">
        <label style="font-size:0.65rem;">Description (optional)</label>
        <input type="text" class="et-desc" value="${escapeHTML(et.description ?? '')}">
      </div>
      <button type="button" class="btn-danger btn-sm et-remove-btn" data-index="${i}" style="margin-bottom:0;">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('.et-remove-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      editingEventTypes.splice(Number(btn.dataset.index), 1);
      renderEventTypeRows();
    })
  );

  // Keep editingEventTypes in sync as the user types
  container.querySelectorAll('.event-type-row').forEach((row, i) => {
    ['icon', 'label', 'value', 'desc'].forEach(field => {
      row.querySelector(`.et-${field}`)?.addEventListener('input', (e) => {
        const key = field === 'desc' ? 'description' : field;
        editingEventTypes[i][key] = e.target.value;
      });
    });
  });
}

function addEventTypeRow() {
  editingEventTypes.push({ icon: '✦', label: '', value: '', description: '' });
  renderEventTypeRows();
}

async function handleSettingsSave(e) {
  e.preventDefault();
  clearError('settings-form-error');

  // Validate event types
  for (const et of editingEventTypes) {
    if (!et.label?.trim() || !et.value?.trim()) {
      showError('settings-form-error', 'All event types must have a label and a value.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(et.value.trim())) {
      showError('settings-form-error', `Event type value "${et.value}" must be lowercase letters, numbers, or underscores only.`);
      return;
    }
  }

  const payload = {
    event_types: editingEventTypes.map(et => ({
      value:       et.value.trim(),
      label:       et.label.trim(),
      icon:        et.icon?.trim() || '✦',
      description: et.description?.trim() || '',
    })),
    guests: {
      min:     Number(el('#guests-min').value),
      max:     Number(el('#guests-max').value),
      step:    Number(el('#guests-step').value),
      default: Number(el('#guests-default').value),
    },
    budget: {
      prefix:  el('#budget-prefix').value.trim() || 'R',
      min:     Number(el('#budget-min').value),
      max:     Number(el('#budget-max').value),
      step:    Number(el('#budget-step').value),
      default: Number(el('#budget-default').value),
    },
  };

  const submitBtn = el('#settings-form [type="submit"]');
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Saving…';

  try {
    await upsertQuoteSettings(payload);
    currentSettings = payload;
    renderSettingsDisplay();
    closeSettingsForm();
  } catch (err) {
    showError('settings-form-error', err.message ?? 'Failed to save settings.');
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Save Settings';
  }
}

// ── Pitch Decks ───────────────────────────────────────────────────────────────

async function loadDecks() {
  const list = el('#deck-list');
  list.textContent = 'Loading...';
  try {
    decks = await getPitchDecks();
    renderDecks();
    populateDeckSelect();
  } catch (err) {
    list.textContent = 'Failed to load pitch decks.';
    console.error(err);
  }
}

function renderDecks() {
  const list = el('#deck-list');
  if (!decks.length) {
    list.innerHTML = '<p class="empty-state">No pitch decks uploaded yet.</p>';
    return;
  }
  setHTML(list, decks.map((d) => `
    <div class="item-row" data-id="${d.id}">
      <div class="item-info">
        <strong>${escapeHTML(d.name)}</strong>
        <a href="${d.pdf_url}" target="_blank" rel="noopener" class="btn-secondary btn-sm">View PDF</a>
      </div>
      <div class="item-actions">
        <button class="btn-danger btn-sm deck-delete-btn" data-id="${d.id}">Delete</button>
      </div>
    </div>
  `).join(''));

  list.querySelectorAll('.deck-delete-btn').forEach((btn) =>
    btn.addEventListener('click', () => handleDeckDelete(btn.dataset.id)));
}

function populateDeckSelect() {
  const select = el('#rule-deck-id');
  const current = select.value;
  select.innerHTML = '<option value="">Select a pitch deck...</option>' +
    decks.map((d) => `<option value="${d.id}">${escapeHTML(d.name)}</option>`).join('');
  if (current) select.value = current;
}

async function handleDeckUpload(e) {
  e.preventDefault();
  clearError('deck-form-error');

  const name = el('#deck-name').value.trim();
  const file = el('#deck-file').files[0];

  if (!name || !file) {
    showError('deck-form-error', 'Name and PDF file are required.');
    return;
  }

  const submitBtn = el('#deck-form [type="submit"]');
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Uploading...';

  try {
    const pdf_url = await uploadPDF('pitch-decks', 'decks', file);
    const { error } = await supabase.from('pitch_decks').insert([{ name, pdf_url }]);
    if (error) throw error;

    el('#deck-form').reset();
    el('#deck-upload-wrapper').style.display = 'none';
    el('#deck-upload-btn').style.display     = '';
    await loadDecks();
  } catch (err) {
    showError('deck-form-error', err.message ?? 'Upload failed.');
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Upload';
  }
}

async function handleDeckDelete(id) {
  if (!confirm('Delete this pitch deck? Rules referencing it will break.')) return;
  try {
    const { error } = await supabase.from('pitch_decks').delete().eq('id', id);
    if (error) throw error;
    await loadDecks();
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
}

// ── Mapping Rules ─────────────────────────────────────────────────────────────

async function loadRules() {
  const list = el('#rule-list');
  list.textContent = 'Loading...';
  try {
    const { data, error } = await supabase
      .from('pitch_deck_rules')
      .select('*, pitch_decks(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    rules = data;
    renderRules();
  } catch (err) {
    list.textContent = 'Failed to load rules.';
    console.error(err);
  }
}

function renderRules() {
  const list = el('#rule-list');
  if (!rules.length) {
    list.innerHTML = '<p class="empty-state">No rules yet. Add one to map answers to a pitch deck.</p>';
    return;
  }
  setHTML(list, rules.map((r) => {
    const cond = r.conditions ?? {};
    const condSummary = Object.entries(cond).map(([k, v]) => {
      if (typeof v === 'object') return `${k}: ${v.min ?? ''}–${v.max ?? ''}`;
      return `${k}: ${v}`;
    }).join(' | ');
    return `
      <div class="item-row" data-id="${r.id}">
        <div class="item-info">
          <strong>${escapeHTML(r.name)}</strong>
          <span class="item-meta">Deck: ${escapeHTML(r.pitch_decks?.name ?? 'Unknown')}</span>
          <span class="item-meta" style="font-family:monospace;font-size:0.72rem;">${escapeHTML(condSummary)}</span>
        </div>
        <div class="item-actions">
          <button class="btn-secondary btn-sm rule-edit-btn" data-id="${r.id}">Edit</button>
          <button class="btn-danger btn-sm rule-delete-btn" data-id="${r.id}">Delete</button>
        </div>
      </div>
    `;
  }).join(''));

  list.querySelectorAll('.rule-edit-btn').forEach((btn) =>
    btn.addEventListener('click', () => openRuleForm(btn.dataset.id)));
  list.querySelectorAll('.rule-delete-btn').forEach((btn) =>
    btn.addEventListener('click', () => handleRuleDelete(btn.dataset.id)));
}

function openRuleForm(id = null) {
  editingRuleId = id;
  clearError('rule-form-error');
  el('#rule-form-wrapper').style.display = 'block';

  if (id) {
    const r = rules.find((x) => x.id === id);
    el('#rule-form-title').textContent = 'Edit Rule';
    el('#rule-id').value               = r.id;
    el('#rule-name').value             = r.name;
    el('#rule-conditions').value       = JSON.stringify(r.conditions, null, 2);
    el('#rule-deck-id').value          = r.pitch_deck_id;
  } else {
    el('#rule-form-title').textContent = 'New Rule';
    el('#rule-form').reset();
    // Prefill a helpful template
    el('#rule-conditions').value = JSON.stringify({
      event_type: 'personal',
      guests:     { min: 0, max: 100 },
      budget:     { min: 0, max: 50000 },
    }, null, 2);
  }
}

function closeRuleForm() {
  el('#rule-form-wrapper').style.display = 'none';
  editingRuleId = null;
}

async function handleRuleSubmit(e) {
  e.preventDefault();
  clearError('rule-form-error');

  const name          = el('#rule-name').value.trim();
  const pitch_deck_id = el('#rule-deck-id').value;
  const conditionsRaw = el('#rule-conditions').value.trim();

  let conditions;
  try {
    conditions = conditionsRaw ? JSON.parse(conditionsRaw) : {};
  } catch {
    showError('rule-form-error', 'Conditions must be valid JSON.');
    return;
  }

  if (!name || !pitch_deck_id) {
    showError('rule-form-error', 'Name and pitch deck are required.');
    return;
  }

  const submitBtn       = el('#rule-form [type="submit"]');
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Saving...';

  try {
    if (editingRuleId) {
      const { error } = await supabase
        .from('pitch_deck_rules')
        .update({ name, conditions, pitch_deck_id })
        .eq('id', editingRuleId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('pitch_deck_rules')
        .insert([{ name, conditions, pitch_deck_id }]);
      if (error) throw error;
    }

    closeRuleForm();
    await loadRules();
  } catch (err) {
    showError('rule-form-error', err.message ?? 'Failed to save rule.');
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Save Rule';
  }
}

async function handleRuleDelete(id) {
  if (!confirm('Delete this rule?')) return;
  try {
    const { error } = await supabase.from('pitch_deck_rules').delete().eq('id', id);
    if (error) throw error;
    await loadRules();
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
}
