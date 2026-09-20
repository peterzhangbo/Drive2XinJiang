import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, webcrypto } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const dir = '大兴安岭_2026中秋国庆/';
const trip = JSON.parse(read(dir + '行程数据.json'));
const html = read(dir + 'index.html');
const md = read(dir + '行程草案.md');
assert.equal(trip.days.length, 13);
assert.equal(trip.version, 'V0.4');
assert.equal((html.match(/data-day="\d+"/g) || []).length, 13);
for (const [i, day] of trip.days.entries()) {
  assert.equal(day.day, i + 1);
  const date = new Date(Date.UTC(2026, 8, 25 + i));
  assert.equal(day.date, `${date.getUTCMonth() + 1}/${date.getUTCDate()}`);
  const card = html.match(new RegExp(`<article[^>]*data-day="${day.day}"[\\s\\S]*?</article>`))?.[0];
  assert.ok(card, `缺少D${day.day}`);
  for (const field of ['route', 'stay', 'km', 'drive', 'total', 'plan', 'road', 'charge', 'fallback', 'lodging', 'food', 'checks']) {
    assert.ok(card.includes(day[field]), `网页D${day.day}/${field}不一致`);
    assert.ok(md.includes(day[field]), `文档D${day.day}/${field}不一致`);
  }
}
assert.ok(trip.days[0].route.includes('通辽'));
assert.ok(trip.days[1].route.endsWith('牙克石'));
assert.equal(trip.days[2].stay, '额尔古纳');
assert.ok(trip.days[4].route.includes('伊克萨玛 → 白鹿岛'));
assert.ok(trip.days[4].lodging.includes('不可携宠'));
assert.ok(trip.days[4].charge.includes('必须落实夜充'));
assert.ok(trip.days[6].route.includes('九卡'));
assert.ok(trip.days[8].route.includes('新巴尔虎左旗'));
assert.ok(trip.days[9].type.includes('完整游玩日'));
assert.ok(trip.days[10].type.includes('完整游玩日'));
assert.ok(trip.days[11].route.endsWith('通辽方向'));
assert.ok(trip.days[12].km.includes('730–830'));
assert.ok(trip.days[1].road.includes('查草'));
assert.ok(html.includes('非导航地图'));
assert.ok(html.includes('尚未全部落实'));
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size);
console.log('通过：13天日期、路线、网页/文档/数据一致，估算和退路提示齐全。');

const archive = '归档/新疆自驾_2026-08/';
const manifest = JSON.parse(read(archive + '原文件校验清单.json'));
for (const file of manifest.files) {
  const bytes = fs.readFileSync(path.join(root, archive, file.path));
  assert.equal(bytes.length, file.bytes, file.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
}
console.log(`通过：新疆归档${manifest.files.length}个原文件校验未变。`);

const packet = JSON.parse(read('docs/trips.enc.json'));
const original = read(archive + '大北疆带狗自驾攻略.html');
const password = process.env.TRIP_PASSWORD || original.match(/var PASS = '([^']+)';/)[1];
const material = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
const key = await webcrypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:Buffer.from(packet.salt,'base64'),iterations:packet.iterations}, material, {name:'AES-GCM',length:256}, false, ['decrypt']);
const clear = await webcrypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(packet.iv,'base64')}, key, Buffer.from(packet.ciphertext,'base64'));
const payload = JSON.parse(new TextDecoder().decode(clear));
assert.deepEqual(Object.keys(payload.trips), ['daxing', 'xinjiang']);
assert.ok(payload.trips.daxing.html.includes('data-day="13"'));
assert.ok(payload.trips.daxing.html.includes('V0.4'));
assert.equal(payload.trips.daxing.documents['行程草案.md'], md);
assert.equal(payload.trips.daxing.documents['出行落实清单.md'], read(dir + '出行落实清单.md'));
assert.ok(!payload.trips.xinjiang.html.includes('id="pwGate"'));
assert.ok(!payload.trips.xinjiang.html.includes("var PASS ="));
assert.ok(payload.trips.daxing.html.includes("parent.postMessage"));
assert.ok(payload.trips.daxing.html.includes("href.startsWith('#')"));
assert.ok(payload.trips.daxing.html.includes('target.scrollIntoView()'));
assert.ok(payload.trips.daxing.html.includes('</script>\n</body>'));
const damaged = Buffer.from(packet.ciphertext, 'base64');
damaged[0] ^= 1;
await assert.rejects(webcrypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(packet.iv,'base64')}, key, damaged));
for (const name of ['index.html','app.css','app.js']) {
  assert.equal(read('web/' + name), read('docs/' + name));
  assert.ok(!read('docs/' + name).includes("var PASS ="));
  assert.ok(!read('docs/' + name).includes('柴河 → 阿尔山方向'));
}
assert.deepEqual(fs.readdirSync(path.join(root,'docs')).sort(), ['.nojekyll','app.css','app.js','index.html','trips.enc.json','大北疆带狗自驾攻略.html'].sort());
assert.ok(read('docs/大北疆带狗自驾攻略.html').includes('./#xinjiang'));
console.log('通过：原密码解密双旅行、发布内容同步、篡改拒绝、旧链接跳转、docs仅发布加密内容。');
