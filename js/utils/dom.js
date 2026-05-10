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
