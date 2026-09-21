import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contact, mapLink, extras, extraStyle, calculator, browserScript } from './daxing-details.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, '大兴安岭_2026中秋国庆');
const trip = JSON.parse(fs.readFileSync(path.join(dir, '行程数据.json'), 'utf8'));
const old = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const style = old.match(/<style>([\s\S]*?)<\/style>/)?.[1].split('/* EXECUTION-V05 */')[0].trimEnd();
if (!style) throw new Error('缺少现有样式，停止生成。');
const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const labels = { road:'道路与日照', charge:'补能与电量', fallback:'退路与删减', lodging:'住宿与双犬', food:'吃饭安排', checks:'出发前核验' };
const supplement = extras(trip, dir);
const days = trip.days.map(d => `<article class="day${[1,2,4,5,9,12,13].includes(d.day) ? ' high' : ''}" id="day-${d.day}" data-day="${d.day}"><span class="label">D${d.day} / ${d.date} · ${esc(d.type)}</span><h3>${esc(d.route)}</h3><p class="numbers">约 ${esc(d.km)} km · 纯行车 ${esc(d.drive)} h</p><small>含补能休息：${esc(d.total)}｜夜宿：${esc(d.stay)}</small><p>${esc(d.plan)}</p><ol class="timeline">${d.schedule.map(([time, action])=>`<li><strong>${esc(time)}</strong>${esc(action)}</li>`).join('')}</ol><details><summary>展开道路、补电与退路</summary>${['road','charge','fallback'].map(f=>`<p><b>${labels[f]}：</b>${contact(d[f])}</p>`).join('')}<p><a href="#charge-day-${d.day}">今天的充电预计SOC与退路</a> · <a href="#meal-day-${d.day}">今天的午晚餐</a></p></details><details><summary>展开住宿、餐饮与待确认</summary>${['lodging','food','checks'].map(f=>`<p><b>${labels[f]}：</b>${contact(d[f])}</p>`).join('')}<p><a href="#directory">查看点位来源、联系方式</a> · <a href="#confirm">记录确认结果</a></p></details><details><summary>打开地图搜索点位</summary><p>搜索结果需核同名店、行驶方向与入口，不是已测量导航路线。</p><div class="day-nav">${d.navigation.map(mapLink).join('')}</div></details></article>`).join('\n');
const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>大兴安岭 · 满归穿越条件方案 ${trip.version}</title><style>${style}${extraStyle}</style></head><body><main>
<section class="hero"><div><span class="eyebrow">ROAD JOURNAL / ${trip.version} · ${trip.updated}</span><h1>向北穿林，<br>向南看火山。</h1><p>北京 ⇄ 呼伦贝尔与大兴安岭<br>森林穿越 · 界河卡线 · 满洲里 · 阿尔山</p><span class="badge">夫妻二人 · 两只成年边牧</span><span class="badge">Model Y L · 无无人机</span><span class="badge">林区及普通景观路不夜驾</span></div>
<div class="route" aria-label="行程顺序示意，非导航地图"><strong>先北后南，阿尔山留两个整天</strong><div class="line"><p>北京 → 通辽/鲁北 → 牙克石</p><p>莫尔格勒河 → 额尔古纳 → 根河 → 满归</p><p><b>伊克萨玛 → 白鹿岛</b> ⇢ 奇乾条件支线</p><p>临江/室韦 → 卡线 → 黑山头 → 满洲里</p><p>呼伦湖 → 新左旗 → <b>阿尔山三晚</b></p><p>乌兰浩特 → 通辽 → 北京</p></div><small>路线顺序示意，非导航地图；奇乾必要往返，南部干线允许重复。</small></div></section>
<div class="meta"><div><b>13天 / 12晚</b><span>2026年9月25日—10月7日</span></div><div><b>9/29 穿越核心</b><span>条件未满足则不发车</span></div><div><b>10/4–5 阿尔山</b><span>两个完整白天，10/6开始回京</span></div></div>
<p class="note">已按新方案更新。道路、逐段主备充电、双犬住宿尚未全部落实；下方补齐了公开资料、具体联系人和失败退路，不代表已经致电、预订或实测充电。所有公里/时长为排程估算，不是实时导航。</p>
<nav class="links section-nav" aria-label="页面导航"><a href="#changes">路线与强度</a><a href="#gates">先决条件</a><a href="#itinerary">每日行程</a><a href="#energy">电量计算</a><a href="#execution">补能/餐饮/应急</a><a href="#directory">点位与来源</a><a href="#budget">预算</a><a href="#confirm">确认与打印</a></nav>
<section aria-label="每日里程强度"><h2>约${supplement.minimum.toLocaleString('en-US')}–${supplement.maximum.toLocaleString('en-US')}km · 前后赶路，中间慢游</h2><p>每天柱高表示里程上限，不是疲劳指数；林路低里程也可能耗时很长。奇乾和临时绕行另计。</p><div class="intensity">${trip.days.map(d=>`<a href="#day-${d.day}" class="${[1,2,4,5,9,12,13].includes(d.day)?'intense':''}" style="height:${Math.max(35,d.kmRange[1]/1050*100)}%" aria-label="D${d.day}，${esc(d.km)}公里">D${d.day}</a>`).join('')}</div></section>
<section id="changes"><h2>同样13天，重心换了</h2><div class="summary"><section><b>北部 · 加入真正的穿越</b><p>新增根河、满归、伊克萨玛和白鹿岛；奇乾仅条件支线。海拉尔不刻意进城，柴河与恩和专门慢游取消。</p></section><section><b>阿尔山 · 留到旅程后半</b><p>10/3抵达，10/4与10/5完整游玩，三晚可按伊尔施—园内—市区衔接。双犬和自驾权限决定实际景点。</p></section><section><b>代价 · 前后赶路更紧</b><p>前两天均为强度日；返程压到两天，最后一天从旧版约220–280km增至约730–830km，不再有短程返京缓冲。</p></section></div></section>
<section id="gates"><h2>三个先决条件，不能跳过</h2><div class="road-alert"><h3>01 白鹿岛双犬住宿＋跨夜补能：尚未解决</h3><p>白鹿岛酒店公开不可携宠；没有已核可靠夜充。D5与D6不能默认一充覆盖。9/23预确认，9/28在根河做最终决策，三项条件不齐就不执行满归穿越。</p><h3>02 去返程不能按“全程高速”排</h3><p>9/20报道查草高速仍待验收。普通路必须白天完成；赤峰/承德、阿荣旗/牙克石和阿尔山出山段的充电主备仍有空档，未形成完整导航链。</p><h3>03 卡线与阿尔山须单独确认</h3><p>卡线不通或黑山头补能不可靠，就经额尔古纳内线；阿尔山狗不能同行的项目不去。平台宠友标签不等于两只成年边牧已获准。</p><a href="出行落实清单.md">查看截止日、电话、证据和失败后的调整</a></div></section>
<section id="itinerary"><h2>13天，逐日展开</h2><p>棕色顶边为重点强度日；林区与普通景观路原则17:00前结束，天气差更早。D6/D7仍分两天，给慢路、村落和补能留时间。</p><nav class="links" aria-label="选择日期">${trip.days.map(d=>`<a href="#day-${d.day}">D${d.day} ${d.date}</a>`).join('')}</nav><div class="days">${days}</div></section>
<section id="energy"><h2>电量写成条件，不写成保证</h2><div class="grid"><div class="card"><h3>75kWh / 22–28kWh·100km⁻¹</h3><p>仅作压力情景，不是本车容量认定或实测。95%出发跑150km估39–51%；200km估20–36%；230km估9–28%。暖风驻车另计，实际使用车机预测与近期电耗复核。</p></div><div class="card"><h3>高速≥20%，稀疏林区≥25–30%</h3><p>算到下一已验证站的余量，不算到一个地名的余量。主备必须是不同位置且可达可用。充电量、独立备站和D5夜宿未闭环前，不把网站当执行导航。</p></div></div></section>
${calculator}
${supplement.html}
<section id="documents"><h2>随身资料</h2><div class="links"><a href="行程草案.md">完整13天简报</a><a href="出行落实清单.md">充电 / 住宿 / 餐饮 / 联系清单</a><a href="执行细节与应急.md">执行细节与应急</a><a href="基础配置要求.md">同行配置与硬约束</a><a href="信息核验记录.md">版本与核验记录</a></div><p>餐饮继续按大众点评65%＋携程35%；缺点评同店分就标单源，不制造综合分。当前候选尚非全部高分优选。</p></section>
<footer>${trip.version} · ${trip.updated} · 新方案已同步，公开资料不是商家确认。朋友同行方案已取消；新疆归档不变。密码入口和右上角双旅行切换保持原设置。</footer>
</main>${browserScript}</body></html>\n`;
fs.writeFileSync(path.join(dir, 'index.html'), html);
const md = `# 大兴安岭13天行程 · ${trip.version}\n\n> ${trip.updated}｜${trip.status}。公里和时间均为估算。夫妻二人＋两只成年边牧，Model Y L，北京往返。\n\n主线：北京→鲁北方向→牙克石→莫尔格勒河→额尔古纳→根河→满归→伊克萨玛→白鹿岛→临江/室韦→卡线→黑山头→满洲里→呼伦湖一处→新左旗→阿尔山→通辽→北京。奇乾为条件往返，不去漠河/北极村，不专门游柴河和恩和。\n\n白鹿岛双犬住宿与补能尚未解决；去返程桩链有缺口；阿尔山/卡线准入需核。必须先读[出行落实清单](出行落实清单.md)。林区和普通景观公路不夜驾，原则17:00前结束；高速允许适当晚到，不依赖辅助驾驶减少休息。\n\n## 与旧网页V0.3的区别\n\n先北后南，新增满归穿越；阿尔山三晚、两个整天；回程从三天压两天，10/7从约220–280km变成约730–830km，缓冲变少。前两天强度也明显增加，不能同时承诺“松弛”和两天到牙克石。\n\n${trip.days.map(d=>`## D${d.day} · ${d.date} · ${d.type}\n\n**${d.route}**\n\n约${d.km}km｜纯行车${d.drive}小时｜全天${d.total}｜夜宿：${d.stay}\n\n${d.plan}\n\n### 当天节奏\n\n${d.schedule.map(([time, action])=>`- ${time}：${action}`).join('\n')}\n\n地图搜索（并非已核入口）：${d.navigation.map(name=>`[${name}](https://uri.amap.com/search?keyword=${encodeURIComponent(name)}&callnative=1)`).join(' · ')}\n\n${Object.entries(labels).map(([f,l])=>`- ${l}：${d[f]}`).join('\n\n')}\n`).join('\n')}\n## 证据与执行边界\n\n站点C01–C18、酒店地址/链接、评分样本、电话和待确认动作见[落实清单](出行落实清单.md)。电量暂用75kWh、22–28kWh/100km压力情景，不是本车实测；无有效夜充不进D5穿越。所有住宿未预订，所有商家未完成直接联系。\n\n全程约${supplement.minimum}–${supplement.maximum}km，奇乾与绕行另计；10晚酒店＋2晚条件车宿，含备用金预算${supplement.total[0]}–${supplement.total[1]}元。逐日补能、餐饮、景点、备线和应急见[执行细节与应急](执行细节与应急.md)。\n`;
fs.writeFileSync(path.join(dir, '行程草案.md'), md);
console.log(`已从单一行程数据生成${trip.version}网页和13天简报。`);
