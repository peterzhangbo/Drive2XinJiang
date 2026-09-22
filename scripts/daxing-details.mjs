import fs from 'node:fs';
import path from 'node:path';

export const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export const contact = value => esc(value).replace(/(?<![\d\w/])(?:1[3-9]\d{9}|0\d{2,3}-?\d{7,8}|400-?\d{3}-?\d{4}|12328)(?!\d)/g, number => `<a class="phone" href="tel:${number.replaceAll('-', '')}">${number}</a>`);
export const mapLink = name => `<a target="_blank" rel="noopener noreferrer" href="https://uri.amap.com/search?keyword=${encodeURIComponent(name)}&amp;callnative=1">地图搜：${esc(name)}</a>`;

// 仅渲染本项目自有Markdown的有限语法；不接受原始HTML。
function inline(value) {
  const links = [];
  const text = value.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|[^\s/()]+\.md)\)/g, (_, label, url) => {
    links.push(`<a href="${esc(url)}"${url.endsWith('.md') && !url.startsWith('http') ? '' : ' target="_blank" rel="noopener noreferrer"'}>${esc(label)}</a>`);
    return `LINKTOKEN${links.length - 1}END`;
  });
  return contact(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/LINKTOKEN(\d+)END/g, (_, index) => links[Number(index)]);
}

export function renderMarkdown(text) {
  const lines = text.split('\n');
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || /^# /.test(line)) continue;
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++].trim().slice(1, -1).split('|').map(x => x.trim()));
      i--;
      const [head, separator, ...body] = rows;
      if (!separator || separator.length !== head.length || !separator.every(cell => /^:?-{3,}:?$/.test(cell)) || body.some(row => row.length !== head.length)) throw new Error('Markdown表格缺少表头分隔行或列数不一致，停止发布');
      const rowPrefix = head[1]?.startsWith('主补能顺序') ? 'charge-day-' : head[1] === '午餐安排' ? 'meal-day-' : '';
      result.push(`<div class="table-scroll" tabindex="0" role="region" aria-label="${esc(head[0])}资料表，可横向滚动"><table><thead><tr>${head.map(x => `<th scope="col">${inline(x)}</th>`).join('')}</tr></thead><tbody>${body.map(row => `<tr${rowPrefix ? ` id="${rowPrefix}${row[0].replace('D','')}"` : ''}>${row.map(x => `<td>${inline(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    } else if (/^#{2,3} /.test(line)) {
      result.push(`<h3>${inline(line.replace(/^#+ /, ''))}</h3>`);
    } else if (/^- /.test(line)) {
      const items = [];
      while (i < lines.length && lines[i].startsWith('- ')) items.push(lines[i++].slice(2));
      i--;
      result.push(`<ul>${items.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`);
    } else result.push(`<p${line.startsWith('> ') ? ' class="note"' : ''}>${inline(line.replace(/^> /, ''))}</p>`);
  }
  return result.join('\n');
}

export function extras(trip, dir) {
  const minimum = trip.days.reduce((sum, day) => sum + day.kmRange[0], 0);
  const maximum = trip.days.reduce((sum, day) => sum + day.kmRange[1], 0);
  const electricityMin = Math.round((minimum * .22 * 1.1 + 5) * 1.2 / 10) * 10;
  const electricityMax = Math.round((maximum * .28 * 1.15 + 10) * 2 / 10) * 10;
  const budget = [
    ['两人餐饮', 2080, 3380, '13天×160–260；赶路日节省可留作城镇餐费'],
    ['充电', electricityMin, electricityMax, `${minimum}–${maximum}km，22–28kWh/100km，加10–15%损耗和5–10kWh一夜暖风；1.2–2元/kWh假设`],
    ['道路通行', 1100, 1800, '保守占位预算，不扣尚未核实的节假日优惠'],
    ['门票/接驳', 700, 1600, '两人总预留，不是官方票价；拒犬项目不购买'],
    ['停车', 150, 400, '全程预算'], ['双犬额外接待与用品', 300, 800, '不代表每店收费；原有狗粮常规支出另计'],
    ['补给杂费', 300, 600, '非重复计算日常餐饮'], ['应急备用金', 2000, 3000, '未花不计实际支出；大额救援可能超出']
  ];
  const total = budget.reduce((sum, row) => [sum[0] + row[1], sum[1] + row[2]], [0, 0]);
  const tasks = [
    ['roads-v07', '9/23预核，9/28根河复核', '根满与伊克萨玛—白鹿岛机动车通行、桥涵、防火及车种限制', '满归镇0470-5374908；问主管管理站。失败走D4–D6备线。'],
    ['north-energy-v07', '9/23预核，9/28最终决策', 'D5满归经白鹿岛到莫尔道嘎≥25%，及D6室韦到站余量', '先核D5整段车机预测及可验证中站，再核莫尔道嘎实际可用补能；C22仅设施线索。住宿不在此待办范围，夜充不解决到站前缺电。未闭环不从根河北上。'],
    ['outbound-v06', '9/24出发前', 'D1/D2每段主站、独立备站、同向入口与间距', '车机/运营App保存完整站名与导航公里；锡林浩特—霍林郭勒、霍林郭勒—阿尔山中站与恩和跨夜补能未闭环不得盲跑。'],
    ['train-v07', '9/29，9/30出发前复核', '莫尔道嘎小火车班次、两犬同乘与最晚离园时间', '约90分钟仅历史乘坐参考，购票候车共预留2.5–3小时；拒犬/排队挤占白天转场即取消。'],
    ['border', '9/30晚与10/1晨', '卡线九卡—七卡—五卡与黑山头主备补能', '12328转属地；未通过走额尔古纳补给内线，必要时住额尔古纳。'],
    ['lake', '10/2', 'D9小河口入口、两犬及两段充电/日照预算', '新左旗C14、伊尔施C15提前核；超17:00先删湖，仍超时改停宿。'],
    ['park', '9/23预核，10/2复核', '阿尔山：已有历史携犬实证，补核2026双犬与两日车权', '4000151757 / 0482-7155555；重点问双成年边牧与10/4、10/5车辆资格，不再从零判断有无携犬案例；拒犬项目删。'],
    ['park-charge', '9/23预核，10/3复核', 'D10–D11到C23御荣超充的两天电量', 'C23已核市区3桩250kW、全天；按两天总里程和暖风算到站≥25%，不足删远端点或补实中站，不擅改住宿。'],
    ['return', '10/5', 'D12山路中站、普通路日照窗与D13南向主备', '车机逐段预演，查草不默认开放；不足缩短停宿，允许延后到家。'],
    ['pet-emergency', '9/24，并到城复核', '沿线实际可接诊宠物医院、时间、电话', '目前没有已核24小时急诊；当地核机构与地址，不把呼和浩特海拉尔东街当海拉尔。']
  ];
  const checklist = ['下载离线地图并保存充电入口截图', '核对车内两人两犬乘坐、保暖与休息空间', '轮胎、制动、雨刷与随车工具检查', '带本人身份证、驾驶证、车辆行驶证及保险救援联系方式', '原日粮15天、两天人犬食水与应急餐', '人犬牵引保暖、防雨、照明与清洁用品', '共享每日落点及迟到联络约定', '核天气与下一已验证充电站，拒绝林路夜驾'];
  const html = `<section id="verification" class="reference"><h2>本轮核验 · 已查实与剩余缺口</h2>${renderMarkdown(fs.readFileSync(path.join(dir, '核验进展.md'), 'utf8'))}</section>
  <section id="execution" class="reference"><h2>执行细节 · 补能、吃饭、玩法与退路</h2><p>表格在手机上可横向滑动；点位来源和电话集中在下一节。所有时间窗口为安排，不是实时抵达预报。</p>${renderMarkdown(fs.readFileSync(path.join(dir, '执行细节与应急.md'), 'utf8'))}</section>
  <section id="directory" class="reference"><h2>点位台账 · 充电 / 餐饮 / 来源</h2>${renderMarkdown(fs.readFileSync(path.join(dir, '出行落实清单.md'), 'utf8'))}</section>
  <section id="budget"><h2>预算与里程</h2><p><strong>${minimum.toLocaleString('en-US')}–${maximum.toLocaleString('en-US')}km</strong>，按13天估算区间求和；奇乾取消；绕充电和改线另计。取消北穿备线不套用主线总里程。住宿由用户自行安排，以下预算不含住宿费用；暖风预留仅在实际车宿时使用。</p><div class="table-scroll" tabindex="0" role="region" aria-label="预算表，可横向滚动"><table><thead><tr><th>项目</th><th>预算 / 元</th><th>计算依据</th></tr></thead><tbody>${budget.map(row => `<tr><td>${row[0]}</td><td>${row[1]}–${row[2]}</td><td>${row[3]}</td></tr>`).join('')}<tr><th>含备用金合计</th><th id="budget-total">${total[0]}–${total[1]}</th><td>约${(total[0]/10000).toFixed(2)}–${(total[1]/10000).toFixed(2)}万元，两人两犬一车、不含住宿；不是报价</td></tr></tbody></table></div><p>住宿预算由用户单独管理；额外驻车暖风、充电价格和绕行可能抬高本表费用。</p></section>
  <section id="confirm"><h2>确认中心 · 本机保存</h2><p>记录真实回复和复核日期，不替代核实。住宿全部移出待办；下列只记录尚缺的道路、补能和景区权限。上方已核事实不需重复人工确认，动态状态临行复查。手动“已确认”也不自动覆盖景区许可或桩状态。换设备、清理浏览器或浏览器限制存储时记录可能丢失，重要回复另存截图。</p><p id="save-status" role="status" aria-live="polite"></p><div class="confirmation-grid">${tasks.map(([id, date, title, detail]) => `<div class="confirmation"><h3>${esc(title)}</h3><p><b>截止/复核：</b>${esc(date)}</p><p>${contact(detail)}</p><label for="status-${id}">结果</label><select id="status-${id}" data-save="status-${id}"><option value="pending">待核</option><option value="confirmed">已确认（人工记录）</option><option value="failed">不通过 / 执行退路</option></select><label for="note-${id}">回复、联系人、核验日期</label><textarea id="note-${id}" data-save="note-${id}" rows="3" placeholder="记录实际回复；不要填网站推测"></textarea></div>`).join('')}</div><h3>出发装备清单</h3><div class="checklist">${checklist.map((item, i) => `<label><input type="checkbox" data-save="packing-${i}">${esc(item)}</label>`).join('')}</div><p><button type="button" id="print-trip">打印 / 保存PDF（含展开详情）</button></p></section>`;
  return { html, minimum, maximum, total };
}

export const extraStyle = `
/* EXECUTION-V05 */
body{font-size:16px}main{max-width:1280px}.days{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}.day p,.day summary,.day small,.summary p,.road-alert p{font-size:16px}.day .label{font-size:13px}.day h3{font-size:20px}.day{min-width:0}.spot{border-top:1px solid #d7ddce;padding:12px 0}.spot h4{font-size:18px;margin:8px 0}.spot p{margin:8px 0}.attractions{border-left:3px solid var(--gold);padding-left:12px}.section-nav{position:static}.section-nav a,.links a,button{min-height:44px;display:inline-flex;align-items:center}.day summary{min-height:44px}.timeline{padding-left:22px}.timeline li{padding:4px 0}.timeline strong{display:block;color:var(--green)}.day-nav{display:flex;gap:6px;flex-wrap:wrap}.day-nav a{border:1px solid #cad4c5;border-radius:5px;padding:7px 10px;min-height:44px;display:flex;align-items:center;font-size:14px}.table-scroll{overflow-x:auto;border:1px solid #cbd4c2;border-radius:6px;margin:18px 0;max-width:100%}table{border-collapse:collapse;width:100%;min-width:740px;font-size:16px}th,td{padding:14px;text-align:left;vertical-align:top;border-bottom:1px solid #d7ddce}th{background:#e8eddf;color:#254b3e}td{background:#fffef9}tr:last-child td{border-bottom:0}td:first-child{min-width:100px}td a{overflow-wrap:anywhere}.reference h3{font-size:23px;margin-top:32px}.reference p,.reference li{max-width:100%;overflow-wrap:anywhere}.reference li{margin-bottom:12px}.confirmation-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.confirmation{border:1px solid #cbd4c2;border-radius:8px;padding:18px;background:#fffef9;min-width:0}.confirmation h3{margin-top:0;font-size:18px}.confirmation p{font-size:15px}.confirmation label{display:block;margin-top:10px}input,select,textarea,button{font:inherit}select,textarea{width:100%;padding:10px;border:1px solid #91a68d;border-radius:5px;background:white;color:var(--ink)}button{border:0;border-radius:6px;padding:10px 18px;background:var(--green);color:white;cursor:pointer}button:focus-visible,select:focus-visible,textarea:focus-visible,input:focus-visible,.table-scroll:focus-visible{outline:3px solid var(--gold);outline-offset:3px}.checklist label{display:flex;align-items:center;gap:12px;min-height:44px;padding:6px}.checklist input{width:22px;height:22px;flex-shrink:0}.phone{white-space:nowrap}#save-status{min-height:28px;color:#755221}.soc-inputs{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.soc-inputs label{display:grid;gap:6px}.soc-inputs input{width:100%;min-height:44px;padding:8px}.soc-result{border-left:4px solid var(--gold);padding:14px;background:#fff9ed}.intensity{display:flex;gap:6px;align-items:end;height:115px;padding-top:18px}.intensity a{display:flex;align-items:end;justify-content:center;flex:1;background:#d8e4d0;text-decoration:none;font-size:12px;min-width:0;padding-bottom:4px}.intensity .intense{background:#e9cba7}
@media(max-width:780px){.days,.confirmation-grid{grid-template-columns:1fr}.soc-inputs{grid-template-columns:repeat(2,1fr)}main{padding:24px 16px}.day{padding:16px}.hero{grid-template-columns:1fr}.section-nav{gap:6px 16px}.reference h3{font-size:21px}}@media print{body{background:white;color:black;font-size:11pt}main{max-width:none;padding:0}.hero,.grid,.days,.summary,.confirmation-grid{display:block}.hero .route{color:black;background:white;border:1px solid #999}.route p,.route strong{color:black}.section-nav,.day-nav,.links,#print-trip,.soc-inputs{display:none}.day,.confirmation{margin-bottom:15px;break-inside:auto}.table-scroll{overflow:visible;border:0}table{min-width:0;width:100%;font-size:9pt;table-layout:fixed}th,td{padding:6px;overflow-wrap:anywhere}td:first-child{min-width:0}details>*{display:block!important}details::details-content{display:block!important}summary{font-weight:bold}.day p,.day small{font-size:11pt}a{color:black}textarea{min-height:65px}.intensity{display:none}h2,h3{break-after:avoid}.phone{white-space:normal}}
`;

export const calculator = `<div class="card"><h3>用自己的车辆数据重算</h3><p>默认仍为压力情景。预测只用算术，不读取车辆；道路、备用站是否可达需另核。驻车耗能不能填进公里电耗重复计算。</p><div class="soc-inputs">${[['capacity','可用容量 kWh',75,1,200],['soc','起行电量 %',95,0,100],['distance','到下一已核站 km',180,0,1500],['consumption','电耗 kWh/100km',28,1,100],['park','额外驻车耗能 kWh',0,0,100],['reserve','到站底线 %',25,0,100]].map(([id,label,value,min,max])=>`<label for="soc-${id}">${label}<input id="soc-${id}" type="number" value="${value}" min="${min}" max="${max}" step="any"></label>`).join('')}</div><p class="soc-result" id="soc-result" role="status" aria-live="polite"></p></div>`;

export const browserScript = `<script>
(() => {
  const fields = [...document.querySelectorAll('[data-save]')];
  const key = 'daxing-confirm-v05';
  const message = document.getElementById('save-status');
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    fields.forEach(field => { if (saved[field.dataset.save] !== undefined) { if (field.type === 'checkbox') field.checked = saved[field.dataset.save] === true; else field.value = String(saved[field.dataset.save]); } });
    message.textContent = '确认记录仅保存在当前浏览器。';
  } catch { message.textContent = '浏览器不能读取本地记录，本次填写可能无法保存；请另存截图或打印。'; }
  fields.forEach(field => field.addEventListener('input', () => {
    try { const saved = {}; fields.forEach(f => { saved[f.dataset.save] = f.type === 'checkbox' ? f.checked : f.value; }); localStorage.setItem(key, JSON.stringify(saved)); message.textContent = '已保存本机记录 · ' + new Date().toLocaleString('zh-CN'); }
    catch { message.textContent = '未能保存，请另存截图或打印。'; }
  }));
  const inputs = [...document.querySelectorAll('.soc-inputs input')];
  const calculate = () => {
    const values = inputs.map(input => Number(input.value));
    const output = document.getElementById('soc-result');
    if (inputs.some(input => input.value === '' || !input.checkValidity()) || values.some(value => !Number.isFinite(value))) { output.textContent = '请输入范围内的有效数值；可用容量必须大于0。'; return; }
    const [capacity, soc, distance, consumption, park, reserve] = values;
    const used = distance * consumption / 100 + park;
    const arrival = soc - used / capacity * 100;
    const required = used / capacity * 100 + reserve;
    output.textContent = '情景到站 ' + arrival.toFixed(1) + '%；达到底线需起行 ' + required.toFixed(1) + '%。' + (arrival < 0 ? '此情景无法到达，必须缩段或补能。' : arrival < reserve ? '低于所设底线，当前方案不能执行。' : '算术满足所设底线；仍须用车机、天气、独立备站复核。') + (required > 100 ? '所需电量超过100%，不能靠出发前充满解决。' : '');
  };
  inputs.forEach(input => input.addEventListener('input', calculate)); calculate();
  let opened = [];
  window.addEventListener('beforeprint', () => { opened = [...document.querySelectorAll('details')].map(element => [element, element.open]); opened.forEach(([element]) => element.open = true); });
  window.addEventListener('afterprint', () => opened.forEach(([element, wasOpen]) => element.open = wasOpen));
  document.getElementById('print-trip').addEventListener('click', () => window.print());
})();
</script>`;
