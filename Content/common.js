Vue.prototype.LocationOrigin = window.location.origin

Vue.prototype.UrlContent = function (x){ 
  
	return this.LocationOrigin+x
}
//https://stackoverflow.com/questions/77082361/how-to-add-tooltip-to-datatable-header-in-vuetify-3
Vue.prototype.$headerinfo=[
	{text:"_quote",renametext:"漲幅",tooltip:''},
	{text:"箱型力量_5均",renametext:"5均箱量",tooltip:''},

	{text:"盤後量",renametext:"*盤後量*",tooltip:''},
	{text:"成交量",renametext:"*成交量*",tooltip:''},
	{text:"淨值倍率",renametext:"*淨值倍率*",tooltip:''},
	{text:"貝他值",renametext:"*貝他值*",tooltip:''},
	{text:"價能",renametext:"*價能*",tooltip:''},
]
Vue.prototype.$renameHeaders = function(headers) {
	headers.forEach(header => {
	  const renameInfo = this.$headerinfo.find(item => item.text === header.text);
	  if (renameInfo) {
		header.text = renameInfo.renametext; // 重命名表頭
	  }
	});
  };