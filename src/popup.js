import browser from "webextension-polyfill";

const key = 'MOD_FED_APPLICATION_OVERRIDES';

export async function readOverrides() {
  return await runInPage(loadInjected);
}

async function update(f) {
  const data = await readOverrides();
  f(data);
  await runInPage(saveInjected, data);
}

export async function saveOverride(override) {
  const { name, url, enabled } = override;
  await update(data => data[name] = { url, enabled });
}

export async function removeOverride(name) {
  await update(data => delete data[name]);
}

export async function createOverride(name) {
  await update(data => data[name] = { url: '', enabled: false });
}

async function runInPage(func, ...args) {
  const [{ result }] = await browser.scripting.executeScript({
    target: { tabId: await getActiveTabId() },
    func,
    args,
    world: "MAIN",
  });
  return result;
}

async function getActiveTabId() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0].id;
}

function loadInjected() {
  const json = localStorage.getItem('MOD_FED_APPLICATION_OVERRIDES') ?? '{}';
  return JSON.parse(json);
}

function saveInjected(data) {
  const json = JSON.stringify(data);
  localStorage.setItem('MOD_FED_APPLICATION_OVERRIDES', json);
}
