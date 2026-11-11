# 2026 縣市長政見對照

把 2026 九合一 22 縣市長候選人的政見整理成可篩選的資料庫，並把有金額的政見對照各縣市 2027 年統籌分配稅款。

## 資料夾
- `data/raw/`：原始資料（手動編輯這裡的 CSV）
  - `candidates.csv` 候選人名單
  - `policies.csv` 政見
  - `fiscal.csv` 統籌分配稅款
- `data/processed/`：由程式產生，不要手動改
- `analysis/build.js`：把 CSV 合併成網站資料
- `notes/codebook.md`：分類規則；`notes/sources.md`：來源與待查清單

## 更新流程
1. 編輯 `data/raw/` 裡的 CSV（用 Google 試算表或 Numbers 匯出 CSV 也可以，記得選 UTF-8）
2. 在專案資料夾執行 `node analysis/build.js`，看有沒有「需要處理」的警告
3. 雙擊 `index.html` 在瀏覽器確認
4. 用 GitHub Desktop commit、push
