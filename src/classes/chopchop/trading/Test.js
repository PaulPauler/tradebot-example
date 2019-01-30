import { Base } from './Base.js';
import { Database } from '../../../database';
import { asyncWait } from '../../../utils.js';
import { Test_order } from '../../../Model/Test_order.js';
import { Trading_session } from '../../../Model/Trading_session.js';

export class Test extends Base{
  constructor(core, indicators){
    super(core, indicators);
    this.ordersTable = 'test_orders';
  }

  async chopMoney(params){
    //Get last order id
    let counter = 1;
    let changed = false;
    if(this.history.length == 0 && this.indicators.ema.toArray.length > 1){
      let lastOrder = await Test_order.last();
      if(lastOrder.id) {
        counter = lastOrder.id;
      }
      this.indicators.ema.toArray.forEach((ema, index) => {
        if(index < this.indicators.ema.toArray.length - 1){
          let curCandle = this.core.candles.all[index + this.indicators.ema.period - 1];
          let openDate = new Date(curCandle.date);

          const price = Number(this.core.candles.all[index + this.indicators.ema.period - 2].close);
          let newOrder;

          if(price && openDate.getTime() >= this.activeSession.startDate &&
          (this.activeSession.endDate == 'Not ended' || openDate.getTime() <= this.activeSession.endDate)){
            if(ema < price){
              newOrder = { date: curCandle.date, type: "buy", price: curCandle.low, low: curCandle.low, high: curCandle.high };
            } else {
              newOrder = { date: curCandle.date, type: "sell", price: curCandle.high, low: curCandle.low, high: curCandle.high };
            }

            if(this.history.length == 0 ||
              (this.history.length > 0 &&
              this.history[this.history.length - 1].side != newOrder.type)) {

                let quantity = newOrder.type == 'buy' ? this.activeSession.balance.quote.available / price : this.activeSession.balance.base.available;

                //Need to change fee
                let fee = quantity * price * 0.1 / 100;
                let total = quantity * price - fee;

                let newTrade = { session_id: this.activeSession.id, id: counter, orderId: 'test', symbol: this.core.symbol, side: newOrder.type, quantity: quantity, price: price, low: newOrder.low, high: newOrder.high, fee: fee, total: total, timestamp: newOrder.date };
                this.history.push(newTrade);
                this.indicators.chartParams.tradesArray.push(newOrder);

                if(newOrder.type == 'buy' && this.activeSession.balance.quote.available > 0){
                  this.activeSession.balance.base.available = total / price;
                  this.activeSession.balance.quote.available = 0;
                  changed = true;
                }
                if(newOrder.type == 'sell' && this.activeSession.balance.base.available > 0){
                  this.activeSession.balance.quote.available = total;
                  this.activeSession.balance.base.available = 0;
                  changed = true;
                }

                if(newTrade && changed){
                  counter++;
                  this.calculateProfit(newTrade.price);
                  Test_order.create(newTrade);
                }
              }
          }

          if(this.activeSession.endDate != 'Not ended' && openDate.getTime() > this.activeSession.endDate){
            this.endSession(this.activeSession.endDate);
          }
        }
      });
    }
    if(changed) {
      await Trading_session.where({id: this.activeSession.id}).update({balance: this.activeSession.balance, profit: this.activeSession.profit});
    }
    await asyncWait(2000);
  }
}
