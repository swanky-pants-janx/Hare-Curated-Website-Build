export function el(selector, parent = document) {
  return parent.querySelector(selector);
}

export function els(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

export function show(element) {
  if (element) element.style.display = '';
}

export function hide(element) {
  if (element) element.style.display = 'none';
}

export function setHTML(element, html) {
  if (element) element.innerHTML = html;
}

export function setText(element, text) {
  if (element) element.textContent = text;
}

export function on(element, event, handler) {
  if (element) element.addEventListener(event, handler);
}

export function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.textContent = message;
    container.style.display = 'block';
  }
}

export function clearError(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.textContent = '';
    container.style.display = 'none';
  }
}

export function initFilterPill(container) {
  if (!container) return;
  let pill = container.querySelector('.tab-pill');
  if (!pill) {
    pill = document.createElement('span');
    pill.className = 'tab-pill';
    container.insertBefore(pill, container.firstChild);
  }

  function placePill(btn, animate) {
    if (!animate) pill.classList.add('no-transition');
    pill.style.left  = btn.offsetLeft + 'px';
    pill.style.width = btn.offsetWidth + 'px';
    if (!animate) {
      pill.getBoundingClientRect();
      pill.classList.remove('no-transition');
    }
  }

  const activeBtn = container.querySelector('.filter-btn.active');
  if (activeBtn) placePill(activeBtn, false);

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    placePill(btn, true);
  });
}
