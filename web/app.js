'use strict';
const gate = document.querySelector('#gate');
const reader = document.querySelector('#reader');
const status = document.querySelector('#status');
const input = document.querySelector('#password');
const submit = document.querySelector('#submit');
const frames = new Map();
let payload;
let packet;
let sessionName;
let busy = false;
const bytes = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
const base64 = value => btoa(String.fromCharCode(...new Uint8Array(value)));
const packetPromise = fetch('trips.enc.json', {cache:'no-store'}).then(response => {
  if (!response.ok) throw new Error('无法加载攻略，请刷新后重试。');
  return response.json();
}).then(value => {
  packet = value;
  sessionName = 'road-journals-key:' + value.salt;
  return value;
});
// 立即接住网络失败；表单提交时仍显示具体加载错误。
packetPromise.catch(() => { status.textContent = '攻略加载失败，请检查网络后刷新。'; });

async function decrypt(rawKey) {
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  const clear = await crypto.subtle.decrypt({name:'AES-GCM', iv:bytes(packet.iv)}, key, bytes(packet.ciphertext));
  return JSON.parse(new TextDecoder().decode(clear));
}
function selectedTrip() {
  return location.hash === '#xinjiang' ? 'xinjiang' : 'daxing';
}
function renderTrip() {
  if (!payload) return;
  const id = selectedTrip();
  if (!frames.has(id)) {
    const frame = document.createElement('iframe');
    frame.title = payload.trips[id].title;
    // 内容来自本项目；保留旧攻略的脚本、打印和清单存储功能。
    frame.srcdoc = payload.trips[id].html;
    frames.set(id, frame);
    document.querySelector('#frames').append(frame);
  }
  for (const [key, frame] of frames) frame.hidden = key !== id;
  for (const link of document.querySelectorAll('[data-trip]')) {
    if (link.dataset.trip === id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.querySelector('#tripStatus').textContent = id === 'daxing' ? '秋日新旅程' : '夏日新疆 · 已归档';
  document.title = payload.trips[id].title + ' · 我们的路书';
  const dialog = document.querySelector('#documentDialog');
  if (dialog.open) dialog.close();
}
function enter(data) {
  payload = data;
  input.value = '';
  gate.hidden = true;
  reader.hidden = false;
  status.textContent = '';
  renderTrip();
}
document.querySelector('#unlockForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  busy = true;
  submit.disabled = true;
  status.textContent = '正在打开路书…';
  try {
    await packetPromise;
    if (!crypto.subtle) throw new Error('请通过 HTTPS 或本机预览地址打开网站。');
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(input.value), 'PBKDF2', false, ['deriveBits']);
    const rawKey = await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes(packet.salt),iterations:packet.iterations,hash:'SHA-256'}, material, 256);
    const data = await decrypt(rawKey);
    try { sessionStorage.setItem(sessionName, base64(rawKey)); } catch { /* 存储不可用时仍支持当前页面内切换。 */ }
    enter(data);
    document.querySelector('[data-trip="' + selectedTrip() + '"]').focus();
  } catch (error) {
    status.textContent = error.name === 'OperationError' ? '密码不正确，请再试一次。' : (error.message || '打开失败，请刷新重试。');
    input.select();
    input.focus();
  } finally {
    busy = false;
    submit.disabled = false;
  }
});
document.querySelector('#reveal').addEventListener('click', event => {
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  event.currentTarget.textContent = show ? '隐藏' : '显示';
  event.currentTarget.setAttribute('aria-label', show ? '隐藏密码' : '显示密码');
  event.currentTarget.setAttribute('aria-pressed', String(show));
});
document.querySelector('#lock').addEventListener('click', () => {
  try { sessionStorage.removeItem(sessionName); sessionStorage.removeItem('trip-pw-ok'); } catch {}
  for (const frame of frames.values()) frame.remove();
  frames.clear();
  payload = undefined;
  reader.hidden = true;
  gate.hidden = false;
  document.querySelector('#documentDialog').close();
  document.querySelector('#documentBody').textContent = '';
  document.querySelector('#documentTitle').textContent = '';
  document.title = '秋日出发 · 我们的旅行攻略';
  input.focus();
});
window.addEventListener('hashchange', renderTrip);
window.addEventListener('message', event => {
  if (!payload) return;
  const sender = [...frames].find(([, frame]) => frame.contentWindow === event.source);
  if (!sender || event.data?.type !== 'trip-document') return;
  const trip = payload.trips[sender[0]];
  const text = trip.documents[event.data.name];
  if (typeof text !== 'string') return;
  document.querySelector('#documentTitle').textContent = event.data.name.replace(/\.md$/, '');
  document.querySelector('#documentBody').textContent = text;
  document.querySelector('#documentDialog').showModal();
});
document.querySelector('#closeDocument').addEventListener('click', () => document.querySelector('#documentDialog').close());
(async () => {
  try {
    await packetPromise;
    const saved = sessionStorage.getItem(sessionName);
    if (saved && crypto.subtle) {
      try { enter(await decrypt(bytes(saved))); return; }
      catch { sessionStorage.removeItem(sessionName); }
    }
  } catch { /* 网络提示由加载与提交处理。 */ }
  input.focus();
})();
