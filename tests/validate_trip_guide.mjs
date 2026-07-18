import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, '大北疆带狗自驾攻略.html');
const briefPath = path.join(root, '全程行程简报.md');
const html = fs.readFileSync(htmlPath, 'utf8');
const brief = fs.readFileSync(briefPath, 'utf8');
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
  check('固定27天且日序唯一', days.length === 27 && new Set(days.map(day => day.d)).size === 27);
  check('日期唯一', new Set(days.map(day => day.date)).size === 27);
  check('D3为额济纳到敦煌', /额济纳.*敦煌/.test(days[2]?.title || ''));
  check('D1改住巴彦淖尔维也纳国际酒店并保留电话', /维也纳国际酒店/.test(days[0]?.stay || '') && /04788259998/.test(days[0]?.stay || ''));
  check('D2改住额济纳旗尚景酒店并保留电话', /额济纳旗尚景酒店/.test(days[1]?.stay || '') && /04836529358/.test(days[1]?.stay || ''));
  check('D3改住敦煌家天下民宿并保留双联系电话', /家天下民宿.*鸣沙山月牙泉景区店/.test(days[2]?.stay || '') && /18437722550/.test(days[2]?.stay || '') && /17709370998/.test(days[2]?.stay || ''));
  check('D4改住哈密星旺宾馆主店并保留电话地址', /哈密星旺宾馆/.test(days[3]?.stay || '') && /中旺路24号/.test(days[3]?.stay || '') && /09026975888/.test(days[3]?.stay || ''));
  check('D4完整行驶S240和S245到哈密', /敦煌/.test(days[3]?.title || '') && /哈密/.test(days[3]?.title || '') && /S240.*S245/.test(days[3]?.route || ''));
  check('D5大海道哈密端往返后走G7北线到木垒', /哈密.*大海道.*木垒/.test(days[4]?.title || '') && days[4]?.km === 850 && /红柳滩/.test((days[4]?.play || []).join('')) && /全程穿越.*四驱|四驱越野无人区/.test(days[4]?.route || ''));
  check('D5不依赖红柳滩充电且有低底盘退出方案', /不依赖红柳滩|不依赖景区内充电|景区内不依赖/.test(`${days[4]?.decision || ''} ${(days[4]?.charge || []).join(' ')}`) && /折返/.test(days[4]?.decision || '') && /搓板|翼龙/.test(days[4]?.decision || ''));
  check('D5木垒住宿标注两只边牧需电话落实', /木垒/.test(days[4]?.stay || '') && /电话确认|待电话|电话落实/.test(days[4]?.stay || '') && /奇台/.test(days[4]?.stay || ''));
  check('D6走G7北线经阜康到阿勒泰并使用S21官方充电备选', /木垒.*阜康.*S21.*阿勒泰/.test(days[5]?.title || '') && days[5]?.km === 690 && /克拉美丽/.test((days[5]?.charge || []).join('')) && /五家渠/.test((days[5]?.charge || []).join('')) && /吉利湖/.test((days[5]?.charge || []).join('')));
  check('D6不把黄花沟作为充电点', /不把黄花沟当充电点/.test(days[5]?.decision || ''));
  check('D6明确不走G30南线并保留阿勒泰友谊宾馆', /阿勒泰友谊宾馆/.test(days[5]?.stay || '') && /09062315888/.test(days[5]?.stay || '') && /不走G30|不.*G30/.test(`${days[5]?.route || ''} ${(days[5]?.tips || []).join('')}`));
  check('D7阿勒泰经布尔津补电进禾木', /阿勒泰.*布尔津.*禾木/.test(days[6]?.title || '') && /用户已确认.*边牧.*带入禾木村/.test((days[6]?.play || []).join('')));
  check('D7入住牧雅居民宿并保留双联系电话', /牧雅居民宿.*落日观景台店/.test(days[6]?.stay || '') && /18126209839/.test(days[6]?.stay || '') && /17844447778/.test(days[6]?.stay || ''));
  check('D8禾木经布尔津到乌尔禾并入住柏纳', /禾木.*布尔津.*乌尔禾/.test(days[7]?.title || '') && days[7]?.km === 410 && /柏纳酒店.*世界魔鬼城店/.test(days[7]?.stay || '') && /15009906218/.test(days[7]?.stay || '') && /09907561820/.test(days[7]?.stay || '') && /200元/.test(days[7]?.stay || ''));
  check('D9乌尔禾到赛湖东门并入住赛官房', /乌尔禾.*赛里木湖东门/.test(days[8]?.title || '') && days[8]?.km === 420 && /赛官房民宿.*东门游客中心店/.test(days[8]?.stay || '') && /09092222000/.test(days[8]?.stay || '') && /无早餐/.test(days[8]?.stay || ''));
  check('D10赛湖东门进南门出经薰衣草园到伊宁', /东门进.*南门出.*薰衣草园.*伊宁/.test(days[9]?.title || '') && days[9]?.km === 170 && /不(?:要)?预设顺时针或逆时针/.test((days[9]?.play || []).join('')) && /栖云馆民宿/.test(days[9]?.stay || '') && /13899730840/.test(days[9]?.stay || ''));
  check('D10提示八月薰衣草花况风险', /6—7月|6-7月/.test(`${days[9]?.decision || ''} ${(days[9]?.play || []).join('')}`) && /前一天/.test(`${days[9]?.decision || ''} ${(days[9]?.tips || []).join('')}`));
  check('D11取消八卦城改经巩留到库尔德宁那拉提并入住悠然民宿', /伊宁.*巩留.*库尔德宁.*那拉提/.test(days[10]?.title || '') && days[10]?.km === 350 && /悠然民宿.*第1晚/.test(days[10]?.stay || '') && /15886986899/.test(days[10]?.stay || '') && /0999-7758580/.test((days[10]?.play || []).join('')) && /单向环线|不可折返/.test(`${days[10]?.decision || ''} ${(days[10]?.play || []).join('')}`));
  check('D12深度游那拉提并保留携宠失败替代', /那拉提草原深度游/.test(days[11]?.title || '') && days[11]?.km === 80 && /智游那拉提/.test((days[11]?.play || []).join('')) && /狗不去＝我们不去/.test(days[11]?.decision || '') && /悠然民宿.*第2晚/.test(days[11]?.stay || ''));
  check('D13唐布拉住宿具备充电主备且纠正仙女湖直达', /那拉提.*乔尔玛.*唐布拉.*蜜蜂小镇/.test(days[12]?.title || '') && days[12]?.km === 180 && /听泉别院/.test(days[12]?.stay || '') && /19326665500/.test(days[12]?.stay || '') && /特来电/.test((days[12]?.charge || []).join('')) && /星星充电/.test((days[12]?.charge || []).join('')) && /不是.*直达/.test((days[12]?.play || []).join('')));
  check('D14从唐布拉走独库北段到乌鲁木齐并算清时间账', /唐布拉.*乔尔玛.*独库北段.*独山子.*乌鲁木齐/.test(days[13]?.title || '') && days[13]?.km === 520 && /08:00–10:00/.test(`${days[13]?.decision || ''} ${(days[13]?.tips || []).join('')}`) && /约140km/.test((days[13]?.play || []).join('')) && /280km/.test((days[13]?.play || []).join('')) && /G577/.test(`${days[13]?.decision || ''} ${(days[13]?.tips || []).join('')}`) && /缘来如玉民宿/.test(days[13]?.stay || ''));
  check('D15乌鲁木齐带狗深度休整并在缘来如玉续住', /乌鲁木齐.*深度休整/.test(days[14]?.title || '') && days[14]?.km === 100 && /缘来如玉民宿第2晚/.test(days[14]?.stay || '') && /公园.*禁止携犬|禁犬/.test(`${days[14]?.decision || ''} ${(days[14]?.play || []).join('')}`));
  check('D16送机后直达库尔勒并开始第一晚床车', /乌鲁木齐送机.*天山胜利隧道.*库尔勒/.test(days[15]?.title || '') && days[15]?.km === 430 && /永丰服务区/.test((days[15]?.charge || []).join('')) && /床车第1晚/.test(days[15]?.stay || '') && /候机室禁止犬只进入/.test((days[15]?.play || []).join('')));
  check('D17到若羌并建立城区三层补能', /库尔勒.*若羌/.test(days[16]?.title || '') && /28个充电终端/.test(days[16]?.decision || '') && /备选A\/B/.test((days[16]?.charge || []).join('')));
  check('D18若羌到茫崖是最大补能风险段', /若羌.*茫崖/.test(days[17]?.title || '') && /最大补能风险段/.test(days[17]?.decision || '') && /不依赖依吞布拉克/.test((days[17]?.charge || []).join('')) && /月球星空房车营地/.test(days[17]?.stay || ''));
  check('D19水上雅丹后同日到大柴旦且具备Tesla双备', /茫崖.*水上雅丹.*大柴旦/.test(days[18]?.title || '') && days[18]?.km === 600 && /14:30/.test(days[18]?.decision || '') && /怡景大酒店特斯拉/.test((days[18]?.charge || []).join('')) && /床车第4晚/.test(days[18]?.stay || ''));
  check('D20经德令哈茶卡青海湖到西宁并改住宠物友好酒店', /大柴旦.*德令哈.*茶卡.*青海湖.*西宁/.test(days[19]?.title || '') && days[19]?.km === 730 && /不在环湖公路两侧停车或露营/.test(days[19]?.decision || '') && /西宁中惠万达/.test((days[19]?.charge || []).join('')) && /青滨壹号/.test(days[19]?.stay || '') && !days[19]?.tags?.includes('car'));
  check('D21西宁经G75到陇南具备太石和城市补能', /西宁.*兰州.*陇南/.test(days[20]?.title || '') && days[20]?.km === 730 && /太石服务区/.test((days[20]?.charge || []).join('')) && /床车第5晚/.test(days[20]?.stay || ''));
  check('D22陇南经广元到成都并改住宠物友好酒店', /陇南.*广元.*成都/.test(days[21]?.title || '') && days[21]?.km === 500 && /广元/.test((days[21]?.charge || []).join('')) && /希尔顿惠庭/.test(days[21]?.stay || '') && !days[21]?.tags?.includes('car'));
  check('D23成都休整并与朋友吃饭', /成都.*休整.*朋友吃饭/.test(days[22]?.title || '') && /双流萌宠乐园|Canpet犬岛公园/.test((days[22]?.play || []).join('')) && /与成都朋友吃一顿/.test(days[22]?.food || '') && /床车第6晚/.test(days[22]?.stay || ''));
  check('D24成都到恩施为山地长途且有三层补能', /成都.*恩施/.test(days[23]?.title || '') && days[23]?.km === 720 && /南充|广安/.test((days[23]?.charge || []).join('')) && /石柱|利川/.test((days[23]?.charge || []).join('')) && /床车第7晚/.test(days[23]?.stay || ''));
  check('D25恩施经宜昌到武汉改住宠物友好酒店并实测肩高', /恩施.*宜昌.*武汉/.test(days[24]?.title || '') && days[24]?.km === 520 && /61cm/.test((days[24]?.tips || []).join('')) && /徐东希尔顿惠庭/.test(days[24]?.stay || '') && !days[24]?.tags?.includes('car'));
  check('D26武汉休整会友并保留61cm硬门槛', /武汉.*休整.*朋友吃饭/.test(days[25]?.title || '') && /61cm/.test(days[25]?.decision || '') && /武昌万象城.*KIC PARK/.test((days[25]?.play || []).join('')) && /床车第8晚/.test(days[25]?.stay || ''));
  check('D27武汉返北京且石家庄疲劳退出', /武汉.*北京/.test(days[26]?.title || '') && days[26]?.km === 1180 && /石家庄.*19:00/.test(days[26]?.decision || '') && /信阳\/驻马店/.test((days[26]?.charge || []).join('')));
  const km = days.reduce((sum, day) => sum + Number(day.km || 0), 0);
  check('逐日里程13020km并由页面承载自动汇总', km === 13020 && /id="totalKm"/.test(html), `当前合计${km}km`);
  check('住宿结构为18晚住宿和8晚床车', /18晚住宿/.test(html) && /8晚管理营地睡车/.test(html) && days.filter(day => day.tags?.includes('car')).length === 8);

  const briefRows = new Map(
    [...brief.matchAll(/^\| D(\d+) [^|]*\|[^|]*，(\d+)km \|/gm)]
      .map(match => [Number(match[1]), Number(match[2])])
  );
  check('简报包含完整27天里程表', briefRows.size === 27, `当前${briefRows.size}天`);
  for (const day of days) {
    check(`简报D${day.d}里程与网页一致`, briefRows.get(day.d) === day.km, `网页${day.km}km，简报${briefRows.get(day.d) ?? '缺失'}km`);
  }
}

check('简报执行版本和总览与网页一致', /执行版本：V15/.test(brief) && /27天/.test(brief) && /13,020km/.test(brief) && /18晚酒店\/民宿＋8晚/.test(brief));

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
  '当前执行基线为 V9',
  '现有公安厅页面为公开征求意见稿',
  '独库北段预约信息不可当作最终公告',
  '不进入禾木景区',
  '禾木 / 五彩滩</b></td><td class="no"',
  '阿禾公路精华段 → 布尔津',
  '鄯善县宠物友好酒店（待补名称）',
  '北屯市宠物友好酒店（待补名称）',
  '禾木老村宠物友好民宿（待补名称/电话）',
  '当前执行基线为 V10',
  'cert-back-xj',
  'cert-back-qh'
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
  check('S21终点为阿勒泰且官方站含克拉美丽五家渠吉利湖', s21 && /阿勒泰/.test(s21.route) && /克拉美丽/.test(`${s21.primary} ${s21.backupA} ${s21.backupB}`) && /五家渠/.test(`${s21.primary} ${s21.backupA} ${s21.backupB}`) && /吉利湖/.test(`${s21.primary} ${s21.backupA} ${s21.backupB}`) && /黄花沟只休息/.test(s21.fallback));
  const hemu = chargeSegments.find(segment => /禾木/.test(segment.route));
  check('禾木补能不依赖景区内快充', hemu && /不承诺禾木|不依赖禾木/.test(`${hemu.evidence} ${hemu.fallback}`));
  const d9Saihu = chargeSegments.find(segment => segment.days === 'D9' && /赛里木湖东门/.test(segment.route));
  check('D9赛湖东门住宿前具备三层补能并为次日留电', d9Saihu && /克拉玛依|奎屯/.test(d9Saihu.primary) && /精河/.test(d9Saihu.backupA) && /五台|东门/.test(d9Saihu.backupB) && /次日环湖/.test(d9Saihu.fallback));
  const d10Saihu = chargeSegments.find(segment => segment.days === 'D10' && /南门.*霍城.*伊宁/.test(segment.route));
  check('D10赛湖南门后以清水河霍城和伊宁补能', d10Saihu && /东门|五台/.test(d10Saihu.primary) && /清水河|霍城/.test(d10Saihu.backupA) && /伊宁/.test(d10Saihu.backupB) && /果子沟/.test(d10Saihu.fallback));
  const d11Yili = chargeSegments.find(segment => segment.days === 'D11' && /巩留.*库尔德宁.*那拉提/.test(segment.route));
  check('D11伊宁到那拉提具备巩留那拉提补能备选', d11Yili && /伊宁/.test(d11Yili.primary) && /巩留/.test(d11Yili.backupA) && /那拉提/.test(d11Yili.backupB));
  const d13Tangbula = chargeSegments.find(segment => segment.days === 'D13' && /唐布拉|蜜蜂小镇/.test(segment.route));
  check('D13唐布拉过夜补能有住宿和公共桩三层冗余', d13Tangbula && /听泉别院/.test(d13Tangbula.primary) && /特来电/.test(d13Tangbula.backupA) && /星星充电|驴充充/.test(d13Tangbula.backupB) && /不在唐布拉过夜/.test(d13Tangbula.fallback));
  const d14Duku = chargeSegments.find(segment => segment.days === 'D14' && /独库北段.*乌鲁木齐/.test(segment.route));
  check('D14独库以独山子主充毛溜沟应急奎屯备选', d14Duku && /独山子/.test(d14Duku.primary) && /毛溜沟/.test(d14Duku.backupA) && /奎屯/.test(d14Duku.backupB) && /单一山中桩/.test(d14Duku.fallback));
  const d16Korla = chargeSegments.find(segment => /D15–D16/.test(segment.days) && /G0711.*库尔勒/.test(segment.route));
  check('D16乌尉高速以永丰为主并送机后直达库尔勒', d16Korla && /永丰/.test(d16Korla.primary) && /乌鲁木齐/.test(d16Korla.backupA) && /库尔勒/.test(d16Korla.backupB));
  const d18Mangya = chargeSegments.find(segment => segment.days === 'D18' && /若羌.*茫崖/.test(segment.route));
  check('D18若羌到茫崖不依赖无服务区路段', d18Mangya && /花土沟/.test(d18Mangya.primary) && /第二处/.test(d18Mangya.backupA) && /月球星空|第三处/.test(d18Mangya.backupB) && /不依赖依吞布拉克/.test(d18Mangya.fallback));
  const d19Yadan = chargeSegments.find(segment => segment.days === 'D19' && /水上雅丹.*大柴旦/.test(segment.route));
  check('D19水上雅丹可跳过且大柴旦Tesla落地', d19Yadan && /大柴旦怡景/.test(d19Yadan.primary) && /花土沟/.test(d19Yadan.backupA) && /大柴旦/.test(d19Yadan.backupB) && /跳过水上雅丹/.test(d19Yadan.fallback));
  const qinghai = chargeSegments.find(segment => segment.days === 'D20' && /青海湖.*西宁/.test(segment.route));
  check('D20青海段不依赖景区桩且以西宁Tesla收尾', qinghai && /德令哈/.test(qinghai.primary) && /茶卡|共和/.test(qinghai.backupA) && /西宁/.test(qinghai.backupB) && /不在环湖路边驻车/.test(qinghai.fallback));
  const chengdu = chargeSegments.find(segment => segment.days === 'D22–D23' && /成都/.test(segment.route));
  check('D22-D23成都段具备广元绵阳成都三层补能', chengdu && /广元/.test(chengdu.primary) && /绵阳/.test(chengdu.backupA) && /成都/.test(chengdu.backupB));
  const wuhan = chargeSegments.find(segment => segment.days === 'D25–D26' && /武汉/.test(segment.route));
  check('D25-D26武汉段具备宜昌荆州武汉三层补能', wuhan && /宜昌/.test(wuhan.primary) && /荆州/.test(wuhan.backupA) && /武汉/.test(wuhan.backupB));
  const home = chargeSegments.find(segment => segment.days === 'D27' && /武汉.*北京/.test(segment.route));
  check('D27返京保留G4三段补能和石家庄疲劳退出', home && /信阳|驻马店/.test(home.primary) && /郑州|新乡/.test(home.backupA) && /石家庄|保定/.test(home.backupB) && /19:00/.test(home.fallback));
  check('拥堵只切同城或沿线备选而非默认绕行', chargeSegments.every(segment => /20分钟|不可用|无法确认|低于20%/.test(segment.trigger)));
}

const budgetItems = extractArray('BUDGET_ITEMS');
check('存在 BUDGET_ITEMS 结构化预算', Array.isArray(budgetItems));
if (budgetItems) {
  const min = budgetItems.reduce((sum, item) => sum + item.min, 0);
  const max = budgetItems.reduce((sum, item) => sum + item.max, 0);
  check('预算上下限可由分项求和', min > 0 && max > min && /id="budgetTotal"/.test(html), `¥${min}–${max}`);
  check('预算包含18晚住宿与8晚合法营地', budgetItems.some(item => item.name === '住宿18晚') && budgetItems.some(item => item.name === '营地/驻车8晚') && budgetItems.every(item => !/条件营地|备用酒店/.test(item.name)));
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
