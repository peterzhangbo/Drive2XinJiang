import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, webcrypto } from 'node:crypto';
import { renderMarkdown } from './daxing-details.mjs';
assert.throws(() => renderMarkdown('| C19 | 候选 |\n| C20 | 缺口 |\n| C21 | 站点 |'), /表格/);
assert.ok(renderMarkdown('| 编号 | 内容 |\n|---|---|\n| C20 | 缺口 |').includes('<td>C20</td>'));
assert.ok(renderMarkdown('[景点清单](景点携犬与购票.md)').includes('href="景点携犬与购票.md"'));

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const dir = '大兴安岭_2026中秋国庆/';
const trip = JSON.parse(read(dir + '行程数据.json'));
const html = read(dir + 'index.html');
const md = read(dir + '行程草案.md');
assert.equal(trip.days.length, 13);
assert.equal(trip.lodgingConfirmation.managedBy, 'user');
assert.ok(!Object.hasOwn(trip.lodgingConfirmation, 'pendingNight'));
const attractionsDoc = read(dir + '景点携犬与购票.md');
assert.equal(trip.version, 'V1.0');
assert.equal((html.match(/data-day="\d+"/g) || []).length, 13);
for (const [i, day] of trip.days.entries()) {
  assert.equal(day.day, i + 1);
  const date = new Date(Date.UTC(2026, 8, 25 + i));
  assert.equal(day.date, `${date.getUTCMonth() + 1}/${date.getUTCDate()}`);
  const card = html.match(new RegExp(`<article[^>]*data-day="${day.day}"[\\s\\S]*?</article>`))?.[0];
  assert.ok(card, `缺少D${day.day}`);
  const cardText = card.replace(/<[^>]*>/g, '').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"');
  for (const field of ['route', 'stay', 'km', 'drive', 'total', 'plan', 'road', 'charge', 'fallback', 'lodging', 'food', 'checks']) {
    assert.ok(cardText.includes(day[field]), `网页D${day.day}/${field}不一致`);
    assert.ok(md.includes(day[field]), `文档D${day.day}/${field}不一致`);
  }
  assert.ok(day.attractions.length >= 1, `D${day.day}缺景点/不游玩说明`);
  assert.equal(day.lodgingStatus, day.day < 13 ? '用户自行安排，不列待办' : '返京，无住宿');
  for (const spot of day.attractions) {
    for (const field of ['name','verification','visit','pet','booking','purchase','fallback']) {
      assert.ok(spot[field] && cardText.includes(spot[field]), `D${day.day}景点${field}未渲染`);
      assert.ok(attractionsDoc.includes(spot[field]) && md.includes(spot[field]));
    }
    for (const id of spot.sources) assert.ok(trip.attractionSources.some(s => s.id === id));
    for (const link of spot.links) assert.ok(card.includes(link.url.replaceAll('&','&amp;')));
  }
  assert.ok(day.schedule.length >= 5);
  for (const [time, action] of day.schedule) {
    assert.ok(cardText.includes(time) && cardText.includes(action));
    assert.ok(md.includes(time) && md.includes(action));
  }
  assert.ok(day.navigation.length >= 3);
  for (const name of day.navigation) assert.ok(card.includes(encodeURIComponent(name)));
  assert.equal(day.kmRange.length, 2);
  assert.ok(day.kmRange[1] >= day.kmRange[0]);
}
assert.ok(trip.days[0].route.includes('锡林浩特'));
assert.ok(trip.days[1].route.endsWith('海拉尔'));
assert.deepEqual(trip.days.slice(0,3).map(d => d.stay), ['霍林郭勒','海拉尔','恩和']);
assert.ok(trip.days[3].route.startsWith('恩和'));
assert.ok(trip.days[3].charge.includes('285–319km'));
assert.ok(html.includes('status-outbound-v06'));
assert.ok(!html.includes('status-night-'));
assert.ok(!html.includes('status-mordaga-stay-'));
assert.ok(!trip.days.slice(0,3).some(d => /阿荣旗|牙克石|荷叶花/.test(d.route + d.stay + d.charge)));
assert.ok(html.includes('C21 D2'));
assert.ok(!html.includes('D5起保留旧版'));
assert.ok(html.includes('全程复审'));
assert.ok(trip.days[4].stay.startsWith('莫尔道嘎镇'));
assert.ok(trip.days[5].route.startsWith('莫尔道嘎镇'));
assert.ok(trip.days[5].plan.includes('2.5–3小时'));
assert.ok(trip.days[5].stay.startsWith('室韦'));
assert.ok(!trip.days.some(d => d.route.includes('奇乾')));
for (let c=1; c<=23; c++) assert.ok(new RegExp(`<td>C${String(c).padStart(2,'0')} `).test(html), `C${c}必须是表体数据，不能被吞掉或变表头`);
assert.equal((html.match(/id="charge-day-\d+"/g) || []).length, 13);
assert.equal((html.match(/id="meal-day-\d+"/g) || []).length, 13);
assert.ok(html.includes('住宿由用户自行安排'));
assert.ok(!html.includes('车宿仅D1、D12'));
for (const day of trip.days.slice(0,3)) assert.ok(new RegExp(`data-day="${day.day}"[\\s\\S]*?夜宿：${day.stay}`).test(html));
assert.ok(trip.days[4].route.includes('伊克萨玛 → 白鹿岛'));
assert.ok(trip.days[4].lodging.includes('不推荐酒店'));
assert.ok(trip.days[4].charge.includes('酒店夜充候选'));
assert.ok(trip.days[4].charge.includes('220–280km'));
assert.ok(trip.days[4].charge.includes('取消穿越'));
assert.ok(html.includes('C22 D5/D6候选'));
assert.ok(trip.days[6].route.includes('九卡'));
assert.ok(trip.days[8].route.includes('新巴尔虎左旗'));
assert.ok(trip.days[9].type.includes('完整游玩日'));
assert.ok(trip.days[10].type.includes('收费补游'));
assert.ok(trip.days[11].route.endsWith('通辽方向'));
assert.ok(trip.days[12].km.includes('730–830'));
assert.ok(trip.days[1].road.includes('S202'));
assert.ok(html.includes('非导航地图'));
assert.ok(html.includes('尚未全部落实'));
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size);
assert.deepEqual(trip.days.reduce((sum, day) => sum.map((value, index) => value + day.kmRange[index]), [0, 0]), [5110, 6100]);
assert.ok(html.includes('以下预算不含住宿费用'));
assert.ok(html.includes('daxing-confirm-v05'));
assert.equal((html.match(/<select id="status-/g) || []).length, 10);
assert.equal((html.match(/type="checkbox"/g) || []).length, 8);
assert.ok((html.match(/href="tel:/g) || []).length > 20);
assert.ok(html.includes('beforeprint') && html.includes('@media print'));
assert.ok(html.includes('所需电量超过100%'));
assert.ok(trip.days[4].checks.includes('13:00'));
assert.ok(!trip.days[4].checks.includes('15:00以后'));
for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), `失效锚点${match[1]}`);
const budgetRows = [...html.matchAll(/<tr><td>[^<]+<\/td><td>(\d+)–(\d+)<\/td><td>/g)];
assert.equal(budgetRows.length, 8);
const sumBudget = budgetRows.reduce((sum, row) => [sum[0] + Number(row[1]), sum[1] + Number(row[2])], [0, 0]);
assert.ok(html.includes(`id="budget-total">${sumBudget[0]}–${sumBudget[1]}`));
assert.ok(html.includes('id="verification"'));
assert.ok(html.includes('cnsc9914?region=CN'));
assert.ok(trip.days[10].charge.includes('C23') && trip.days[11].charge.includes('C23'));
assert.ok(trip.days[9].attractions.every(a => a.sources.includes('S13') && a.sources.includes('S14') && a.sources.includes('S15')));
assert.ok(!/最后一晚待定|最后一晚待确认|实际店名待填|实际店名待补录/.test(html + md + attractionsDoc));
console.log('通过：13天日期、网页/文档/数据一致，23个充电台账及13天補能/餐饮齐全；住宿移出待办，新增证据与边界同步。');

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
assert.ok(payload.trips.daxing.html.includes('V1.0'));
assert.equal(payload.trips.daxing.documents['核验进展.md'], read(dir + '核验进展.md'));
assert.equal(payload.trips.daxing.documents['行程草案.md'], md);
assert.equal(payload.trips.daxing.documents['出行落实清单.md'], read(dir + '出行落实清单.md'));
assert.equal(payload.trips.daxing.documents['执行细节与应急.md'], read(dir + '执行细节与应急.md'));
assert.equal(payload.trips.daxing.documents['全程审查报告.md'], read(dir + '全程审查报告.md'));
assert.ok(payload.trips.daxing.html.includes('href="全程审查报告.md"'));
assert.equal(payload.trips.daxing.documents['景点携犬与购票.md'], attractionsDoc);
assert.ok(!html.includes('初始全部待核'));
assert.ok(!html.includes('具体酒店待填；'));
assert.equal((html.match(/id="attractions-day-\d+"/g) || []).length, 13);
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
