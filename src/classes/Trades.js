import { Observable, Subject } from 'rxjs';
import { asyncWait, compareObjects } from '../utils.js';
import { Database } from '../database';

export class Trades{
  constructor(chopchop) {
    this.chopchop = chopchop;

    if(this.chopchop.core.activeSession) {
      this.tradesRange = this.chopchop.core.activeSession.params.trades.range;
      this.timezoneOffset = this.chopchop.core.activeSession.params.trades.offset;
    } else {
      this.tradesRange = 120; //Days
      this.timezoneOffset = 0; //Hours
    }

    this.subscribeStatus = true;
    this.params = {
      sort: 'DESC',
      limit: 1000,
      from: 'restart'
    };
    this.edging = {};
    this.needCleaning = 0;
    this.rebuildStatus = 0;

    this.init();
  }

  async init(){
    this.subscribe(this.params);
  }

  async getTradesFromDb(){
    console.log('Attempt to load trades from the database');
    this.allTrades = [];
    this.edging = {};
    this.chopchop.indicators.refresh(false);
    this.chopchop.indicators.ready = true;

    let firstDataRangeOffset = new Date();
    let startDate = firstDataRangeOffset.getTime();
    firstDataRangeOffset.setDate(firstDataRangeOffset.getDate() - this.tradesRange);
    let actualDate = new Date(firstDataRangeOffset.getFullYear(), firstDataRangeOffset.getMonth(), firstDataRangeOffset.getDate(), 0 + this.timezoneOffset).getTime();

    let endDate = startDate;
    let found = 0;
    let full = false;
    const dataRange = 5 * 24 * 60 * 60000; //1 iteration = 10 days
    const limit = 100000;
    try{
      while(actualDate < startDate){
        startDate = startDate - dataRange;
        if(actualDate >= startDate){
          startDate = actualDate;
        }
        // await Database.db.collection("trades_" + this.chopchop.core.symbol).find().rewind();
        const allTrades = await Database.db
          .collection("trades_" + this.chopchop.core.symbol)
          .find({ timestamp: { $gte: startDate, $lt: endDate } })
          .toArray();
        endDate = startDate;

        found += allTrades.length;

        if(allTrades.length > 0){
          allTrades.sort((a, b) => {
            return a.id - b.id;
          });
        } else throw new Error('The database does not have enough trades. Now we will receive the missing trades from the exchange');

        while(allTrades.length > 0){
          if(!this.edging.end){
            this.edging.end = {id: allTrades[allTrades.length - 1].id, timestamp: allTrades[allTrades.length - 1].timestamp};
          }
          this.edging.start = {id: allTrades[0].id, timestamp: allTrades[0].timestamp};

          this.needCleaning = 1;
          let col = limit <= allTrades.length ? limit : allTrades.length;
          const scanned = allTrades.splice(allTrades.length - col, col);
          this.allTrades.unshift(...scanned);
        }

        if(this.rebuildStatus == 1) throw new Error('Restart Trades functions');
      }
    } catch(e) {
      console.log(e.message);
    }
    if(found > 0){
      this.params.from = 'last';
    } else {
      this.params.from = 'not found';
    }
    console.log(`Found ${found} trades in Database`);
  }

  async getTrades(params) {
    params.offset = 0;

    params.till = new Date();
    let firstDataRangeOffset = new Date(params.till);
    firstDataRangeOffset.setDate(firstDataRangeOffset.getDate() - this.tradesRange);

    if(params.from == 'last' && this.edging.start){
      let firstTrade = this.edging.start.timestamp;
      if(firstDataRangeOffset.getTime() < firstTrade){
        params.till = new Date(firstTrade);
        params.from = new Date(firstDataRangeOffset.getFullYear(), firstDataRangeOffset.getMonth(), firstDataRangeOffset.getDate(), 0 + this.timezoneOffset);
        params.sort = this.params.sort = 'DESC';
        params.by = 'timestamp';
      }else{
        params.till = null;
        params.from = Number(this.edging.end.id);
        params.sort = this.params.sort = 'ASC';
        params.by = 'id';
      }
    }else{
      params.sort = this.params.sort = 'DESC';
      params.by = 'timestamp';
      params.from = new Date(firstDataRangeOffset.getFullYear(), firstDataRangeOffset.getMonth(), firstDataRangeOffset.getDate(), 0 + this.timezoneOffset);
    }

    let t0 = Date.now();
    let cntTrades = 0;

    do {
      if(this.rebuildStatus == 1) throw new Error('Restart Trades functions');

      const trades = await this.chopchop.restClient.getTrades(this.chopchop.core.symbol, params);
      if(trades.length > 0 && params.sort == 'ASC') trades.splice(0, 1);
      cntTrades = trades.length;
      if(cntTrades > 0) {
        params.offset += params.offset < params.limit ? params.limit : trades.length;

        if(params.offset >= 100000){
          params.offset = 0;
          params.sort == 'ASC' ? params.from = new Date(trades[0].id) : params.till = new Date(trades[0].timestamp);
        }

        const newTrades = trades.map((item) => {
          item.timestamp = new Date(item.timestamp).getTime();
          return item;
        });
        await Database.db.collection("trades_" + this.chopchop.core.symbol).insertMany(newTrades);
        if(params.sort == 'ASC'){
          this.allTrades.push(...newTrades);
          this.edging.end = {id: this.allTrades[this.allTrades.length - 1].id, timestamp: this.allTrades[this.allTrades.length - 1].timestamp};
        }else{
          this.allTrades.unshift(...newTrades.reverse());
          this.edging.start = {id: this.allTrades[0].id, timestamp: this.allTrades[0].timestamp};
          if(!this.edging.end) {
            this.edging.end = {id: this.allTrades[this.allTrades.length - 1].id, timestamp: this.allTrades[this.allTrades.length - 1].timestamp};
          }
        }
        //
        // console.log(this.allTrades.length);
        // console.log(trades[0].price);
        // console.log("====");
      }

      // await asyncWait(500);
    } while (cntTrades > 0);
    let t1 = Date.now();
    // console.log("Performance: " + (t1 - t0)/1000 + " seconds.");
  }

  async subscribe(params){
    try {
      if(this.params.from == 'restart'){
        await this.getTradesFromDb();
      } else {
        await this.getTrades(params);
      }
    } catch(e) {
      if(e.message == 'Restart Trades functions'){
        this.rebuildStatus = 0;
        this.params.from = 'restart';
        this.params.sort = 'DESC';
        if(this.symbol) this.chopchop.core.symbol = this.symbol;
        this.chopchop.core.candles.rebuild();
        console.log(e.message);
        if (this.rebuildObserver) {
          this.rebuildObserver.complete();
          //this.rebuildObserver = undefined;
        }
      } else {
        console.log(`Data didn't come from the stock exchange. Retrying..`);
      }
    }

    if(this.params.from != 'restart'){
      params.sort = this.params.sort;
      params.from = 'last';
    }

    if(this.subscribeStatus != false) {
      await asyncWait(2000);
      this.subscribe(params);
    }
  }

  rebuild(symbol){
    if(symbol) this.symbol = symbol;
    this.rebuildStatus = 1;

    return new Promise((ok, fail) => {
      this.rebuildObserver = new Subject();
      const rebuildObs = this.rebuildObserver.asObservable();
      rebuildObs.subscribe(() => {}, fail, ok);
    });
  }
}
