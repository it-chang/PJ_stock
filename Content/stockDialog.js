Vue.component('stock-dialog', {
  props: {
    value: Boolean,
    item: Object,
    checklist: Array,
    url: String
  },

  data() {
    return {
      tab: 0,
      checked: false
    }
  },

  watch: {
    item: {
      immediate: true,
      handler(val) {
        if (!val) return
        this.checked = this.checklist.includes(val.stock_number)
      }
    }
  },

  computed: {
    safeType() {
      return (this.item && this.item.Type || '').replace('*', '')
    },

    iframeSrc() {
      if (!this.item) return ''
      return this.url + '[' + (this.item.stock_number || '') + ']' + this.safeType + '.html'
    },

    tradingViewUrl() {
      if (!this.item) return ''
      const market = this.item.Type2 === '上市' ? 'TWSE' : 'TPEX'
      return `https://tw.tradingview.com/chart/?symbol=${market}%3A${this.item.stock_number}`
    },

    textDescList() {
      if (!this.item || !this.item.text_desc) return []
      return this.item.text_desc.split('\r\n')
    }
  },

  methods: {
  
    close() {
      this.$emit('input', false)
    },

    toggleCheck() {
      this.$emit('update-check', {
        stock: this.item.stock_number,
        checked: this.checked
      })
    },

    formatDesc(desc) {
      return String(desc || '').replace(/\*\*/g, '<br/>')
    },

    formatNumber(val) {
      const num = parseFloat(val)
      return isNaN(num) ? '' : num.toFixed(1)
    }, 

    computedHref(date ,val) {
      // return val || '#'
      return 'index.html?d=A&date='+date+'&type='+val
    },
    urlindex2(item){
      return window?.location.href.split('/').slice(0, 4).join('/')+'/index2.html?d=' +item?.分類標籤.split('】')[0].replace('【','') +'&date='+ item.日期+'&stockno='+ item.stock_number
    },
  },

  template: `


<v-dialog :value="value" max-width="80vw" @input="$emit('input', $event)">
  <v-card v-if="item && item.stock_number">
    <v-card-title class="headline">
    </v-card-title>
    
    <v-card-text style="padding:0; height:80vh;">
      <v-tabs v-model="tab">
        <v-tab> 原本內容</v-tab>
        <v-tab> Fundamental</v-tab>
          <v-checkbox v-model="checked" @change="toggleCheck"></v-checkbox>
        {{ item.stock_number }} {{ item.Type }}
      
        &nbsp;   &nbsp;
      <a :href="'https://tw.stock.yahoo.com/quote/' + item.stock_number + '.TW/revenue'" target="_blank">Revenue </a> 
      &nbsp;
      <a :href="'https://tw.stock.yahoo.com/quote/' + item.stock_number + '.TW'" target="_blank">Yahoo </a> 
      &nbsp;
      <a :href="'https://www.wantgoo.com/stock/' + item.stock_number " target="_blank">玩股網 </a> 
      &nbsp;
      <a :href="'https://fubon-ebrokerdj.fbs.com.tw/z/zc/zcl/zcl.djhtm?a=' + item.stock_number+ '&b=2'" target="_blank"> 主力進出 </a>
      &nbsp;
      <a :href="'https://pscnetinvest.moneydj.com/z/zc/zca/zca.djhtm?a=' + item.stock_number " target="_blank">MoneyDJ </a> 
      &nbsp;
      &nbsp;
      <a :href="urlindex2(item)" target="_blank">index2 </a>
      </v-tabs>

      <v-tabs-items v-model="tab">

        <!-- Tab 1 -->
        <v-tab-item>
        <!-- iframe -->
        <iframe :src="iframeSrc" style="height:80vh; width:100%; border:0;" ></iframe>
        <br />
        <!-- TradingView -->
        <a v-if="item" :href="tradingViewUrl" target="_blank"> TradingView </a>
        &nbsp;

        <!-- 不知道為何 開啟多次後會被擋 
          <a :href="'https://statementdog.com/analysis/'+selectedItem?.stock_number" target="_blank"> 本益比河流 </a>
        -->

      </v-tab-item>

      <!-- Tab 2 -->
      <v-tab-item>
      
        <v-row no-gutters>
          <v-col cols="4">
            <iframe
            :src="'http://localhost/IT/fundamental.html?stock=' + item.stock_number + '&date='+ item.日期"
            style="height:80vh;width:100%;border:0;"
            ></iframe>
          </v-col>
      
          <v-col cols="8">
            <v-row no-gutters>
              <!-- 左側資訊 -->
              <v-col cols="6">
                【{{ item.Type1 }}】 {{ item.textdesc }}
                <br><br>  
                營業毛利率 <span style="color: #d1d1e7;">{{ item.營業毛利率 }}</span>
                營業利益率 <span style="color: #d1d1e7;">{{ item.營業利益率 }}</span>
                <br />

                淨值倍率 <span style="color: #d1d1e7;">{{ item.淨值倍率 }}</span>
                殖利率 <span style="color: #d1d1e7;">{{ item.殖利率 }}</span>
                貝他值 <span style="color: #d1d1e7;">{{ item.貝他值 }}</span>
                <br />

                本益比 <span style="color: #d1d1e7;">{{ item.本益比 }}</span>
                同業平均本益比 <span style="color: #d1d1e7;">{{ item.同業平均本益比 }}</span>
                <br />

                營業收入-上月比較增減(%)
                <span style="color: #d1d1e7;">
                  {{ formatNumber(item['營業收入-上月比較增減(%)']) }}
                </span>

                營業收入-去年同月增減(%)
                <span style="color: #d1d1e7;">
                  {{ formatNumber(item['營業收入-去年同月增減(%)']) }}
                </span>

                累計營業收入-前期比較增減(%)
                <span style="color: #d1d1e7;">
                  {{ formatNumber(item['累計營業收入-前期比較增減(%)']) }}
                </span>
                <br />
                <div v-for="x in textDescList" :key="x">
                  <a :href="computedHref(item.日期,(x.split('｜')[2] || ''))" target="_blank">
                    {{ x }}
                  </a>
                </div>
              </v-col>

              <!-- 右側摘要 -->
              <v-col cols="6">
                <span v-html="formatDesc(item.Full_Summary)"></span>
                {{ item.desc }}
              </v-col>
            </v-row>
            <!-- 下方 iframe（獨立一列） -->
            <v-col cols="12">
              <iframe
                :src="'http://localhost/IT/trading-journal.html?code=' + item.stock_number + '&date='+ item.日期"
                style="height:80vh;width:100%;border:0;"
              ></iframe>
            </v-col>
          </v-col>
    
    
        </v-row>
      </v-tab-item>
      
    </v-tabs-items>
  </v-card-text>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="primary" text @click="close">Close</v-btn>
    </v-card-actions>

  </v-card>
</v-dialog>



`
})