const delayInput = document.getElementById("delayInput");
const startButton = document.getElementById("startButton");
const statusEl = document.getElementById("status");
const STORAGE_KEY = "clickDelayMs";

async function loadDelay() {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  const delay = Number.isFinite(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : 1;
  delayInput.value = String(Math.max(0, Math.floor(delay)));
}

async function saveDelay(value) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: value });
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#c0392b" : "";
}

startButton.addEventListener("click", async () => {
  const delay = Math.max(0, Math.floor(Number(delayInput.value) || 1));
  delayInput.value = String(delay);

  try {
    await saveDelay(delay);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      setStatus("No active tab found.", true);
      return;
    }

    await chrome.tabs.sendMessage(tab.id, {
      type: "START_PICKER",
      delayMs: delay,
    });

    setStatus("Now click the target element in the page.");
    window.close();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`Could not start picker: ${message}`, true);
  }
});

loadDelay().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  setStatus(`Could not load delay: ${message}`, true);
});
