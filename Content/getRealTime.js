//////////////////////////////////////
//【即時報價】透過 CORS proxy 呼叫 TWSE mis API
// REF : https://hackmd.io/@aaronlife/python-ex-stock-by-api
//////////////////////////////////////

const CORS_PROXY = 'https://corsproxy.io/?url='

// data: [{ stock_number, Type2 }]；回傳 TWSE msgArray 合併後的陣列
async function main(data) {
    let postsdata = []
    const _baseInfo = data.map(header => ({ stock_number: header.stock_number, Type: header.Type2 }));
    const urllist = generateStockApiUrls(_baseInfo, 60);

    for (let index = 0; index < urllist.length; index++) {
        const fullUrl = CORS_PROXY + urllist[index].replace(' ', '') + '&_=' + Date.now();

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
    console.warn('即時報價沒有取得任何資料：請確認 corsproxy.io 是否可用，或是否需要付費方案')
    alert('即時報價取得失敗：corsproxy.io 沒有回應（可能被限流或需要付費方案）')
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
    let endpoint = 'https://mis.twse.com.tw/stock/api/getStockInfo.jsp';
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
