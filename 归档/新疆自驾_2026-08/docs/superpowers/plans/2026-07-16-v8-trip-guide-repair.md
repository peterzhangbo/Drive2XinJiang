# 大北疆带狗自驾攻略 V8 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 在不延长18天的前提下把 S240＋S245 纳入必走主线，修复全部已审计问题，并交付可直接阅读的全程简报。

**架构：** 保留单HTML离线交付。用页面内结构化 `DAYS`、`CHARGE_SEGMENTS`、`BUDGET_ITEMS` 作为单一数据源，新增零依赖 Node.js 静态校验；交互问题用真实浏览器回归验证。

**技术栈：** HTML、CSS、原生 JavaScript、Node.js 内置模块、Git、内置浏览器。

## 全局约束

- 最终用户只需打开 `大北疆带狗自驾攻略.html`。
- 总行程固定18天；S240＋S245 是必走主线。
- 不引入 npm 依赖、框架、构建器、后端或在线数据库。
- 未获官方或运营商证明的充电设施不得写成确定可用。
- 所有动态路况、桩况、房态和宠物政策必须保留出发前复核提示。
- 每条修改都必须对应用户要求或既有审计问题。

---

### 任务1：建立零依赖回归校验

**文件：**
- 新建：`tests/validate_trip_guide.mjs`
- 校验：`大北疆带狗自驾攻略.html`

**接口：**
- 输入：HTML文本中的 `DAYS`、`CHARGE_SEGMENTS`、`BUDGET_ITEMS` 常量。
- 输出：逐项 `PASS/FAIL`，失败时进程退出码为1。

- [ ] **步骤1：先写失败校验**

校验至少包含：18天唯一日序、D3/D4/D5新路线、里程汇总、15晚酒店＋2晚条件营地、预算求和、每个充电路段三层备选与触发器、动态事实来源、禁止旧文案、重复ID、`noopener`、本地链接、tab语义、减少动态效果、地图跳转重置筛选、清单保存异常提示。

- [ ] **步骤2：运行并确认正确失败**

运行：`node tests/validate_trip_guide.mjs`

预期：因 `CHARGE_SEGMENTS` / `BUDGET_ITEMS` 缺失、D3-D5仍是旧路线、过期独库文案、缺失 `noopener` 等原因失败。

- [ ] **步骤3：提交测试基线**

运行：

```bash
git add tests/validate_trip_guide.mjs
git commit -m "test: add trip guide regression validator"
```

### 任务2：修正18天路线与动态事实

**文件：**
- 修改：`大北疆带狗自驾攻略.html`
- 修改：`信息核验记录.md`

**接口：**
- `DAYS` 保持18项；D3、D4、D5分别为额济纳→敦煌、敦煌→S240→S245→哈密、哈密→巴里坤→江布拉克。
- 页面中的版本与核验日期统一为 V8 / 2026-07-16。

- [ ] **步骤1：只实现路线和事实最小改动**

更新路线图、逐日卡片、住宿、餐饮、确认任务与信息核验记录；加入敦煌携宠住宿主备；把独库改为2026-07-02正式公告口径；删除“充电全覆盖”“赛湖24桩”“独库桩距小于100km”等未经充分证明的确定性表述。

- [ ] **步骤2：运行校验，确认路线与旧文案项转绿**

运行：`node tests/validate_trip_guide.mjs`

预期：路线/旧事实检查通过；结构化充电、预算与可访问性检查仍失败。

- [ ] **步骤3：提交**

```bash
git add 大北疆带狗自驾攻略.html 信息核验记录.md
git commit -m "fix: add S240 S245 to the 18-day route"
```

### 任务3：补全充电冗余与自动预算

**文件：**
- 修改：`大北疆带狗自驾攻略.html`

**接口：**
- `CHARGE_SEGMENTS: Array<{id,days,route,primary,backupA,backupB,channels,trigger,decisionPoint,fallback,evidence,verified}>`
- `BUDGET_ITEMS: Array<{name,min,max,note}>`
- 页面从上述数组渲染充电表、确认任务和预算汇总。

- [ ] **步骤1：建立充电路段结构并渲染**

覆盖北京—临河、G7临白、额济纳—敦煌、S240/S245、哈密—江布拉克、可可托海、阿禾、乌尔禾、赛湖、伊犁、独库、奎屯—乌市、乌市—哈密和返程。拥堵只触发同城/沿线备选；连续关键站不可用且尚未进入风险段时才允许改线。S240/S245沿线不虚构充电桩。

- [ ] **步骤2：建立预算数组并自动求和**

条件营地/备用酒店使用同一分项，避免重复计费；S245通行费、电量里程变化与安全机动金写入说明。总计由JavaScript计算并同步到总览。

- [ ] **步骤3：运行校验**

运行：`node tests/validate_trip_guide.mjs`

预期：充电与预算检查通过，可访问性/交互项仍可能失败。

- [ ] **步骤4：提交**

```bash
git add 大北疆带狗自驾攻略.html
git commit -m "feat: add redundant charging plans and computed budget"
```

### 任务4：修复交互、存储、安全和可访问性

**文件：**
- 修改：`大北疆带狗自驾攻略.html`

**接口：**
- `resetDayFilter()` 恢复“全部18天”并显示全部卡片。
- `openMapDay()` 必须先调用 `resetDayFilter()`。
- `goTab()` 同步 `aria-selected`、`tabindex` 和面板状态。

- [ ] **步骤1：修复地图筛选状态**

点击任意地图节点时恢复全部筛选，再展开并滚动到目标日。

- [ ] **步骤2：补全tab和键盘语义**

加入 `tablist/tab/tabpanel`、左右方向键、Home/End、`:focus-visible` 和 `prefers-reduced-motion`；移动端显示横向滑动提示。

- [ ] **步骤3：保护本地保存并补全链接安全**

确认中心与清单的 `localStorage` 写入都用 `try/catch`，失败时显示可见提示；所有新窗口链接添加 `rel="noopener"`；修正临河旧导航名。

- [ ] **步骤4：运行静态校验**

运行：`node tests/validate_trip_guide.mjs`

预期：全部静态检查通过，退出码0。

- [ ] **步骤5：提交**

```bash
git add 大北疆带狗自驾攻略.html
git commit -m "fix: restore filtered map jumps and accessibility"
```

### 任务5：交付全程简报与项目记录

**文件：**
- 新建：`全程行程简报.md`
- 修改：`需求归档.md`
- 修改：`信息核验记录.md`
- 修改：`大北疆带狗自驾攻略.html`

**接口：**
- 简报包含18天表格、每日里程/驾驶时间/住宿/核心补能、四个高风险段和出发前时间线。
- HTML总览提供简报链接。

- [ ] **步骤1：编写简报**

按18天逐日列出路线和落脚点；明确D4 S240/S245无官方沿线充电确认，D2/D16 G7、D8阿禾、D10赛湖、D13独库的最后安全决策点。

- [ ] **步骤2：更新项目演进记录**

在需求归档增加 V8：18天消除折返、S240/S245必走、充电三层冗余、事实与交互修复、静态测试和简报。

- [ ] **步骤3：运行校验并提交**

```bash
node tests/validate_trip_guide.mjs
git add 全程行程简报.md 需求归档.md 信息核验记录.md 大北疆带狗自驾攻略.html
git commit -m "docs: add the complete 18-day trip brief"
```

### 任务6：真实浏览器回归与最终验收

**文件：**
- 不提交临时截图或测试脚本。

**目标流程：** 页面加载→筛选赶路日→返回总览→点击D5地图节点→逐日页恢复全部筛选且D5可见并展开。

- [ ] **步骤1：启动本地只读服务**

运行：`python3 -m http.server 8765 --bind 127.0.0.1`

- [ ] **步骤2：桌面端回归**

检查页面身份、非空、无错误覆盖层、控制台无相关错误、十个栏目、筛选、展开、地图跳转、确认中心、清单和简报链接。

- [ ] **步骤3：移动端回归**

在375×844检查首屏、导航提示、充电表、卡片、横向溢出和焦点可见性。

- [ ] **步骤4：最终命令验证**

运行：

```bash
node tests/validate_trip_guide.mjs
git status --short
git log --oneline --decorate -8
```

预期：静态校验全部通过；工作树无未提交修改；浏览器检查表全部通过或明确列出剩余外部实时风险。

## 自审结果

- 设计覆盖：路线、充电、预算、政策、交互、存储、安全、可访问性、简报和浏览器回归均有对应任务。
- 占位符扫描：计划无 TBD、TODO 或“稍后实现”。
- 接口一致性：`DAYS`、`CHARGE_SEGMENTS`、`BUDGET_ITEMS`、`resetDayFilter()` 和 `goTab()` 名称在各任务中一致。

