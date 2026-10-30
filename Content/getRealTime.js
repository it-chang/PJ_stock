//////////////////////////////////////
//【即時報價】透過本機 IIS 反向代理呼叫 TWSE mis API
// REF : https://hackmd.io/@aaronlife/python-ex-stock-by-api
// IIS（URL Rewrite + ARR）把 /IT/twse/* 轉到 https://mis.twse.com.tw/*，同網域所以沒有 CORS 問題
// 規則在 web.config，模組安裝見 setup_iis_twse_proxy.ps1
//////////////////////////////////////

// 以本檔位置（/IT/Content/）推算代理路徑 /IT/twse/，不論頁面在哪一層都適用
const TWSE_PROXY = new URL('../twse/', document.currentScript.src).href

// data: [{ stock_number, Type2 }]；回傳 TWSE msgArray 合併後的陣列
async function main(data) {
    let postsdata = []
    const _baseInfo = data.map(header => ({ stock_number: header.stock_number, Type: header.Type2 }));
    const urllist = generateStockApiUrls(_baseInfo, 60);

    for (let index = 0; index < urllist.length; index++) {
        const fullUrl = urllist[index].replace(' ', '') + '&_=' + Date.now();

        // 取得資料並合併
        postsdata = postsdata.concat(await getData(fullUrl));

        // 等待 5 秒後再繼續下一次呼叫（避免被 TWSE 擋）
        if (index < urllist.length - 1) {
            await sleep(5000);
        }
    }
    if (postsdata.length == 0) {
        notifyProxyFailed()
    }
    return postsdata
}

function notifyProxyFailed() {
    console.warn('即時報價沒有取得任何資料：請確認 IIS 已安裝 URL Rewrite + ARR，且 web.config 的 twse 代理規則有生效')
    alert('即時報價取得失敗：本機 IIS 代理 /twse/ 沒有回應（請確認 URL Rewrite + ARR 已安裝）')
}

function generateStockApiUrls(data, size) {
    let x = [];
    let targets = data.filter(zz => zz.Type == "上市").map(zz => zz.stock_number)
    batch_size(targets, size).forEach(i => {
        x.push(buildStockApiUrl(i, 'tse'));
    })
    targets = data.filter(zz => zz.Type != "上市").map(zz => zz.stock_number)
    batch_size(targets, size).forEach(i => {
        x.push(buildStockApiUrl(i, 'otc'));
    })
    return x
}

function buildStockApiUrl(targets, type_tse_otc) {
    let endpoint = TWSE_PROXY + 'stock/api/getStockInfo.jsp';
    let today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let channels = targets.map(target => `${type_tse_otc}_${target}.tw_${today}`).join('|');
    return `${endpoint}?ex_ch=${channels}`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function batch_size(dataList, batchSize) {
    let result = [];
    // 計算總共需要多少個批次
    const numBatches = Math.ceil(dataList.length / batchSize);

    // 迴圈遍歷每個批次
    for (let i = 0; i < numBatches; i++) {
        const startIndex = i * batchSize;
        const endIndex = Math.min((i + 1) * batchSize, dataList.length);
        result.push(dataList.slice(startIndex, endIndex));
    }
    return result;
}

async function getData(url) {
    let _data = [];

    try {
        let response = await fetch(url);
        if (!response.ok) {
            console.log(url)
            throw new Error('Network response was not ok');
        }
        let data = await response.json();
        _data = data['msgArray'] || [];

        _data.forEach(x => {
            try {
                // 漲停時沒有賣單，賣價 a 會是 '-'：賣價、買價都以漲停價 u 代替
                const noAsk = x.a == '-'

                x.g = x.g?.split('_')[0];   //買量
                x.b = noAsk ? parseFloat(x.u) : parseFloat(x.b.split('_')[0]);  //買價
                x.a = noAsk ? parseFloat(x.u) : parseFloat(x.a.split('_')[0]);  //賣價
                x.f = x.f.split('_')[0]; //賣量
                x.v = x.v.split('_')[0];  //成交量

                //盤中成交價：沒有成交價時依序用買價、賣價
                x.z = parseFloat(parseFloat(x.z) ? x.z : x.b) ? (parseFloat(x.z) ? x.z : x.b) : x.a
            } catch (error) {
                console.error('error stocknumber==>', x.c);
            }
        });

    } catch (error) {
        console.error('There has been a problem with your fetch operation:', error);
    }
    return _data;
}
