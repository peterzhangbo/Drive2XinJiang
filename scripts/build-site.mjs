import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const oldDir = '归档/新疆自驾_2026-08';
const newDir = '大兴安岭_2026中秋国庆';
const oldHtml = read(oldDir + '/大北疆带狗自驾攻略.html');
// 默认沿用历史入口设置，密码不写入新发布的JS或HTML。
const password = process.env.TRIP_PASSWORD || oldHtml.match(/var PASS = '([^']+)';/)?.[1];
if (!password) throw new Error('未找到原密码；请通过TRIP_PASSWORD提供本次构建密码。');
const docNames = dir => Object.fromEntries(fs.readdirSync(path.join(root, dir)).filter(n => n.endsWith('.md')).map(n => [n, read(dir + '/' + n)]));
const bridge = `<script>
document.addEventListener('click', function(event) {
  const link = event.target.closest('a');
  if (!link) return;
  const href = link.getAttribute('href') || '';
  if (href.startsWith('#')) {
    event.preventDefault();
    let id;
    try { id = decodeURIComponent(href.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (target) target.scrollIntoView();
    return;
  }
  if (/^(?:https?:|tel:|mailto:|data:)/i.test(href)) return;
  let name;
  try { name = decodeURIComponent(href.split('/').pop().split('#')[0]); } catch { return; }
  if (!name.endsWith('.md')) return;
  event.preventDefault();
  parent.postMessage({type:'trip-document', name:name}, parent.location.origin);
}, true);
</script>`;
function withBridge(html) {
  return html.replace('</body>', bridge + '\n</body>');
}
const gateStart = oldHtml.indexOf('<div id="pwGate"');
const gateEnd = oldHtml.indexOf('<a class="skip-link"', gateStart);
if (gateStart < 0 || gateEnd < gateStart) throw new Error('旧攻略密码区结构已变化，需检查后再发布。');
const cleanOldHtml = oldHtml.slice(0, gateStart) + oldHtml.slice(gateEnd);
const payload = {
  version:1,
  trips:{
    daxing:{title:'大兴安岭 · 中秋国庆', html:withBridge(read(newDir + '/index.html')), documents:docNames(newDir)},
    xinjiang:{title:'XinJiang · 夏日归档', html:withBridge(cleanOldHtml), documents:docNames(oldDir)}
  }
};
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const iv = webcrypto.getRandomValues(new Uint8Array(12));
const iterations = 600000;
const material = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
const key = await webcrypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations}, material, {name:'AES-GCM',length:256}, false, ['encrypt']);
const ciphertext = await webcrypto.subtle.encrypt({name:'AES-GCM',iv}, key, new TextEncoder().encode(JSON.stringify(payload)));
const packet = {version:1, algorithm:'AES-256-GCM', kdf:'PBKDF2-SHA256', iterations,
  salt:Buffer.from(salt).toString('base64'),iv:Buffer.from(iv).toString('base64'),ciphertext:Buffer.from(ciphertext).toString('base64')};
const out = path.join(root, 'docs');
fs.mkdirSync(out, {recursive:true});
for (const name of ['index.html','app.css','app.js']) fs.copyFileSync(path.join(root,'web',name),path.join(out,name));
fs.writeFileSync(path.join(out,'trips.enc.json'),JSON.stringify(packet));
fs.writeFileSync(path.join(out,'.nojekyll'),'');
const redirect = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./#xinjiang"><title>新疆攻略已归档</title><a href="./#xinjiang">打开新疆攻略</a></html>';
fs.writeFileSync(path.join(out,'大北疆带狗自驾攻略.html'),redirect);
console.log('已生成 docs：双行程加密内容、统一入口、旧链接跳转。');
