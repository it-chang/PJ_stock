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