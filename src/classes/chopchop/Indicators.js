import { Ema } from './indicators/Ema.js';

export class Indicators {
  constructor(core){
    this.core = core;

    // indicators
    this.ema = new Ema(this.core);
  }

  subscribe(indicators){
    if (!indicators || indicators.length == 0 || !Array.isArray(indicators)) return console.log("Error. Need array [ 'indicator1', 'indicator2' ... 'indicatorN']");

    const allowed = ['EMA'];
    indicators.forEach((indicator) => {
      allowed.indexOf(indicator) != -1 ? this[indicator.toLowerCase()].subscribe() : console.log(`Subcribe ${name} does not exist`);
    });
  }

  refresh(ready = true){
    if(this.core.candles){
      this.ema.toArray = [];
      const tradesArray = [];
      // Make orders history
      if(this.core.trader && this.core.trader.history.length > 0){
        this.core.trader.history.forEach((item) => {
          let orderForChart = { date: item.timestamp, type: item.side, price: item.price, low: item.low, high: item.high };
          tradesArray.push(orderForChart);
        });
      }
      this.chartParams = {
        timezoneOffset: this.core.trades.timezoneOffset,
        ema: { period: this.ema.period },
        symbol: this.core.symbol,
        update: 'starting',
        tradesArray: tradesArray,
        ready: ready,
      };
    }
  }
}
