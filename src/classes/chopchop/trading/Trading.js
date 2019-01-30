import { Base } from './Base.js';
import { Database } from '../../../database';
import { asyncWait } from '../../../utils.js';
import { Real_order } from '../../../Model/Real_order.js';
import { Trading_session } from '../../../Model/Trading_session.js';

export class Trading extends Base{
  constructor(core, indicators, restClient, wsClient){
    super(core, indicators);
    this.restClient = restClient;
    this.wsClient = wsClient;
    this.ordersTable = 'real_orders';
  }

  async chopMoney(params){
    //Agressive mode
    let agressive = false;

    //Get last order id
    let counter = 1;
    let changed = false;

    if(this.indicators.ema.toArray.length > 1){
      let lastOrder = await Real_order.last();
      if(lastOrder.id) {
        counter = lastOrder.id;
      }

      let curCandle = this.core.candles.all[this.core.candles.all.length - 1];
      let openDate = new Date(curCandle.date);

      //Need from exchange
      const price = Number(this.core.candles.all[this.core.candles.all.length - 2].close);
      //
      let newOrder;

      if(price && openDate.getTime() >= this.activeSession.startDate &&
      (this.activeSession.endDate == 'Not ended' || openDate.getTime() <= this.activeSession.endDate)){
        if(this.indicators.ema.toArray[this.indicators.ema.toArray.length - 2] < price){
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
              Real_order.create(newTrade);
            }
          }
      }

      if(this.activeSession.endDate != 'Not ended' && openDate.getTime() > this.activeSession.endDate){
        this.endSession(this.activeSession.endDate);
      }
    }
    if(changed) {
      await Trading_session.where({id: this.activeSession.id}).update({balance: this.activeSession.balance, profit: this.activeSession.profit});
    }
    await asyncWait(agressive ? 1000 : 15000);
  }
}
