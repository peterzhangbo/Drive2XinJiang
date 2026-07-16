import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, '大北疆带狗自驾攻略.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const failures = [];
let passes = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passes += 1;
    console.log(`PASS ${name}`);
  } else {
    failures.push(`${name}${detail ? `：${detail}` : ''}`);
    console.error(`FAIL ${name}${detail ? `：${detail}` : ''}`);
  }
}

function extractArray(name) {
  const pattern = new RegExp(`const\\s+${name}\\s*=\\s*(\\[[\\s\\S]*?\\n\\]);`);
  const match = html.match(pattern);
  if (!match) return null;
  return vm.runInNewContext(`(${match[1]})`, Object.create(null), { timeout: 1000 });
}

const days = extractArray('DAYS');
check('存在 DAYS 结构化数据', Array.isArray(days));
if (days) {
  check('固定18天且日序唯一', days.length === 18 && new Set(days.map(day => day.d)).size === 18);
  check('日期唯一', new Set(days.map(day => day.date)).size === 18);
  check('D3为额济纳到敦煌', /额济纳.*敦煌/.test(days[2]?.title || ''));
  check('D1改住巴彦淖尔维也纳国际酒店并保留电话', /维也纳国际酒店/.test(days[0]?.stay || '') && /04788259998/.test(days[0]?.stay || ''));
  check('D2改住额济纳旗尚景酒店并保留电话', /额济纳旗尚景酒店/.test(days[1]?.stay || '') && /04836529358/.test(days[1]?.stay || ''));
  check('D3改住敦煌家天下精品客栈鸣沙山店并保留电话', /家天下精品客栈.*鸣沙山店/.test(days[2]?.stay || '') && /18437722550/.test(days[2]?.stay || ''));
  check('D4改住哈密星旺宾馆并保留电话', /哈密.*星旺宾馆/.test(days[3]?.stay || '') && /09026975888/.test(days[3]?.stay || ''));
  check('D15返程哈密住宿仍为海逸酒店', /海逸酒店/.test(days[14]?.stay || '') && !/同D3酒店/.test(days[14]?.stay || ''));
  check('D16返程额济纳住宿仍为云朵酒店', /云朵酒店/.test(days[15]?.stay || '') && !/同D2/.test(days[15]?.stay || ''));
  check('D17返程临河住宿仍为云庭酒店', /云庭酒店/.test(days[16]?.stay || '') && !/同D1/.test(days[16]?.stay || ''));
  check('D4完整行驶S240和S245到哈密', /敦煌/.test(days[3]?.title || '') && /哈密/.test(days[3]?.title || '') && /S240.*S245/.test(days[3]?.route || ''));
  check('D5哈密穿越大海道后住鄯善', /哈密.*大海道.*鄯善/.test(days[4]?.title || '') && /通天洞/.test((days[4]?.play || []).join('')));
  check('D5不依赖红柳滩充电且有低底盘退出方案', /不把红柳滩|不依赖红柳滩/.test(`${days[4]?.decision || ''} ${(days[4]?.charge || []).join(' ')}`) && /东门浅游/.test(days[4]?.decision || ''));
  check('D6完整走S21到北屯并使用官方三处充电备选', /鄯善.*S21.*北屯/.test(days[5]?.title || '') && /克拉美丽/.test((days[5]?.charge || []).join('')) && /五家渠/.test((days[5]?.charge || []).join('')) && /吉利湖/.test((days[5]?.charge || []).join('')));
  check('D6不把黄花沟作为充电点', /不把黄花沟当充电点/.test(days[5]?.decision || ''));
  check('D7北屯经布尔津补电进禾木', /北屯.*布尔津.*禾木/.test(days[6]?.title || '') && /用户已确认.*边牧.*带入禾木村/.test((days[6]?.play || []).join('')));
  check('D8禾木返回布尔津', /禾木.*布尔津/.test(days[7]?.title || '') && /静逸时光民宿/.test(days[7]?.stay || ''));
  const km = days.reduce((sum, day) => sum + Number(day.km || 0), 0);
  check('逐日里程为合理数值并由页面承载自动汇总', km > 8500 && km < 9000 && /id="totalKm"/.test(html), `当前合计${km}km`);
  check('住宿夜数结构为16晚住宿和1晚条件营地', /16晚/.test(html) && /1晚/.test(html) && days.filter(day => day.tags?.includes('car')).length === 1);
}

const forbidden = [
  '新疆 105 对高速服务区充电全覆盖',
  '赛里木湖东门有 24 个快充桩',
  '独库沿线桩距<100km',
  '独库公路沿线桩距&lt;100km',
  '巴音布鲁克(路过)',
  '每桩2个20kW接口慢充',
  '已升级为顺顺充华为超充站',
  '乌鲁木齐（同D4酒店',
  '当前执行基线为 V7',
  '当前执行基线为 V8',
  '现有公安厅页面为公开征求意见稿',
  '独库北段预约信息不可当作最终公告',
  '不进入禾木景区',
  '禾木 / 五彩滩</b></td><td class="no"',
  '阿禾公路精华段 → 布尔津'
];
for (const text of forbidden) check(`删除过期或过度确定文案：${text}`, !html.includes(text));
check('引用独库正式公告', html.includes('202607/d75de3d68abb43feb47d0defc201411e.shtml'));
check('引用S245主管部门收费依据', html.includes('202411/d62f562572cb4855962ae00f799c9866.shtml'));

const chargeSegments = extractArray('CHARGE_SEGMENTS');
check('存在 CHARGE_SEGMENTS 结构化数据', Array.isArray(chargeSegments));
if (chargeSegments) {
  check('覆盖至少14个关键补能路段', chargeSegments.length >= 14, `当前${chargeSegments.length}段`);
  for (const segment of chargeSegments) {
    const complete = ['id', 'days', 'route', 'primary', 'backupA', 'backupB', 'channels', 'trigger', 'decisionPoint', 'fallback', 'evidence', 'verified']
      .every(key => String(segment[key] ?? '').trim());
    check(`充电路段 ${segment.id} 具备三层冗余和决策信息`, complete);
  }
  const s240 = chargeSegments.find(segment => /S240/.test(segment.route));
  check('S240/S245不虚构沿线充电桩', s240 && /未获官方确认|不把.*充电/.test(`${s240.evidence} ${s240.fallback}`));
  const s21 = chargeSegments.find(segment => /S21/.test(segment.route));
  check('S21主备站为克拉美丽五家渠吉利湖', s21 && /克拉美丽/.test(s21.primary) && /五家渠/.test(s21.backupA) && /吉利湖/.test(s21.backupB) && /黄花沟只休息/.test(s21.fallback));
  const hemu = chargeSegments.find(segment => /禾木/.test(segment.route));
  check('禾木补能不依赖景区内快充', hemu && /不承诺禾木|不依赖禾木/.test(`${hemu.evidence} ${hemu.fallback}`));
  check('拥堵只切同城或沿线备选而非默认绕行', chargeSegments.every(segment => /20分钟|不可用|无法确认|低于20%/.test(segment.trigger)));
}

const budgetItems = extractArray('BUDGET_ITEMS');
check('存在 BUDGET_ITEMS 结构化预算', Array.isArray(budgetItems));
if (budgetItems) {
  const min = budgetItems.reduce((sum, item) => sum + item.min, 0);
  const max = budgetItems.reduce((sum, item) => sum + item.max, 0);
  check('预算上下限可由分项求和', min > 0 && max > min && /id="budgetTotal"/.test(html), `¥${min}–${max}`);
  check('条件营地与失败备用住宿不重复计费', budgetItems.filter(item => /条件营地|备用酒店/.test(item.name)).length === 1 && /1晚/.test(budgetItems.find(item => /条件营地/.test(item.name))?.name || ''));
}

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
check('HTML不存在重复ID', new Set(ids).size === ids.length);

const blankLinks = [...html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].map(match => match[0]);
const unsafeLinks = blankLinks.filter(tag => !/\brel="[^"]*noopener[^"]*"/.test(tag));
check('所有新窗口链接都有noopener', unsafeLinks.length === 0, `缺失${unsafeLinks.length}处`);

const localLinks = [...html.matchAll(/href="([^"]+\.(?:md|html))"/g)]
  .map(match => match[1])
  .filter(href => !/^https?:/.test(href));
const missingLocal = localLinks.filter(href => !fs.existsSync(path.join(root, decodeURIComponent(href))));
check('页面引用的本地文件均存在', missingLocal.length === 0, missingLocal.join(', '));
check('使用内联图标避免本地预览请求缺失favicon', /<link\s+rel="icon"\s+href="data:image\/svg\+xml,/.test(html));

check('导航具有tablist语义', /<nav[^>]*role="tablist"/.test(html));
check('导航按钮具有tab和aria-selected语义', /role="tab"/.test(html) && /aria-selected=/.test(html));
check('内容区具有tabpanel语义', /role="tabpanel"/.test(html));
check('提供清晰的键盘焦点样式', /:focus-visible/.test(html));
check('尊重减少动态效果偏好', /prefers-reduced-motion/.test(html));
check('移动端提示导航可以横向滑动', /nav-mobile-hint/.test(html));
check('地图跳转会重置逐日筛选', /function\s+resetDayFilter\s*\(/.test(html) && /function\s+openMapDay[\s\S]*?resetDayFilter\(\)/.test(html));
check('清单保存失败会显示可见提示', /id="ckSaveWarning"/.test(html) && /function\s+saveChecklistState/.test(html));
check('临河导航已使用维多利摩尔城新名称', !html.includes('云庭酒店临河人民公园店'));

console.log(`\n校验完成：${passes}项通过，${failures.length}项失败。`);
if (failures.length) {
  console.error(failures.map(item => `- ${item}`).join('\n'));
  process.exit(1);
}
