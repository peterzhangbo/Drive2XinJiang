import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('大北疆带狗自驾攻略.html');
const brief = read('全程行程简报.md');
const verification = read('信息核验记录.md');
const archive = read('需求归档.md');
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
  const match = html.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\[[\\s\\S]*?\\n\\]);`));
  return match ? vm.runInNewContext(`(${match[1]})`, Object.create(null), { timeout: 1000 }) : null;
}

const days = extractArray('DAYS');
const chargeSegments = extractArray('CHARGE_SEGMENTS');
const dailyChargePlans = extractArray('DAILY_CHARGE_PLANS');
const dailyDiningPlans = extractArray('DAILY_DINING_PLANS');
const diningMatches = extractArray('DINING_DIANPING_MATCHES');
const budgetItems = extractArray('BUDGET_ITEMS');

check('存在全部结构化数据', [days, chargeSegments, dailyChargePlans, dailyDiningPlans, diningMatches, budgetItems].every(Array.isArray));

if (days) {
  check('行程为D1-D28且日期唯一', days.length === 28 && days.every((day, index) => day.d === index + 1) && new Set(days.map(day => day.date)).size === 28);
  const km = days.reduce((sum, day) => sum + Number(day.km || 0), 0);
  check('结构化逐日里程合计12855km', km === 12855, `当前${km}km`);
  check('住宿结构为18晚住宿和9晚床车', days.filter(day => day.tags?.includes('car')).length === 9 && /18晚酒店\/民宿/.test(html) && /9晚管理点床车/.test(html));

  check('D1-D4指定酒店电话完整',
    /维也纳国际酒店/.test(days[0].stay) && /04788259998/.test(days[0].stay) &&
    /尚景酒店/.test(days[1].stay) && /04836529358/.test(days[1].stay) &&
    /家天下民宿/.test(days[2].stay) && /18437722550/.test(days[2].stay) &&
    /星旺宾馆/.test(days[3].stay) && /09026975888/.test(days[3].stay));
  check('D6-D13指定住宿与电话完整',
    /友谊宾馆/.test(days[5].stay) && /09062315888/.test(days[5].stay) &&
    /牧雅居民宿/.test(days[6].stay) && /18126209839/.test(days[6].stay) &&
    /柏纳酒店/.test(days[7].stay) && /15009906218/.test(days[7].stay) &&
    /赛官房/.test(days[8].stay) && /09092222000/.test(days[8].stay) &&
    /栖云馆/.test(days[9].stay) && /13899730840/.test(days[9].stay) &&
    /悠然民宿/.test(days[10].stay) && /15886986899/.test(days[10].stay) &&
    /听泉别院/.test(days[12].stay) && /19326665500/.test(days[12].stay));

  check('D3采用马鬃山G215且仅短走G30', /马鬃山.*瓜州.*敦煌/.test(days[2].title) && days[2].km === 700 && /G7.*G215.*G30.*G3011/.test(days[2].route) && /约72km/.test(days[2].decision));
  check('D3不再把金塔酒泉设为默认线', /不再绕金塔.*酒泉/.test(days[2].route) && /管制.*才退回金塔—酒泉旧线/.test(days[2].decision));
  check('D4完整保留S240/S245且不虚构沿线桩', /S240.*S245/.test(days[3].route) && days[3].km === 380 && /沿线未获.*充电投运确认/.test((days[3].charge || []).join('')));
  check('D5改为551km大海道全天游览且夜宿巴里坤', days[4].km === 551 && /大海道.*G7.*巴里坤/.test(days[4].title) && /18:00/.test(days[4].decision) && /巴里坤/.test(days[4].decision) && !/11:00开始返程/.test(days[4].decision));
  check('D5-D6不再宣称G7货车少', /资源运输|货车/.test(`${days[4].decision} ${(days[4].tips || []).join('')}`) && !/G7(?:沿线)?货车少/.test(`${days[4].decision} ${(days[4].tips || []).join('')}`));
  check('D6改为巴里坤起949km全程最长单日且不走G30', days[5].km === 949 && /巴里坤/.test(days[5].title) && /阿勒泰/.test(days[5].title) && /949km/.test(days[5].decision) && /不经过G30/.test(days[5].route));
  check('D6走S21且官方三服务区形成补能', /S21/.test(days[5].title) && /五家渠|阜康/.test((days[5].charge || []).join('')) && /克拉美丽/.test((days[5].charge || []).join('')) && /吉利湖/.test((days[5].charge || []).join('')));
  check('禾木执行可载犬交通且不依赖村内快充', /用户已确认.*两只边牧.*带入禾木村/.test((days[6].play || []).join('')) && /可载犬出租车/.test(`${days[6].stay} ${(days[6].play || []).join('')}`) && /不依赖.*禾木/.test((days[6].charge || []).join('')));
  check('D11不绕八卦城且宠物未确认时直达那拉提', /伊宁.*巩留.*库尔德宁.*那拉提/.test(days[10].title) && !/八卦城/.test(days[10].title) && /未电话确认.*两只边牧/.test(days[10].decision) && /直达那拉提/.test(days[10].decision));
  check('D14独库北段与G577封路备选完整', /独库北段/.test(days[13].title) && /G577/.test(`${days[13].decision} ${(days[13].tips || []).join('')}`));
  check('D16送机后直接到库尔勒', /送机.*库尔勒/.test(days[15].title) && days[15].km === 430 && /永丰/.test((days[15].charge || []).join('')));
  check('D17前推米兰且D18保留花土沟最大补能风险段', /库尔勒.*米兰/.test(days[16].title) && days[16].km === 510 && /米兰.*花土沟/.test(days[17].title) && days[17].km === 360 && /最大补能风险段/.test(days[17].decision) && /花土沟/.test((days[17].charge || []).join('')));
  check('D19退出水上雅丹改S318到格尔木', /S318.*格尔木/.test(days[18].title) && days[18].km === 455 && /取消水上雅丹|放弃G315/.test(`${days[18].route} ${days[18].decision}`) && /2km/.test(days[18].decision));
  check('D20新增格尔木到茶卡床车夜', /格尔木.*茶卡/.test(days[19].title) && days[19].km === 480 && /床车第5晚/.test(days[19].stay));
  check('D21青海湖仅一处正规点并住西宁', /茶卡.*青海湖.*西宁/.test(days[20].title) && days[20].km === 310 && /一个|一处/.test(days[20].decision) && /青滨壹号/.test(days[20].stay) && !days[20].tags.includes('car'));
  check('D22-D24武都成都与大足车宿顺序正确', /西宁.*陇南/.test(days[21].title) && /武都服务区/.test(days[21].stay) && /武都服务区.*成都/.test(days[22].title) && /希尔顿惠庭/.test(days[22].stay) && /成都.*大足石刻服务区/.test(days[23].title) && /大足石刻服务区/.test(days[23].stay));
  check('D25绕开G42封闭段走渝蓉石渝', /G5013.*G5001.*G5021.*G50/.test(days[24].route) && /不走G42/.test(days[24].route) && /全封闭/.test(days[24].decision));
  check('D26武汉住店且D27休整半日后到信阳', /恩施.*武汉/.test(days[25].title) && /徐东希尔顿惠庭/.test(days[25].stay) && /61cm/.test(`${days[25].decision} ${(days[25].tips || []).join('')}`) && /武汉.*信阳/.test(days[26].title) && /信阳服务区/.test(days[26].stay));
  check('D28信阳到北京保留两主充与疲劳退出', /信阳.*北京/.test(days[27].title) && days[27].km === 960 && /原阳/.test((days[27].charge || []).join('')) && /石家庄东/.test((days[27].charge || []).join('')) && /打哈欠|注意力漂移|疲劳/.test(days[27].decision));

  const briefRows = new Map([...brief.matchAll(/^\| D(\d+) [^|]*\|[^|]*，(\d+)km \|/gm)].map(match => [Number(match[1]), Number(match[2])]));
  check('简报包含28天完整日序', briefRows.size === 28 && [...briefRows.keys()].every((day, index) => day === index + 1), `当前${briefRows.size}天`);
  check('简报所有逐日里程与网页一致', days.every(day => briefRows.get(day.d) === day.km));
}

check('简报V27总览与网页一致', /执行版本：V27/.test(brief) && /28天/.test(brief) && /12,855km/.test(brief) && /18晚酒店\/民宿＋9晚/.test(brief));
check('简报明确六项改线理由', /D3不再绕金塔、酒泉/.test(brief) && /G7不再标成“货车少”/.test(brief) && /保留S240\/S245/.test(brief) && /退出G315水上雅丹/.test(brief) && /青海新增茶卡一晚/.test(brief) && /避开G42封闭段/.test(brief));

if (chargeSegments) {
  check('关键补能路段不少于25段且ID唯一', chargeSegments.length >= 25 && new Set(chargeSegments.map(segment => segment.id)).size === chargeSegments.length);
  for (const segment of chargeSegments) {
    check(`充电路段 ${segment.id} 具备完整三层冗余`, ['id', 'days', 'route', 'primary', 'backupA', 'backupB', 'channels', 'trigger', 'decisionPoint', 'fallback', 'evidence', 'verified'].every(key => String(segment[key] || '').trim()));
  }
  const byId = id => chargeSegments.find(segment => segment.id === id);
  check('D3补能随马鬃山G215新线同步', /G215/.test(byId('d3-ejina-dunhuang')?.route || '') && /马鬃山/.test(byId('d3-ejina-dunhuang')?.primary || '') && /瓜州/.test(`${byId('d3-ejina-dunhuang')?.backupA} ${byId('d3-ejina-dunhuang')?.backupB}`));
  check('S240/S245仍明确不依赖沿线桩', /不依赖|未获官方确认/.test(`${byId('d4-s240-s245')?.fallback} ${byId('d4-s240-s245')?.evidence}`));
  check('D19补能不回切G315水上雅丹', /S318/.test(byId('d19-mangya-golmud')?.route || '') && /不回切G315/.test(byId('d19-mangya-golmud')?.fallback || ''));
  check('D20使用G6服务区与茶卡落地闭环', /G6/.test(byId('d20-golmud-chaka')?.route || '') && /诺木洪/.test(`${byId('d20-golmud-chaka')?.primary} ${byId('d20-golmud-chaka')?.backupA}`) && /茶卡/.test(byId('d20-golmud-chaka')?.backupB || ''));
  check('D25补能关联新路由且不把G42设主线', /G5013.*G5021.*G50/.test(byId('d25-chengdu-enshi')?.route || '') && !/G42/.test(byId('d25-chengdu-enshi')?.route || ''));
  check('D28补能固定原阳和石家庄东', /原阳/.test(byId('d28-wuhan-beijing')?.primary || '') && /许昌|新乡/.test(byId('d28-wuhan-beijing')?.backupA || '') && /石家庄东/.test(byId('d28-wuhan-beijing')?.backupB || ''));
}

if (dailyChargePlans) {
  check('存在28天逐点SOC表且日序唯一', dailyChargePlans.length === 28 && dailyChargePlans.every((plan, index) => plan.day === index + 1));
  check('每一天都关联有效冗余路段', dailyChargePlans.every(plan => chargeSegments?.some(segment => segment.id === plan.segment)));
  for (const plan of dailyChargePlans) {
    const nodesComplete = Array.isArray(plan.nodes) && plan.nodes.length >= 2 && plan.nodes.every(node => Array.isArray(node) && node.length === 6 && node.every(value => String(value ?? '').trim()));
    check(`D${plan.day}逐点补能含点位/SOC/角色/动作`, nodesComplete && String(plan.redline || '').trim());
  }
  check('D19逐点表设S318硬退出', /S318/.test(dailyChargePlans[18].nodes.flat().join('')) && /不回切G315/.test(dailyChargePlans[18].redline));
  check('D28逐点表有两次主充与疲劳退出', dailyChargePlans[27].nodes.filter(node => /主充/.test(node[4])).length === 2 && /疲劳|午夜/.test(dailyChargePlans[27].redline));
}

if (dailyDiningPlans) {
  check('存在28天逐日餐饮卡且日序唯一', dailyDiningPlans.length === 28 && dailyDiningPlans.every((plan, index) => plan.day === index + 1));
  for (const plan of dailyDiningPlans) {
    const complete = Array.isArray(plan.meals) && plan.meals.length && plan.meals.every(meal =>
      String(meal.name || '').trim() && ['strong', 'small', 'live'].includes(meal.level) &&
      String(meal.dishes || '').trim() && String(meal.execution || '').trim() && /^https?:\/\//.test(meal.source || '') && /^https?:\/\//.test(meal.nav || ''));
    check(`D${plan.day}餐饮卡含评分边界/菜品/携宠动作/链接`, complete && String(plan.fallback || '').trim());
    for (const meal of plan.meals || []) {
      if (meal.score !== null) check(`D${plan.day} ${meal.name} 分数≥4.5`, Number(meal.score) >= 4.5 && Number(meal.score) <= 5);
      if (meal.level === 'strong') check(`D${plan.day} ${meal.name} 稳健样本≥20`, Number(meal.reviews) >= 20);
      if (meal.level === 'live') check(`D${plan.day} ${meal.name} 未虚构实时分`, meal.score === null && meal.reviews === null);
    }
  }
  check('格尔木16条评价按小样本处理', dailyDiningPlans[18].meals.some(meal => /振华手抓/.test(meal.name) && meal.reviews === 16 && meal.level === 'small'));
  check('成都和武汉朋友餐随新日序同步', dailyDiningPlans[23].meals.some(meal => /GILI/.test(meal.name)) && dailyDiningPlans[26].meals.some(meal => /香钿楚菜/.test(meal.name) && /不尝试带犬堂食|禁止携犬/.test(meal.execution)));
}

check('大众点评权重为65%且携程为35%', /const\s+DINING_WEIGHTS\s*=\s*\{dianping:0\.65,trip:0\.35\}/.test(html));
check('大众点评分店匹配数据合法', diningMatches?.length >= 9 && diningMatches.every(item => /^https?:\/\//.test(item.url || '') && item.verified === '2026-07-19'));

if (budgetItems) {
  const min = budgetItems.reduce((sum, item) => sum + Number(item.min || 0), 0);
  const max = budgetItems.reduce((sum, item) => sum + Number(item.max || 0), 0);
  check('预算结构含18晚住宿、9晚驻车和28天餐饮', budgetItems.some(item => item.name === '住宿18晚') && budgetItems.some(item => item.name === '营地/驻车9晚') && budgetItems.some(item => item.name === '餐饮28天'));
  check('预算分项可自动求和', min > 0 && max > min && /id="budgetTotal"/.test(html), `¥${min}–${max}`);
}

check('主计划具有全程道路风险对照', /全程道路风险对照/.test(html) && /G6\/G7北京—额济纳/.test(html) && /G315水上雅丹长廊/.test(html) && /G5013\/G5021\/G50/.test(html) && /G4武汉—信阳—北京/.test(html));
check('路线风险依据包含本轮关键来源', /news\.sina\.com\.cn\/c\/2026-06-28/.test(html) && /gs\.people\.com\.cn\/n2\/2025\/0705/.test(html) && /article_2026060410312761689/.test(html) && /article_2026061509121890081/.test(html) && /1035554569_121106884/.test(html));
check('核验记录已同步V27及全路段对照', /^# 信息核验记录 · V27/m.test(verification) && /28天、12,855km/.test(verification) && /全程道路对照与V26决策/.test(verification) && /大众点评65%＋携程\/Trip 35%/.test(verification));
check('需求归档已登记V26与V27', /\*\*V26（07-19）固定车宿点、充电闭环与D27北上\*\*/.test(archive) && /\*\*V27（07-20）D5\/D6按委托人要求重排/.test(archive) && /28天、12,855km/.test(archive));

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
check('HTML不存在重复ID', new Set(ids).size === ids.length);
const blankLinks = [...html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].map(match => match[0]);
check('所有新窗口链接都有noopener', blankLinks.every(tag => /\brel="[^"]*noopener[^"]*"/.test(tag)));
const localLinks = [...html.matchAll(/href="([^"]+\.(?:md|html))"/g)].map(match => match[1]).filter(href => !/^https?:/.test(href));
check('页面引用的本地文件均存在', localLinks.every(href => fs.existsSync(path.join(root, decodeURIComponent(href)))));
check('页面具备tab/tabpanel无障碍语义', /<nav[^>]*role="tablist"/.test(html) && /role="tab"/.test(html) && /role="tabpanel"/.test(html) && /:focus-visible/.test(html));
check('页面具备移动端与减动效适配', /@media\(max-width:760px\)/.test(html) && /@media\(max-width:390px\)/.test(html) && /prefers-reduced-motion/.test(html));
check('主版本标识全部为V27执行基线', /EXPEDITION CONTROL \/ V27/.test(html) && /当前执行版本：V27/.test(html) && /当前行程执行基线与页面版本均为 V27/.test(html));
check('当前执行区不再声称27天或8晚床车', !/推荐版共27天/.test(html) && !/当前版本8晚床车/.test(html));
check('逐日页日期和筛选已同步到D28', /8月28日（周五）到家/.test(html) && />全部 28 天<\//.test(html));
check('仪表盘阶段终点已同步到阿勒泰', /range:"D1–D6",\s+sub:"北京→阿勒泰"/.test(html));
check('当前执行页脚和徽章已同步V27', /\.mission-note::before\{content:"V27"/.test(html) && /V27固定车宿点、逐日补能与双源餐饮执行表/.test(html));
check('9个车宿点全部固定且充后移车', ['库尔勒服务区','米兰服务区','花土沟服务区','格尔木新区旅游集散中心自驾车营地','茶卡服务区','武都服务区','大足石刻服务区','恩施服务区','信阳服务区'].every(name => html.includes(name)) && /充电后移|充后移/.test(html));
check('当前执行版无狗证件办理任务', !/cert-out|cert-return/.test(html) && !/办理去程.*动物|办理返程.*动物/.test(html) && /不安排、携带或办理任何狗证件/.test(html));
check('行程条和地图仍由结构化数据渲染', /id="tlTrack"/.test(html) && /id="routeMap"/.test(html) && /function\s+renderMissionDashboard/.test(html));
check('所有主导航项声明SVG图标', /const\s+ICONS\s*=/.test(html) && [...html.matchAll(/<button\b[^>]*role="tab"[^>]*>/g)].every(match => /data-icon="[^"]+"/.test(match[0])));

console.log(`\n校验完成：${passes}项通过，${failures.length}项失败。`);
if (failures.length) {
  console.error(failures.map(item => `- ${item}`).join('\n'));
  process.exit(1);
}
