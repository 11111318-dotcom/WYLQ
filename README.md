# WYLQ-Audit — 五運六氣工具

線上入口：[https://11111318-dotcom.github.io/WYLQ/](https://11111318-dotcom.github.io/WYLQ/)

整合後正式版本：[yq14 + 六元正紀 v3.34.0](https://11111318-dotcom.github.io/WYLQ/)。

原始 yq14 基準檔：[versions/yq14.html](https://11111318-dotcom.github.io/WYLQ/versions/yq14.html)（整合前快照）。舊正式首頁快照：[versions/current-legacy.html](https://11111318-dotcom.github.io/WYLQ/versions/current-legacy.html)（回溯用，不作為現行部署來源）。

本 repository 提供 WYLQ-Audit 單檔 HTML 研究工具。網站與程式原始碼是公開的；請勿在 repository 放入個人資料、出生資料、私密筆記、憑證或存取 token。

## 隱私與安全邊界

- 推算在使用者瀏覽器內執行；程式本身不使用網路請求 API、瀏覽器持久化儲存或後端服務。
- 網站本身公開可存取；GitHub 託管與訪客使用的瀏覽器／擴充套件仍在信任邊界之外。
- CSP SHA-256 只核准目前精確的 inline script/style；不要以 unsafe-inline 放寬 script CSP 來修復雜湊錯誤。
- deepFreeze 防止靜態資料表在執行後被意外修改，不是防止原始檔被替換的密碼學信任根。
- 發佈檢查是防迴歸護欄，不是第三方滲透測試或零漏洞保證。

## 修改與驗證

根目錄 `index.html` 是**正式發布檔案**：GitHub Actions 會先通過安全檢查，再把它複製到 `_site/index.html` 部署到 GitHub Pages。`docs/index.html` 不是發布來源，而是 CI 目前要求與根目錄保持位元組一致的同步副本（工作流程中的 `cmp index.html docs/index.html`）。`versions/yq14.html` 是整合前的原始 yq14 基準快照；`versions/current-legacy.html` 是本次切換前的舊首頁快照。正式首頁 `index.html` 以 yq14 為主體，向前移植六元正紀 v3.34.0，並保留兩份快照供回溯。CI 以 CSP／安全檢查與六元正紀測試驗證正式首頁，另以 `tools/audit_csp_versioned_preview.py` 核對 yq14 原始基準檔。修改 HTML 後執行：

```sh
python3 tools/update_csp_hashes.py index.html
python3 tools/security_check.py index.html
python3 tools/test_security_tools.py index.html
cp index.html docs/index.html
python3 tools/security_check.py docs/index.html
cmp index.html docs/index.html
python3 tools/audit_csp_versioned_preview.py versions/yq14.html
```

不要只更新其中一份。GitHub Actions 會在對 `main` 的 PR 與推送時自動檢查 CSP 雜湊、必要防護標記、外部資源與可疑 API，以及過期雜湊是否正確 fail closed。

## 已知限制

- GitHub Pages 的自訂 HTTP 回應標頭能力有限；目前 CSP 以 HTML meta 為主。frame-ancestors 必須由 HTTP header 提供，不能放在 CSP meta 內。
- 仍有部分內部模板使用 innerHTML；新增任何動態資料來源時必須先審查，並優先改用 textContent 與 DOM API。
- 請在 GitHub Settings → Pages 中確認 Source 為 **GitHub Actions**（不要設為 Deploy from a branch，否則可能繞過 CI 檢查），並啟用 Enforce HTTPS。
- 請在 `main` 的 Ruleset 中將 `static-security-check` 設為必要狀態檢查，CI 失敗時才不會被合併。
- 若日後要移除 `docs/index.html` 或其他重複 HTML，必須同時修改工作流程中的 `cmp` 步驟與本說明。
