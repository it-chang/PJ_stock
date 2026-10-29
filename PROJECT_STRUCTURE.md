# 台股每日選股系統 — 專案架構與功能說明

> 位置：`D:\Project\Jupyter\Stock\Main`
> 技術：Python（Jupyter Notebook）爬蟲／分析 + 靜態網頁（Vue 2 + Vuetify + SheetJS）讀 Excel/JSON 呈現
> 部署：本機 IIS（`web.config` 開啟目錄瀏覽），網址如 `http://localhost/IT/`

---

## 1. 整體流程

```
┌──────────────── 基本資料 ────────────────┐
│ _BaseInfo        上市/上櫃公司清單、產業別  → BaseInfo/StockBaseData.csv
│ _BaseInfoETF     ETF 清單與持股產業比重     → BaseInfo/ETFBaseData.csv
│ _BaseRevenue     月營收 opendata           → Result/t187ap05_*.csv
│ _CrawStockInfo   個股基本面 (MoneyDJ)      → Result/StockInfo.xlsx
│ _CrawStockType   產業鏈分類 (ic.tpex)      → Result/StockType.xlsx / BaseInfo/supply_chain.json
│ __stockProfitability_1~3  季財報、評分      → Result/StockProfitability*.xlsx, fundamental_score_*.xlsx
└──────────────────────────────────────────┘
                    │
                    ▼
┌──────────── 每日主流程 Main.ipynb（收盤後執行）────────────┐
│ %run _CrawBase.ipynb       爬每月日K → Data/*.json（快取）
│ %run _genHtml_cyber.ipynb  技術指標計算 + 個股圖表 → Html/[代號]名稱.html
│ 上市 / 上櫃 各一個執行緒跑全市場（強制更新當月資料）
│   → Result/DailyFiles/{日期}.xlsx           (每日指標)
│   → Result/DailyRunRealTimeStock/{日期}.xlsx (最新價/即時欄位)
│ %run _CrawStockFund.ipynb  三大法人買賣超 → Result/fund/
│ %run Untitled.ipynb        每日選股（重構版）
│   → Result/checkall, checksun_*, check_v, analyze_1~4, summary.json ...
│ %run _DailySignal.ipynb    每日推薦 + 離場追蹤 → Result/recommend/、LINE 推播
│ %run _VolumeSignal.ipynb   有量訊號 + 離場追蹤 → Result/volume/（volume.html）
└────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────── 網頁前端（瀏覽器直接讀 Result/ 下的 xlsx/json）────────────┐
│ menu.html → index / index2 / index3 / index4 / index5_dashboard ...
└──────────────────────────────────────────────────────────────────────┘

（快速更新時改用 Main1.ipynb：8 執行緒、只用已快取資料，跑完接 Untitled，不爬法人、不發 LINE）
```

---

## 2. 目錄結構

| 路徑 | 說明 |
|---|---|
| `BaseInfo/` | 基本資料 CSV：`StockBaseData.csv`（上市櫃公司代號/簡稱/產業/市場別）、`ETFBaseData.csv`、`His_Stock.csv` |
| `Data/` | 個股每月原始資料快取（JSON），檔名 `Stock_His_{代號}_{YYYY-MM-01}.json`、`Revenue_His_{代號}_{月}.json`。`_CrawBase` 會先檢查是否存在，存在就不重爬 |
| `Result/` | 所有分析輸出（Excel / JSON），前端頁面直接讀這裡，詳見第 5 節 |
| `Html/` | 每檔股票的互動圖表 HTML（`[1101]台泥-水泥工業-上市.html`，約 2000 檔），由 `_genHtml_cyber` 產生。**本身是獨立 git repo**（`it-chang/PJ_Stock2`），已被主專案 `.gitignore` 排除 |
| `Content/` | 前端共用資源：`common.js`（DataTable 共用 mixin/表頭說明）、`getRealTime.js`（透過 CORS proxy 抓 TWSE 即時報價）、`stockDialog.js/.css`（個股彈窗，連到 MoneyDJ/富邦/財報狗/TradingView/基本面/交易日誌）、`base.css`、`style.css`、`script.js`、`data.json`（`che.html` 用） |
| `Project_ETF/` | ETF 持股子專案：`ETF_Portfolio_Downloader.ipynb` 抓持股明細，`ETF_Portfolio_Compare.html` 比較不同日期持股變化，資料放 `ETF_Investment_Portfolio/{ETF代號}/` |
| `TradingJournalData/` | 交易日誌資料（`{代號}.json`，`trading-journal.html` 讀取）；內含一份 `_genHtml_cyber.ipynb` 備份 |
| `FIN/` | 個人財務頁備份（`_MyFIN25.html`） |
| `.ipynb_checkpoints/` | Jupyter 自動備份，不需理會 |

---

## 3. Notebook 說明

### 3.1 主流程

| 檔案 | 功能 |
|---|---|
| **`_Scheduler.ipynb`** | **排程總管**。所有定期工作（main / revenue / stockinfo / etf / profit / 提醒類）的規則集中在第 1 區 `JOBS`；依「上次成功時間 / 資料新舊」決定要不要跑，沒開機的日子下次開機自動補跑。由 `runScheduler.bat auto` 呼叫，詳見第 8 節 |
| **`Main.ipynb`** | **每日主程式**（由 `_Scheduler` 在收盤後執行）。載入 `_CrawBase`、`_genHtml_cyber` → 上市、上櫃各開一個執行緒，對每檔執行 `process_stock_codes`（`craw_stock_need_update=True` 強制更新當月資料 → `data_process` 算指標 → `gen_html` 出圖 → `save_process_data` 收集）→ 清空並重寫 `Result/DailyFiles/`、`Result/DailyRunRealTimeStock/` → `%run _CrawStockFund` → `%run Untitled` → `%run _DailySignal`。起始月份 `start_month = '2025-05-01'` |
| `Main.nbconvert.ipynb` | 舊排程的輸出檔（2026-10-24 起不再更新，執行紀錄改存 `Result/_scheduler/logs/`） |
| `Main1.ipynb` | **快速更新用**。流程同 Main，但改用 `ThreadPoolExecutor(MAX_WORKERS=8)`、`craw_stock_need_update=False`（已快取的月份不重爬）、`start_month = '2025-12-01'`；跑完只接 `Untitled`，不爬法人、不跑 `_DailySignal` |
| **`Untitled.ipynb`** | **每日選股流程（重構版）**，被 Main / Main1 最後呼叫。分 9 區：設定 → 工具 → 日期 → 載入 → 特徵 → 統計 → 規則 → 匯出 → 族群檔/summary.json（詳見第 4 節） |
| **`_DailySignal.ipynb`** | **每日推薦 + 離場追蹤 → LINE**，被 Main 最後呼叫。讀 `DailyFiles` 的「推薦進場」→ 記入推薦紀錄、隔日開盤價進場 → 每日檢查離場（停損最多 -8%、跌破 MA20、獲利 15% 後回落 10% 移動停利、持有滿 20 交易日）→ 推播 LINE。用 `state.json` 記錄處理進度，同一天重跑不會重複推薦或重發；`SEND_LINE=False` 可只印不發 |
| **`_VolumeSignal.ipynb`** | **有量訊號 + 離場追蹤**，被 Main 在 `_DailySignal` 後呼叫。讀 `checkall` 套用 index.html「有量」條件（成交金額>5日均×1.3、收漲、LevelArea>-50、ma_up_flag≥1）→ 隔日開盤進場 → 用 `DailyFiles` 每日檢查離場（停損＝量K低且最多 -8%、爆量黑K、跌破 MA10、獲利 10% 後回落 7%、持有 20 日、10 日報酬 <5% 滯漲）。另記錄進場後 5/10/20 日報酬與期間最高/最低%，用來調整離場點。不發 LINE；第一次執行用現有 DailyFiles 全部回補 |
| `_genHtml_run.ipynb` | 跑全部歷史數據重產 HTML 用 |

### 3.2 共用函式庫（被 `%run` 載入）

| 檔案 | 主要函式 / 功能 |
|---|---|
| `_BaseInfo.ipynb` | 從 `mopsfin.twse.com.tw` opendata（`t187ap03_L/O.csv`）取上市/上櫃公司基本資料，解碼產業別，輸出 `BaseInfo/StockBaseData.csv`；提供全域 `_baseInfo` DataFrame。網路失敗時有 fallback |
| `_CrawBase.ipynb` | 爬蟲核心：`craw_one_month`、`craw_stock`（上市走 TWSE `STOCK_DAY`、上櫃走 TPEx）、`craw_revenue`、`DataCleaning`、JSON 快取讀寫（`check_data_exist`、`writing_to_json`）、`GetStockInfoByID` |
| `_genHtml_cyber.ipynb` | 技術分析與出圖：RSI、MACD、KD、布林通道、均線多頭排列、樞紐點 (`find_pivots`)、趨勢特徵、K 線型態 (`analyze_candlestick*`)、市場分類；用 Plotly 產生 Cyber 風格 HTML (`gen_html`)；`save_data_by_date` 依日期拆出 Excel |
| `_CrawStockFund.ipynb` | 三大法人買賣超：`crawl_fund_n_days(n)` 爬 TWSE `T86` / TPEx 資料，快取在 `Result/fund/YYYYMMDD.json`；`analyze_fund_n_days(n)` 算外資/投信累計與連續買賣超天數，輸出 `Result/fund/fund_result_{日期}.xlsx` |
| `_LineMsg.ipynb` | LINE Bot 推播（`sendLineMessage`、Flex 表格訊息） |

### 3.3 基本面 / 分類資料（不定期執行）

| 檔案 | 功能 | 輸出 |
|---|---|---|
| `_BaseInfoETF.ipynb` | 取 TWSE 國內 ETF 清單、MoneyDJ ETF 持股，計算各 ETF 產業比重並匯出圖片 | `BaseInfo/ETFBaseData.csv`、`Result/ETFBaseDataRead.csv`、`Result/mytable.png` |
| `_BaseRevenue.ipynb` | 下載上市/上櫃/興櫃月營收 opendata（每月 10 日後公布） | `Result/t187ap05_L/O/R.csv` |
| `_CrawStockInfo.ipynb` | 爬 MoneyDJ 個股基本資料，合併月營收 | `Result/StockInfo.xlsx`（`StockInfobk.xlsx` 為備份） |
| `_CrawStockType.ipynb` | 爬 `ic.tpex.org.tw` 產業鏈（上中下游/子分類） | `Result/StockType.xlsx`、`output.json`（→ 整理成 `BaseInfo/supply_chain.json`） |
| `__stockProfitability_1_Craw.ipynb` | 爬富邦 eBroker 季財報（毛利率、營益率、YoY、財務動能） | `Result/StockProfitability.xlsx`（最新一季）、`StockProfitability_all.xlsx` |
| `__stockProfitability_2_split.ipynb` | 把 `StockProfitability_all.xlsx` 拆成一股一檔 | `Result/profitability/{代號}.xlsx`（`fundamental.html` 讀取） |
| `__stockProfitability_3_fundamental_score.ipynb` | 12 項基本面評分（與 `fundamental.html` 邏輯一致），join `checkall` 估值欄位 | `Result/fundamental_score_all.xlsx`、`fundamental_score_{日期}_top{門檻}.xlsx` |

### 3.4 分析 / 實驗用

| 檔案 | 說明 |
|---|---|
| `［BK］/` | 已停用的舊檔備份：`Analyze.ipynb`、`___Untitled1/2.ipynb`（Untitled 重構前草稿）、`___index3_1.html`、`index5.html`、舊版 `supply_chain v2 / vi.json`、`output*.json`、git 除錯清單等 |
| `Project_ETF/ETF_Portfolio_Downloader.ipynb` | 從 pocket.tw 抓 ETF 持股明細，輸出格式化 xlsx 到 `ETF_Investment_Portfolio/{ETF}/ETF_Investment_Portfolio_{日期}.xlsx` |

---

## 4. 每日選股（`Untitled.ipynb`）重點

**輸入**：近 `N_DAYS=15` 日的 `DailyFiles/*.xlsx` + 當日 `DailyRunRealTimeStock/{日期}.xlsx`，合併 `StockInfo`、`StockProfitability`、`StockType`、`fundamental_score_all`、`BaseInfo/supply_chain.json`、`StockBaseData.csv`。

**常改設定（第 1 格）**

| 參數 | 用途 |
|---|---|
| `TARGET_DATE_OVERRIDE` | 補跑某一天（`None` = 自動推算，週末回推到週五；不處理國定假日） |
| `N_DAYS` | 往回看幾個日曆日 |
| `HOLDINGS` | 持股名單 → `checkmy.xlsx`、`checksunmy.xlsx` |
| `WATCH_X` / `WATCH_Y` | 觀察名單（x：IG 推薦；y：創高名單） |
| `EXCLUDED_TYPE1` | 「價_量」條件排除的產業 |
| `HOT_QUOTE`、`LEVEL_UP`、`LEVEL_FLAT_LOW` … | 族群統計與 Typelevel 門檻 |

**主要特徵**：各種乖離率（`MA5_%`、`均價_%`=MA5/MA20、`均價long_%`=MA20/MA50、`MACD_%`…，定義在 `PCT_SPECS`）、量能（`Volume_MA_5/10/30/50`、`VPC_*`）、`LevelArea`、當日漲跌幅 `_quote`、前日 MACD。

**選股規則（`build_conditions` + `EXPORT_FOLDERS`）**

| 標籤 | 條件摘要 | 輸出 |
|---|---|---|
| `價_量` | 多頭排列、量 > 50 日均量 0.9 倍、營益率 > 0、累計營收成長、MACD 柱體增加、排除特定產業 | `Result/checksun_a/` |
| `【b1】` | 均價_% ≥ 0、均價long_% > 0、MACD_% > 0 | `Result/checksun_b1/` |
| `【b2】` | 均價_% < 0、均價long_% > 0、MACD_% > 0 | `Result/checksun_b2/` |
| `【v】測試條件` | 量能遞增（Vol5 > Vol10 > Vol30）、10 日上漲、量 > 10000 | `Result/checksun_v/` |
| SS 分流 | 近 6 日 MACD-SL 由負轉正，且當日 MACD_% ≥ 0 | `Result/checksun_ss/` |
| `【c】【d1】【d2】【e】【x】【y】` | 均線/MACD 其他組合、觀察名單（目前停用輸出） | — |

新增條件：在 `build_conditions` 加一個 key，並在 `EXPORT_FOLDERS` 加一行對應資料夾。

---

## 5. `Result/` 輸出檔對照

| 檔案 / 資料夾 | 產生者 | 讀取者（頁面） |
|---|---|---|
| `DailyFiles/{日期}.xlsx` | Main / Main1（`_genHtml_cyber`） | Untitled、_DailySignal、`trading-journal.html` |
| `DailyRunRealTimeStock/{日期}.xlsx` | Main / Main1 | Untitled |
| `recommend/推薦紀錄.csv`、`recommend/state.json` | _DailySignal（推薦與持倉紀錄、處理進度；不會被 Main 清空） | — |
| `volume/有量紀錄.csv`、`volume/state.json`、`volume/web/` | _VolumeSignal（有量訊號紀錄、處理進度、網頁 JSON；不會被 Main 清空） | `volume.html` |
| `checkall/{日期}.xlsx` | Untitled（全市場每日） | `index.html`、`index3.html`、`fundamental.html`、評分 notebook |
| `check_v/{日期}.xlsx` | Untitled（量能遞增當日） | `index.html`、`menu.html` |
| `checkmy.xlsx`、`checksunmy.xlsx` | Untitled（持股） | `index.html`、`index2.html` |
| `checksun/{產業}.xlsx` | Untitled（依產業別） | `index2.html` |
| `checksun_type/{族群}.xlsx` | Untitled（依供應鏈族群） | `index2.html` |
| `checksun_a / b1 / b2 / v / ss/` | Untitled（選股規則） | `index2.html`、`menu.html` |
| `analyze_1~2.xlsx` | Untitled（Typelevel 統計樞紐） | `index4.html` |
| `analyze_3~4.xlsx` | Untitled（族群 sector 統計樞紐） | `index4.html` |
| `summary.json` | Untitled（族群儀表板） | `index5_dashboard.html` |
| `StockInfo.xlsx`、`StockType.xlsx`、`StockProfitability*.xlsx` | 基本面 notebooks | Untitled |
| `profitability/{代號}.xlsx` | `__stockProfitability_2_split` | `fundamental.html` |
| `fundamental_score_*.xlsx` | `__stockProfitability_3_fundamental_score` | Untitled |
| `fund/` | `_CrawStockFund` | — |
| `t187ap05_*.csv` | `_BaseRevenue` | `_CrawStockInfo` |

---

## 6. 網頁前端

所有頁面為純前端（Vue 2 + Vuetify 2.6 + SheetJS xlsx），由瀏覽器直接讀 `Result/` 下的檔案，必須經由 Web Server（IIS `http://localhost/IT/`）開啟，不能用 `file://`。

| 頁面 | 標題 / 功能 |
|---|---|
| `menu.html` | 【Menu】入口頁，連到各 check 檔、analyze 檔、ETF 比較、MyFIN |
| `index.html` | 每日全市場表格（`checkall`/`check_v`/`checkmy`），多欄位複選過濾，參數 `?d=A&date=&type=` |
| `index2.html` | 「太陽圖」：依產業 / 族群 / 選股規則 (`checksun_*`) 檢視，內嵌個股圖表（`Html/`） |
| `index3.html` | 「分類解析」：依 Typelevel 分類檢視 `checkall` |
| `index4.html` | 「產業走勢看板」：Chart.js 繪 `analyze_*.xlsx` 族群走勢 |
| `index5_dashboard.html` | 「族群動向」：讀 `summary.json` 的族群儀表板 |
| `fundamental.html` | 「基本面分析」：讀 `profitability/{代號}.xlsx` 做 12 項評分與圖表，`?stock=代號` |
| `trading-journal.html` | 「交易日誌」：讀 `DailyFiles` 與 `TradingJournalData/{代號}.json`，`?code=代號` |
| `_MyFIN.html` | 【FIM】個人持股/損益月份試算 |
| `Project_ETF/ETF_Portfolio_Compare.html` | ETF 持股比較（不同日期增減） |
| `che.html` | 實驗頁：Vue 3 XY Chart 讀 `Content/data.json` |
| `Project_ETF/ETF_Portfolio_Compare - 複製.html` | 舊版／備份（其餘舊頁面已移到 `［BK］/`） |

個股彈窗（`Content/stockDialog.js`）提供外連：MoneyDJ、富邦 eBroker、財報狗、TradingView、本地 `fundamental.html`、`trading-journal.html`。

---

## 7. 外部資料來源

| 來源 | 用途 |
|---|---|
| TWSE `exchangeReport/STOCK_DAY`、`rwd/zh/fund/T86`、`rwd/zh/ETF/domestic` | 上市日K、三大法人、ETF 清單 |
| TPEx `afterTrading/tradingStock`、`3itrade_hedge_result` | 上櫃日K、三大法人 |
| `mopsfin.twse.com.tw/opendata` | 公司基本資料 (`t187ap03`)、月營收 (`t187ap05`) |
| `mis.twse.com.tw/stock/api/getStockInfo.jsp` | 即時報價（前端 `getRealTime.js` 經 CORS proxy） |
| MoneyDJ / pscnetinvest | 個股基本資料、ETF 持股 |
| 富邦 eBroker (`fubon-ebrokerdj.fbs.com.tw`) | 季財報 |
| `ic.tpex.org.tw` | 產業鏈分類 |
| pocket.tw | ETF 持股明細 |

---

## 8. 執行方式

### 8.1 自動排程（`_Scheduler.ipynb`）

Windows 排程 `StockAuto` 執行 `runScheduler.bat auto`，觸發：平日 15:10、平日 18:30、登入後 10 分鐘；錯過時間開機後盡快執行。同時只會跑一份（`Result/_scheduler/running.lock`）。舊排程 `MainStock`、`MainETF` 已停用（設定備份在 `［BK］/task_*_20261024.xml`）。

| 工作 | 內容 | 什麼時候跑 |
|---|---|---|
| `main` | `Main.ipynb`（內含 `_CrawStockFund`、`Untitled`、`_DailySignal`、`_VolumeSignal`） | 每個交易日 15:10 後一次 |
| `revenue` | `_BaseRevenue.ipynb` 月營收 | 每天一次（幾秒，公布後自然更新） |
| `stockinfo` | `_CrawStockInfo.ipynb`（合併月營收，排在 revenue 後） | 每個交易日 15:10 後一次 |
| `etf` | `Project_ETF/ETF_Portfolio_Downloader.ipynb` | 每個交易日 18:00 後一次 |
| `profit` | `__stockProfitability_1` → `_2` → `_3` | 季報期限（3/31、5/15、8/14、11/14）過後本機季別落後就跑；期限後 21 天內每 7 天補抓晚交 |
| `stocktype`、`etfbase` | `_CrawStockType`、`_BaseInfoETF` | 不自動跑，超過 90 天沒更新就 LINE 提醒（每 7 天一次） |

- 有執行、失敗或提醒時發 LINE 摘要。工作跑完但產出檔沒更新也算失敗。
- 手動：`runScheduler.bat status` 只看狀態；`runScheduler.bat run 工作名` 強制執行。直接在 Jupyter 執行 `_Scheduler.ipynb` 只會顯示狀態。
- 狀態 `Result/_scheduler/state.json`，每次執行紀錄 `Result/_scheduler/logs/`（保留 30 天）。

### 8.2 手動

- **只想快速更新**：跑 `Main1.ipynb`（多執行緒、不重爬已快取月份、不發 LINE）。
- **補跑某日選股**：修改 `Untitled.ipynb` 的 `TARGET_DATE_OVERRIDE` 後單獨執行。
- `__stockProfitability_3` 的 `DATE = None` 會用最新的 `checkall`，要指定日期再填。

**主要套件**：`pandas`、`numpy`、`requests`、`beautifulsoup4`、`openpyxl`、`plotly`、`matplotlib`、`mpl_finance`、`scipy`、`dataframe_image`、`tqdm`、`line-bot-sdk`

---

## 9. 注意事項

- **路徑寫死**：多處使用 `D:\Project\Jupyter\Stock\Main\...` 絕對路徑（`Main1`、`_CrawBase`、`Untitled` 等）。`Untitled.ipynb` 已支援環境變數 `STOCK_BASE_DIR`，其餘尚未。
- **機敏資訊寫在程式裡**：`_LineMsg.ipynb` 含 LINE Channel Access Token、`_CrawStockType.ipynb` 含公司 proxy 帳密。建議改用環境變數或 `.env`（已在 `.gitignore`），並考慮更換已外洩的憑證。
- **月底資料補抓**：`_CrawBase.check_data_exist` 對過去月份，若檔案最後一天早於基準股 2330 該月最後交易日（月底沒開機或抓取失敗），會重抓一次；在該月結束後寫入的檔案視為完整，不會一直重抓。
- **ETF 持股（pocket.tw）**：2026-10 起 API 要帶 token，`ETF_Portfolio_Downloader` 每次從網頁取訪客 token。一次抓最近 `DAYS=10` 個交易日（環境變數 `ETF_DAYS` 可改，最多約 120），檔名用**資料日期**，沒開機的日子會自動補回。
- **Main / Main1 都會清空** `Result/DailyFiles/` 與 `Result/DailyRunRealTimeStock/` 再重寫（只保留最近約 20 天）。推薦紀錄另存在 `Result/recommend/`，不受影響。
- `.gitignore` 排除了 `*.json`、`HTML/`、`.ipynb_checkpoints`，所以 `Data/`、`BaseInfo/supply_chain.json`、`summary.json` 等不在版本控制內。
- 不再使用的舊檔已移到 `［BK］/`（2026-10-22），確認沒問題後可整個刪除。
