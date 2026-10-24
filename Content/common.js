/*
prototype 
用途     : 組件全局經常性複用，則會透過prototype掛載在vue的實體 所有組件實例能透過 this 直接存取。 
慣用符號 :習慣上使用 $ 符號作為前綴，以區分組件內的資料
主要適用於 Vue 2。在 Vue 3 中，已被 app.config.globalProperties 取代
*/



//////////////////////////////////////
//【通用參數】
//////////////////////////////////////

Vue.prototype.LocationOrigin = window.location.origin
Vue.prototype.UrlContent = function (x) {
	return this.LocationOrigin + x
}

// 站台根網址（不含結尾 /），例如 http://localhost/IT、https://it-chang.github.io/PJ_stock
const BASE_URL = window.location.href.split('/').slice(0, 4).join('/')
Vue.prototype.$baseUrl = BASE_URL

// 個股圖表 Html/ 的網址：GitHub Pages 上圖表在另一個 repo（it-chang/PJ_Stock2），本機則在 Html/ 子資料夾
Vue.prototype.$htmlUrl = window.location.host.endsWith('github.io')
	? 'https://it-chang.github.io/PJ_Stock2/'
	: BASE_URL + '/Html/'
//https://stackoverflow.com/questions/77082361/how-to-add-tooltip-to-datatable-header-in-vuetify-3
Vue.prototype.$headerinfo = [
	{ text: "_quote", renametext: "漲幅", tooltip: '' },
	{ text: "箱型力量_5均", renametext: "5均箱量", tooltip: '' },
	{ text: "盤後量", renametext: "*盤後量*", tooltip: '' },
	{ text: "成交量", renametext: "*成交量*", tooltip: '' },
	{ text: "淨值倍率", renametext: "*淨值倍率*", tooltip: '' },
	{ text: "貝他值", renametext: "*貝他值*", tooltip: '' },
	{ text: "價能", renametext: "*價能*", tooltip: '' },
	{ text: "均價longlong_%'", renametext: "*長均價啪*", tooltip: '' },
]
Vue.prototype.$renameHeaders = function (headers) {
	headers.forEach(header => {
		const renameInfo = this.$headerinfo.find(item => item.text === header.text);
		if (renameInfo) {
			header.text = renameInfo.renametext; // 重命名表頭
		}
	});
};


//////////////////////////////////////
//【格式轉換】
//////////////////////////////////////

Vue.prototype.$formatDesc = function (desc) {
	return String(desc).replace(/\*\*/g, '<br/>'); // 把 `**` 轉換成 `<br/>`
};


//////////////////////////////////////
//【 資料處理】
//////////////////////////////////////

// 讀取 Excel 第一個工作表 -> { headers: [欄位名], rows: [{欄位名: 值}] }
Vue.prototype.$loadSheet = async function (file) {
	const response = await fetch(file)
	if (!response.ok) throw new Error(`${file} 讀取失敗 (HTTP ${response.status})`)
	const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array' })
	const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 })
	if (json.length === 0) return { headers: [], rows: [] }

	const headers = json[0]
	const rows = json.slice(1).map(row => {
		const rowData = {}
		headers.forEach((header, i) => rowData[header] = row[i])
		return rowData
	})
	return { headers, rows }
}


//////////////////////////////////////
//【 頁面共用 mixin】 index / index2 / index3 用 mixins: [pageMixin] 載入
//////////////////////////////////////

function loadChecklist() {
	try {
		return JSON.parse(localStorage.getItem('checklist') || '[]')
	} catch (e) {
		return []
	}
}

function saveChecklist(list) {
	localStorage.setItem('checklist', JSON.stringify(list))
}

var pageMixin = {
	data() {
		return { checklist: [] }
	},
	created() {
		this.checklist = loadChecklist()
	},
	methods: {
		// stock-dialog 勾選 / 取消自選股
		handleCheckUpdate({ stock, checked }) {
			if (checked) {
				if (!this.checklist.includes(stock)) this.checklist.push(stock)
			} else {
				this.checklist = this.checklist.filter(x => x !== stock)
			}
			saveChecklist(this.checklist)
		},
		checkboxUpdated(newValue) {
			this.checklist = loadChecklist()
			if (newValue) {
				if (this.checked) {
					this.checklist.push(newValue)
				} else {
					this.checklist = this.checklist.filter(x => x != newValue)
				}
			}
			saveChecklist(this.checklist)
		},
		// 類別名稱淨化（與 Python sanitize_filename 一致）
		sanitizedTypelevel(x) {
			return (x || '').replace(/[\\/:*?"<>|]/g, "_");
		},
	}
}