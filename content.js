let pickerActive = false;
let clickDelayMs = 1;
let highlightedElement = null;
const originalOutlineByElement = new WeakMap();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isInDisabledFieldset(el) {
  return Boolean(el.closest("fieldset[disabled]"));
}

function isAriaDisabled(el) {
  return el.getAttribute("aria-disabled") === "true";
}

function isDisabledByState(checkbox) {
  return checkbox.disabled || isInDisabledFieldset(checkbox) || isAriaDisabled(checkbox);
}

function isVisuallyHidden(el) {
  const style = window.getComputedStyle(el);
  const hasNoSize = el.getClientRects().length === 0;

  return (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.pointerEvents === "none" ||
    Number(style.opacity) === 0 ||
    hasNoSize
  );
}

function findNearbyLabel(checkbox) {
  if (checkbox.labels?.length) {
    return checkbox.labels[0];
  }

  if (checkbox.nextElementSibling?.tagName === "LABEL") {
    return checkbox.nextElementSibling;
  }

  if (checkbox.previousElementSibling?.tagName === "LABEL") {
    return checkbox.previousElementSibling;
  }

  return null;
}

function resolveClickTarget(checkbox) {
  if (!isVisuallyHidden(checkbox)) {
    return checkbox;
  }

  const label = findNearbyLabel(checkbox);
  if (label) {
    return label;
  }

  return checkbox.parentElement;
}

function clearHighlight() {
  if (!highlightedElement) {
    return;
  }

  const previousOutline = originalOutlineByElement.get(highlightedElement);
  highlightedElement.style.outline = previousOutline ?? "";
  highlightedElement = null;
}

function applyHighlight(el) {
  if (el === highlightedElement) {
    return;
  }

  clearHighlight();
  highlightedElement = el;

  if (!originalOutlineByElement.has(el)) {
    originalOutlineByElement.set(el, el.style.outline);
  }

  el.style.outline = "2px solid #0066ff";
}

async function uncheckWithin(targetElement) {
  const candidateCheckboxes = Array.from(
    targetElement.querySelectorAll('input[type="checkbox"]')
  ).filter((checkbox) => checkbox.checked && !isDisabledByState(checkbox));

  let uncheckedCount = 0;

  for (const checkbox of candidateCheckboxes) {
    if (!checkbox.checked || isDisabledByState(checkbox)) {
      continue;
    }

    const clickTarget = resolveClickTarget(checkbox);
    if (!clickTarget || isAriaDisabled(clickTarget)) {
      continue;
    }

    clickTarget.click();
    uncheckedCount += 1;
    await sleep(clickDelayMs);
  }

  return uncheckedCount;
}

function stopPicker() {
  if (!pickerActive) {
    return;
  }

  pickerActive = false;
  document.removeEventListener("mouseover", onMouseOver, true);
  document.removeEventListener("mouseout", onMouseOut, true);
  document.removeEventListener("click", onClick, true);
  clearHighlight();
}

function onMouseOver(event) {
  if (!pickerActive) {
    return;
  }

  if (event.target instanceof Element) {
    applyHighlight(event.target);
  }
}

function onMouseOut() {
  if (!pickerActive) {
    return;
  }

  clearHighlight();
}

async function onClick(event) {
  if (!pickerActive) {
    return;
  }

  if (!(event.target instanceof Element)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const targetElement = event.target;
  stopPicker();

  const count = await uncheckWithin(targetElement);
  console.info(`[Consent Checkbox Cleaner] Unchecked ${count} checkboxes.`);
}

function startPicker(delayMs) {
  stopPicker();

  pickerActive = true;
  clickDelayMs = Math.max(0, Math.floor(Number(delayMs) || 1));

  document.addEventListener("mouseover", onMouseOver, true);
  document.addEventListener("mouseout", onMouseOut, true);
  document.addEventListener("click", onClick, true);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "START_PICKER") {
    startPicker(message.delayMs);
    sendResponse({ ok: true });
  }
});
