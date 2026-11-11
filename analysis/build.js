// 把 data/raw/ 的三個 CSV 合併成網站用的資料檔。
// 用法：在專案根目錄執行  node analysis/build.js
// 輸出：data/processed/data.json（給人看、給其他程式用）
//       data/processed/data.js  （網站讀這個，直接雙擊 index.html 也能用）

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// 讀 CSV：處理雙引號包起來的欄位（欄位裡可能有逗號）
function readCSV(file) {
  const text = fs.readFileSync(path.join(root, file), 'utf8').replace(/^﻿/, '');
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(v => v !== '')) rows.push(row);

  const header = rows.shift();
  return rows.map(r => Object.fromEntries(header.map((h, j) => [h, (r[j] ?? '').trim()])));
}

const toNum = v => (v === '' || v === undefined ? null : Number(v));

const candidates = readCSV('data/raw/candidates.csv');
const fiscalRows = readCSV('data/raw/fiscal.csv');
const policies = readCSV('data/raw/policies.csv');

// 統籌款：億元 → 元
const fiscal = {};
for (const f of fiscalRows) {
  fiscal[f.county_id] = {
    tongchou_ntd: f.tongchou_2027_100m_ntd ? Number(f.tongchou_2027_100m_ntd) * 1e8 : null,
    per_capita_ntd: toNum(f.tongchou_2027_per_capita_ntd),
    source_url: f.source_url,
  };
}

// 縣市清單，依 candidates.csv 第一次出現的順序
const counties = [];
for (const c of candidates) {
  if (!counties.find(x => x.id === c.county_id)) {
    counties.push({ id: c.county_id, name: c.county, type: c.county_type, fiscal: fiscal[c.county_id] || null });
  }
}

// 檢查：政見裡的候選人一定要在名單裡
const problems = [];
const candKey = new Set(candidates.map(c => c.county_id + '|' + c.candidate));

const outPolicies = policies.map(p => {
  if (!candKey.has(p.county_id + '|' + p.candidate)) {
    problems.push(`${p.policy_id}：候選人「${p.candidate}」不在 ${p.county_id} 名單裡`);
  }
  const cost = toNum(p.annual_cost_ntd);
  if (cost !== null && p.cost_source === 'none') problems.push(`${p.policy_id}：有金額但 cost_source 是 none`);
  if (p.cost_source === 'ours' && !p.cost_note) problems.push(`${p.policy_id}：本站推估必須寫 cost_note`);
  if (!['annual','one_time','total_term','unclear'].includes(p.cost_basis)) problems.push(`${p.policy_id}：cost_basis「${p.cost_basis}」不是規定的值`);

  // 只有「每年」金額才算比例；一次性建設不和每年財源比
  let annualCost = null;
  if (cost !== null && p.cost_basis === 'annual') annualCost = cost;
  if (cost !== null && p.cost_basis === 'total_term') annualCost = cost / 4;

  const denom = fiscal[p.county_id]?.tongchou_ntd ?? null;
  const share = annualCost !== null && denom ? annualCost / denom : null;

  return { ...p, annual_cost_ntd: cost, annual_cost_calc: annualCost, share_of_tongchou: share };
});

const data = {
  built_at: new Date().toISOString(),
  counties,
  candidates: candidates.map(c => ({ ...c, order: Number(c.order), ballot_no: toNum(c.ballot_no) })),
  policies: outPolicies,
};

fs.mkdirSync(path.join(root, 'data/processed'), { recursive: true });
fs.writeFileSync(path.join(root, 'data/processed/data.json'), JSON.stringify(data, null, 2));
fs.writeFileSync(path.join(root, 'data/processed/data.js'), 'window.ELECTION_DATA = ' + JSON.stringify(data) + ';\n');

console.log(`縣市 ${counties.length}、候選人 ${candidates.length}、政見 ${policies.length}`);
console.log(`有統籌款總額的縣市：${counties.filter(c => c.fiscal?.tongchou_ntd).length}/22`);
if (problems.length) { console.log('\n⚠ 需要處理：'); problems.forEach(x => console.log(' - ' + x)); }
else console.log('檢查通過');
