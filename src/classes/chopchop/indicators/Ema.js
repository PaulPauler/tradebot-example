import { Base } from './Base.js';

export class Ema extends Base {
  constructor(core) {
    super();
    this.core = core;
    this.period = 15; //Days
    this.toArray = [];

    if(this.core.activeSession) this.period = this.core.activeSession.params.ema.period;
  }

  //EMA calculating
  subscribe(prev) {
    let delay;
    if(this.core.callback.ema){
      if(this.core.candles.all.length > this.period){
        const N = this.period;
        const alpha = 2/(N + 1);
        let sum = 0;
        let ema;
        let sma;
        let prevEma;
        this.core.candles.all.forEach((candle, index) => {
          if(index < N) sum = sum + candle.close;
          if(index >= N - 1) {
            prevEma = index == N - 1 ? sum/N : ema;
            ema = !ema ? prevEma : (candle.close - prevEma) * alpha + prevEma;
            index - N + 1 <= this.toArray.length - 1 ? this.toArray[index - N + 1] = ema : this.toArray.push(ema);
          }
        });
        this.core.callback.ema(this.toArray[this.toArray.length - 2].toFixed(3));
        delay = 10000;
      }else{
        if(!this.loadCount || this.loadCount == 3) this.loadCount = 0;
        this.loadCount++;
        const text = 'loading'.padEnd(7 + this.loadCount,"...");
        this.core.callback.ema(text);
        delay = 1000;
      }
    }
    setTimeout(() => {
      this.subscribe();
    }, delay);
  }
}
