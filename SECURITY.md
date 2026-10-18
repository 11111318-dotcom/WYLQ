# 安全政策（Security Policy）

## 回報漏洞

請**不要**在公開 Issue 中揭露漏洞細節。請改用 GitHub 的私密回報管道：

倉庫頁面 → **Security** 分頁 → **Report a vulnerability**

若該入口尚未顯示，請先由倉庫管理者在 Settings 中啟用 **Private vulnerability reporting**。

回報時請盡量附上：

- 受影響的檔案或功能（例如某個結果區塊的渲染）
- 重現步驟與使用的瀏覽器版本
- 預期行為與實際行為
- 可能的影響範圍

我會盡力在合理時間內確認並回覆，修補後再公開說明。

## 範圍

本專案是單檔、純前端的 HTML 研究工具，推算全部在瀏覽器內執行。

**範圍內：**

- 透過表單輸入造成的 HTML／腳本注入（XSS）
- CSP 設定錯誤或可被繞過
- GitHub Actions 工作流程（`.github/workflows`）的供應鏈風險
- 發布檔案與 `SHA256SUMS` 不一致

**範圍外：**

- GitHub Pages 平台本身、訪客瀏覽器或擴充套件的問題
- 因 GitHub Pages 無法自訂 HTTP 標頭而無法設定的項目（例如 `frame-ancestors`）
- 五運六氣推算內容的學術或臨床正確性

## 隱私提醒

本倉庫與網站公開。請勿在 Issue、PR 或提交中放入個人資料、出生資料、私密筆記、憑證或 token。

## 支援版本

僅維護 `main` 分支上的最新版本。
