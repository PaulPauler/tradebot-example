export class Candles {
  constructor(chopchop) {
    this.chopchop = chopchop;

    this.all = [];
    this.subscribeStatus = true;
    if(this.chopchop.core.activeSession) {
      this.params = {
        range: this.chopchop.core.activeSession.params.candles.range
      };
    } else {
      this.params = {
        range: 24 * 60 * 60000
      };
    }
    this.init();
  }

  async init(){
    this.subscribe(this.params);
  }

  async makeCandles(allTrades, params) {
    const startLength = this.all.length;
    params.sort = this.chopchop.core.trades.needCleaning == 1 ? 'DESC' : this.chopchop.core.trades.params.sort;
    if(this.rebuildStatus == 1) return this.subscribe(params);

    let cntTrades = 0;
    let firstTradeDate = params.sort == 'ASC' ? new Date(allTrades[0].timestamp) : new Date(allTrades[allTrades.length - 1].timestamp);
    let prevDate = new Date(firstTradeDate.getFullYear(), firstTradeDate.getMonth(), firstTradeDate.getDate(), 0 + this.chopchop.core.trades.timezoneOffset).getTime();

    // let t0;
    // if(this.chopchop.core.trades.needCleaning == 1){
    //   console.log("Start candles array making");
    //   t0 = Date.now();
    // }

    do {
      let curRange = allTrades.filter(el => el.timestamp >= prevDate && el.timestamp < prevDate + params.range);

      if(curRange.length > 0) {
        this.chopchop.core.trades.allTrades.splice(this.chopchop.core.trades.allTrades.indexOf(curRange[0]), curRange.length);
        const minMaxArray = this.getMinMax(curRange);

        let sum = 0;
        curRange.forEach(function(item){
          sum += Number(item.quantity) * Number(item.price);
        });

        let newCandle = {
          date: new Date(curRange[0].timestamp).getTime(),
          open: Number(curRange[0].price),
          high: minMaxArray[1],
          low: minMaxArray[0],
          close: Number(curRange[curRange.length - 1].price),
          volume: sum,
          count: curRange.length
        };
        if(!this.updCandle(newCandle, prevDate, params)){
          if(params.sort == 'ASC'){
            this.all.push(newCandle);
            if(this.chopchop.indicators.chartParams.update != 'starting') this.chopchop.indicators.chartParams.update = this.all.length - 1;
          }else{
            this.all.unshift(newCandle);
            if(this.chopchop.indicators.chartParams.update != 'starting') this.chopchop.indicators.chartParams.update = 0;
          }
        }
        prevDate = params.sort == 'ASC' ? prevDate + params.range : prevDate - params.range;
      }
      cntTrades = curRange.length;
    } while (cntTrades > 0);

    if(this.chopchop.indicators.chartParams.update == 'starting') this.chopchop.indicators.chartParams.update == 'nothing';

    if(this.chopchop.core.trades.needCleaning == 1){
      // let t1 = Date.now();
      // console.log("Performance: " + (t1 - t0)/1000 + " seconds.");
      console.log(`Generated candles: ${this.all.length}`);
      this.chopchop.core.trades.needCleaning = 0;
      this.chopchop.indicators.refresh();
      global.gc();
      console.log("Memory was cleared");
    }else{
      if(startLength < this.all.length) console.log(`Array of candles was updated. Candles count: ${this.all.length}`);
    }

    this.subscribe(params);
  }

  getMinMax(items){
    const resultArray = [];
    items.forEach(function(item){
      if(item.price < resultArray[0] || !resultArray[0])resultArray[0] = Number(item.price);
      if(item.price > resultArray[1] || !resultArray[1])resultArray[1] = Number(item.price);
    });
    return resultArray;
  }

  /*Update candles array*/
  updCandle(newCandle, newCandleDate, params){
    let finded = false;
    this.all.forEach(function(candle, index, thisArg){
      let openDate = candle.date;

      if(openDate >= newCandleDate && openDate < newCandleDate + params.range){

        if(candle.date > newCandle.date){
          thisArg[index].date = newCandle.date;
          thisArg[index].open = newCandle.open;
        }else{
          thisArg[index].close = newCandle.close;
        }
        thisArg[index].volume = thisArg[index].volume + newCandle.volume;
        thisArg[index].count = thisArg[index].count + newCandle.count;

        if(candle.high < newCandle.high) thisArg[index].high = newCandle.high;
        if(candle.low > newCandle.low) thisArg[index].low = newCandle.low;
        this.chopchop.indicators.chartParams.update = index;

        finded = true;
      }
    }, this);

    return finded;
  }

  // subscribe(params){
  //   Async.doWhilst(
  //     Async.asyncify(() => this.makeCandles(this.chopchop.core.trades.allTrades, params)),
  //     () => this.subscribeStatus != false,
  //     (err) => {
  //       this.subscribeStatus = false;
  //       if (err) {
  //         console.error("Candles building has been stopped with error:");
  //         console.error(err);
  //       }
  //       else {
  //         console.log("Candles building has been stopped");
  //       }
  //     }
  //   );
  // }

  async subscribe(params){
    params.sort = this.params.sort;
    if(this.chopchop.core.callback.candles) this.chopchop.core.callback.candles(this.all, this.chopchop.indicators.chartParams);
    if(this.rebuildStatus == 1){
      console.log('Rebuilding candles');
      this.rebuildStatus = 0;
      this.all = [];
      this.chopchop.indicators.refresh();
    }
    if(this.subscribeStatus) setTimeout(() => {
      if(this.chopchop.core.trades && this.chopchop.core.trades.allTrades.length > 0){
        this.makeCandles(this.chopchop.core.trades.allTrades, params);
      } else {
        this.subscribe(params);
      }
    }, 5000);
  }

  rebuild(){
    this.rebuildStatus = 1;
  }
}
