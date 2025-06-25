
	量能: 成交股數/一年內最大量  (%)
	
	# 計算成交量震盪指標
	Volume_Oscillator : (Volume_MA_short-Volume_MA_long)/Volume_MA_long (%)
	-------------------------------------------------------------------
	【量能均/量能差】
	
	量能均: n 天量能 平均				| >5
	量能差: 量能與前一天的差值		| >9
	
	check 	
	4979		-2	21		【Lv.2】近期有量，但當日縮
	6435		5	4		【Lv.3】漸漸量長
	8091		24	8		【Lv.4】突然放量
	
	item.Flag=parseInt(item.量能差/item.量能均)
	
	Flag
	
	
	-------------------------------------------------------------------
	【MA5_% / 均價_%】
	
	MA5_%=(收盤價-MA_short)/ MA_short					|>-1 <0
	均價_%=(MA_short-MA_long)/ MA_long				|>0
	
	check 	
	
	https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_6442.tw_20250509|tse_6757.tw_20250509|tse_1101.tw_20250509|

	https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=otc_3357.tw_20250509|otc_3339.tw_20250509|
	https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_6442.tw_20250509|tse_6757.tw_20250509|tse_1101.tw_20250509|
	
	app.realtimedata.filter(x=>x.c=='6442')
	((app.realtimedata.filter(x => x.c =='6442' )[0]?.b / parseFloat(app.realtimedata.filter(x => x.c == '6442')[0]?.y) - 1) * 100).toFixed(2);


-------------------------------------------------------------------------------
20250616 
  1514 8222 6603