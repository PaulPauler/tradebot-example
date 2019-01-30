import * as Async from 'async';
import { Database } from '../../../database';
import { Trading_session } from '../../../Model/Trading_session.js';
import { Test_order } from '../../../Model/Test_order.js';
import { Real_order } from '../../../Model/Real_order.js';

export class Base {
  // Base class for trading
  constructor(core, indicators){
    this.core = core;
    this.indicators = indicators;

    this.balance = {};
    this.history = [];
  }

  getStatus(){
    if((this.core.trades && this.core.candles && this.constructor.name == 'Test') ||
    (this.core.trades && this.core.candles && this.restClient && this.wsClient && this.constructor.name == 'Trading')){
      console.log(`Chop Chop is ready to trade in ${this.constructor.name} mode`);
      return true;
    } else {
      console.log("Chop Chop not ready. Please try later");
      return false;
    }
  }

  async startSession(params){
    if(this.activeSession) throw new Error('Session has already been started.');

    this.core.symbols.map((item) => {if(item.id == this.core.symbol) this.curSym = item;});
    this.core.balance.map((item) => {
      if(item.currency == this.curSym.baseCurrency) this.balance.base = item;
      if(item.currency == this.curSym.quoteCurrency) this.balance.quote = item;
    });

    let firstType;
    let secondType;
    let coins;
    let currency;

    if(Number(params.starting_balance_base) > 0 || Number(params.starting_balance_quote) > 0){
     if(Number(params.starting_balance_base) > 0){
        firstType = 'base';
        secondType = 'quote';
        coins = Number(params.starting_balance_base);
        currency = this.curSym.baseCurrency;
      } else {
        firstType = 'quote';
        secondType = 'base';
        coins = Number(params.starting_balance_quote);
        currency = this.curSym.quoteCurrency;
      }
    } else {
      throw new Error('You did not specify the starting amount.');
    }

    //Making starting balance for Testing mode
    if(this.constructor.name == 'Test') {
      this.balance[firstType].available = coins;
      this.balance[secondType].available = 0;
    }

    //Errors
    if(this.balance[firstType].available <= 0) throw new Error('Insufficient funds in the account.');
    if(coins > this.balance[firstType].available) throw new Error(`On your account ${this.balance[firstType].available}${this.balance[firstType].currency}. Please enter a value less than or equal to this.`);

    let candlesParams;
    let tradesParams;
    let emaParams;

    if(this.core.trades) {
      tradesParams = {
        range: this.core.trades.tradesRange,
        offset: this.core.trades.timezoneOffset
      };
    }
    if(this.core.candles) {
      candlesParams = {
        range: this.core.candles.params.range
      };
    }
    if(this.indicators.ema) {
      emaParams = {
        period: this.indicators.ema.period
      };
    }

    //Starting new session
    this.activeSession = {
      active: true,
      starting_balance: {
        available: coins,
        currency: currency
      },
      balance: {},
      params: {
        candles: candlesParams,
        trades: tradesParams,
        ema: emaParams,
      },

      profit: {
        value: 0
      }
    };

    //Get last session id
    let lastSession = await Trading_session.last();
    if(!lastSession.id) lastSession = {id: 0};

    this.activeSession.id = lastSession.id + 1;

    this.activeSession.balance[firstType] = {
      currency: this.balance[firstType].currency,
      available: coins
    };
    this.activeSession.balance[secondType] = {
      currency: this.balance[secondType].currency,
      available: 0
    };

    //Generate default startDate
    let makeOffset = new Date();
    makeOffset.setDate(makeOffset.getDate() - this.core.trades.tradesRange + this.indicators.ema.period);
    let startDateDefault = this.constructor.name == 'Test' ? new Date(makeOffset.getFullYear(), makeOffset.getMonth(), makeOffset.getDate(), 0 + this.core.trades.timezoneOffset).getTime() : Date.now();

    //Generate default endDate
    let now = new Date();
    let endDateDefault = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0 + this.core.trades.timezoneOffset);

    //Save dates
    this.activeSession.startDate = params.startDate ? new Date(params.startDate).getTime() : startDateDefault;
    this.activeSession.endDate = params.endDate ? new Date(params.endDate).getTime() : 'Not ended';

    await Trading_session.create(this.activeSession);
    this.subscribe();
  }

  async endSession(date){
    if(!this.activeSession) throw new Error('Session has already been ended.');
    const obj = {active: false};
    if(!date) obj.endDate = Date.now();

    await Trading_session.where({id: this.activeSession.id}).update(obj);
    this.history = [];
    this.indicators.refresh();
    this.activeSession = undefined;
  }

  subscribe(){
    Async.doWhilst(
      Async.asyncify(() => this.chopMoney()),
      () => this.activeSession != undefined,
      (err) => {
        this.activeSession = undefined;
        if (err) {
          console.error("Trading session has been stopped with error:");
          console.error(err);
        }
        else {
          console.log("Trading session has been stopped");
        }
      }
    );
  }

  calculateProfit(price){
    let firstType;
    let secondType;
    let balance;
    if(this.activeSession.starting_balance.currency == this.activeSession.balance.base.currency){
      firstType = 'base';
      secondType = 'quote';
    } else {
      firstType = 'quote';
      secondType = 'base';
    }
    if(this.activeSession.balance[firstType].available > 0) {
      balance = this.activeSession.balance[firstType].available;
    } else {
      balance = firstType == 'base' ? this.activeSession.balance[secondType].available / price : this.activeSession.balance[secondType].available * price;
    }
    const difference = this.activeSession.starting_balance.available - balance;
    const profit = Math.abs(difference) / this.activeSession.starting_balance.available * 100;
    this.activeSession.profit.value = profit.toFixed(2);
    if(balance >= this.activeSession.starting_balance.available){
      this.activeSession.profit.sign = '+';
      this.activeSession.profit.class = 'success';
    } else {
      this.activeSession.profit.sign = '-';
      this.activeSession.profit.class = 'danger';
    }
  }

  async getHistory(){
    // const history = await My_orders.sortBy({session_id: -1, timestamp: -1}).get();

    const history = await Database.db
      .collection(this.ordersTable)
      .find()
      .sort({session_id: -1, timestamp: -1})
      .toArray();

    let newHistory = {};

    history.forEach((item) =>{
      if(!newHistory[item.session_id]) newHistory[item.session_id] = [];
      newHistory[item.session_id].unshift(item);
    });
    return newHistory;
  }

  async clearHistory(){
    this.history = [];

    if(this.core.mode == 'test'){
      await Database.db.collection(this.ordersTable).drop((err, delOK) => {
        if (err) console.log("History not finded");
        if (delOK) console.log("History has been cleared");
      });
      await Database.db.collection("trading_sessions").drop((err, delOK) => {
        if (err) console.log("Trading sessions not finded");
        if (delOK) console.log("Trading sessions has been cleared");
      });
    } else {
      const compare = this.activeSession ? {session_id: {$ne : this.activeSession.id}} : {};
      await Real_order.where(compare).update({deleted: true});
      await Trading_session.where({active: {$ne : true}}).update({deleted: true});
      console.log("Orders and inactive trading sessions has been deleted from history");
    }

    if(this.activeSession && this.core.mode == 'test') {
      this.activeSession.id = 1;
      let coins;
      let currency;
      if(this.activeSession.balance.base.available > 0){
        coins = this.activeSession.balance.base.available;
        currency = this.activeSession.balance.base.currency;
      } else {
        coins = this.activeSession.balance.quote.available;
        currency = this.activeSession.balance.quote.currency;
      }
      this.activeSession.starting_balance = {
        available: coins,
        currency: currency
      };
      this.activeSession.starting_balance.base = 1;
      this.activeSession.starting_balance.base = 1;
      await Trading_session.create(this.activeSession);
    }
  }
}
