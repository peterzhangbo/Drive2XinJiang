import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

// 在真实HTTPS页面上控制网络故障；解密、表单与页面渲染仍运行生产代码。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const password = read('归档/新疆自驾_2026-08/大北疆带狗自驾攻略.html').match(/var PASS = '([^']+)';/)[1];
const cli = path.join(process.env.HOME, '.codex/skills/playwright/scripts/playwright_cli.sh');
const source = read('web/app.js');
const code = `async (page) => {
  let offline = true;
  let requests = 0;
  await page.route('**/app.js*', route => route.fulfill({contentType:'text/javascript', body:${JSON.stringify(source)}}));
  await page.route('**/trips.enc.json*', route => {
    requests++;
    return offline ? route.abort('failed') : route.continue();
  });
  await page.goto('https://peterzhangbo.github.io/Drive2XinJiang/?entry-test=' + Date.now() + '#daxing');
  await page.evaluate(() => sessionStorage.clear());
  await page.waitForFunction(() => document.querySelector('#status').textContent.length > 0);
  await page.getByRole('textbox', {name:'访问密码'}).fill(${JSON.stringify(password)});
  await page.getByRole('button', {name:'进入新旅行'}).click();
  await page.waitForFunction(() => !document.querySelector('#submit').disabled);
  const failure = await page.locator('#status').textContent();
  offline = false;
  await page.getByRole('button', {name:'进入新旅行'}).click();
  await page.waitForFunction(() => document.querySelector('#gate').hidden, null, {timeout:5000}).catch(() => {});
  const recovered = await page.locator('#gate').isHidden();
  let days = 0;
  let switched = false;
  let wrongPassword = '';
  if (recovered) {
    await page.waitForFunction(() => document.querySelector('iframe')?.contentDocument?.querySelectorAll('[data-day]').length === 13);
    days = await page.evaluate(() => document.querySelector('iframe').contentDocument.querySelectorAll('[data-day]').length);
    await page.getByRole('link', {name:'XinJiang 2026 · 夏'}).click();
    await page.getByRole('link', {name:'大兴安岭 2026 · 秋'}).click();
    switched = await page.locator('#gate').isHidden();
    await page.getByRole('button', {name:'锁定',exact:true}).click();
    await page.getByRole('textbox', {name:'访问密码'}).fill('incorrect-test-password');
    await page.getByRole('button', {name:'进入新旅行'}).click();
    await page.waitForFunction(() => !document.querySelector('#submit').disabled);
    wrongPassword = await page.locator('#status').textContent();
  }
  await page.unrouteAll();
  return {failure,recovered,requests,days,switched,wrongPassword};
}`;
const run = spawnSync(cli, ['--session', 'travel-debug', '--raw', 'run-code', code], {cwd:root, encoding:'utf8', maxBuffer:2e6});
// CLI回显可能含表单输入，仅输出结果对象，绝不输出完整命令或密码。
assert.ifError(run.error);
const line = run.stdout.split('\n').find(line => line.startsWith('{"failure":'));
assert.ok(line, '浏览器未返回测试结果；检查travel-debug会话，不输出含密码的执行代码');
const result = JSON.parse(line);
console.log(result);
assert.equal(result.recovered, true, '首次网络失败后，网络恢复并再次提交必须能解锁，不能复用失败Promise');
assert.match(result.failure, /加载|网络/);
assert.doesNotMatch(result.failure, /Load failed|Failed to fetch|密码不正确/);
assert.equal(result.days, 13);
assert.equal(result.switched, true);
assert.match(result.wrongPassword, /密码不正确/);
console.log('通过：断网后原页重试恢复、中文网络提示、13天渲染、免密码切换和错密码提示。');
