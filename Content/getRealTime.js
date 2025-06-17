//var apiHelper = $.apiHelper = {};
//$.extend(apiHelper, {
//   url: {},
//});


async function main( data) {

    

    let cors= 'https://cors-anywhere.herokuapp.com/'
    let postsdata=[]
    var _baseInfo = data.map(header => ({ stock_number: header.stock_number, Type: header.Type2 }));
    var urllist = generateStockApiUrls(_baseInfo, 60);

    for (let index = 0; index < urllist.length; index++) {
        let url = urllist[index];
        let fullUrl = cors + url.replace(' ', '');

        // 取得資料
        var d = await getData(fullUrl);

        // 合併資料
        postsdata =postsdata.concat(d);

        // 等待 5 秒後再繼續下一次呼叫
        if (index < urllist.length - 1) {
            await sleep(5000);
        }
    }
    
    console.log(postsdata)
    return postsdata
}
async function main(data) {
    // 假設這是你的 main 函式，確保它回傳一個 Promise
    return new Promise( async (resolve, reject) => {
        // 模擬一些異步操作

        let cors= 'https://cors-anywhere.herokuapp.com/'
        let postsdata=[]
        var _baseInfo = data.map(header => ({ stock_number: header.stock_number, Type: header.Type2 }));
        var urllist = generateStockApiUrls(_baseInfo, 60);
    
        for (let index = 0; index < urllist.length; index++) {
            let url = urllist[index];
            let fullUrl = cors + url.replace(' ', '');
    
            // 取得資料
            var d = await getData(fullUrl);
    
            // 合併資料
            postsdata =postsdata.concat(d);
    
            // 等待 5 秒後再繼續下一次呼叫
            if (index < urllist.length - 1) {
                await sleep(5000);
            }
        }
        if(postsdata.length==0){
            openURL()
        }
        
        resolve(postsdata);
    });
}

function openURL(){
    window.open(
            'https://cors-anywhere.herokuapp.com/corsdemo',
            '_blank',
            'width=800,height=600,left=100,top=100'
            );
}

function generateStockApiUrls(data, size) {
    
    let x = [];
    targets = data.filter(zz => zz.Type == "上市").map(zz => zz.stock_number)
    batch_size(targets, size).forEach(i => {
        x.push(buildStockApiUrl(i, 'tse'));
    })
    targets = data.filter(zz => zz.Type != "上市").map(zz => zz.stock_number)
    batch_size(targets, size).forEach(i => {
        x.push(buildStockApiUrl(i, 'otc'));
    })
    return x
}
//REF : https://hackmd.io/@aaronlife/python-ex-stock-by-api
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
    var vm = this;
    var _data = [];

    try {
        let response = await fetch(url);
        if (!response.ok) {
            console.log(url)
          
            throw new Error('Network response was not ok');
        }
        let data = await response.json();
        let newArray = data['msgArray'] || [];

        _data = _data.concat(newArray);
         
        _data.forEach(x => {
            x.g = x.g.split('_')[0];   //買量
            x.b = parseFloat(x.b.split('_')[0]);  //買價
            //x.a = parseFloat(x.a.split('_')[0]);   //賣價
            x.a = (x.a=='-' )? parseFloat(x.u):parseFloat(x.a.split('_')[0])
            if(x.a=='-' ){
                 x.b=parseFloat(x.u)
            }
            x.f = x.f.split('_')[0]; //賣量
            x.v = x.v.split('_')[0];  //成交量
            x.z=  parseFloat(x.z)? x.z:x.b //盤中成交價
        });
       
    } catch (error) {
        console.error('There has been a problem with your fetch operation:', error);
    }
    return _data;
}
