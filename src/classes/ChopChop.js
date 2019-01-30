import { Indicators } from './chopchop/Indicators.js';
import { Core } from './chopchop/Core.js';
import { Test } from './chopchop/trading/Test.js';
import { Trading } from './chopchop/trading/Trading.js';
import { Test_order } from '../Model/Test_order.js';
import { Real_order } from '../Model/Real_order.js';

export class ChopChop {
  constructor(startingShare) {
    this.core = new Core();
    this.indicators = new Indicators(this.core);
    this.tradingStatus = 'stopped';
    this.mode;

    if(startingShare && typeof startingShare == 'object') this.share(startingShare, true);
  }

  async startTrading(type){
    if(!type || (type != 'test' && type != 'trading')) return console.log(`Please set type trading "test" or "trading"`);

    if (this.tradingStatus == 'stopped'){
      this.trader = type == 'trading' ? new Trading(this.core, this.indicators, this.restClient, this.wsClient) : new Test(this.core, this.indicators);
      this.share({trader: this.trader}, true);
      if(this.core.activeSession) {
        this.trader.activeSession = this.core.activeSession;
        // Get my orders from db
        const orders = type == 'trading' ? await Real_order.where({session_id: this.core.activeSession.id}).get() : await Test_order.where({session_id: this.core.activeSession.id}).get();
        this.trader.history = orders.collection;
        this.trader.subscribe();
      }
      this.tradingStatus = 'trading';
      this.mode = this.core.mode = this.trader.constructor.name.toLowerCase();
    } else {
      return console.log(`Trading has already begun in ${this.mode} mode. You can stop it by "stopTrading" command`);
    }
  }

  stopTrading(){
    this.tradingStatus = 'stopped';
  }

  async trading(functions, params){
    const trading = [];

    this.trader.getStatus();

    if (typeof functions == 'string') trading.push(functions);
    else if (Array.isArray(functions)) trading.push(...functions);
    else  throw new Error('Error. Need string or array');

    const eArr = await this.asyncForEach(trading, async (name) => {
      if(this.trader[name] && typeof this.trader[name] == 'function'){
        await this.trader[name](params);
      } else {
        console.log(`Function ${name} does not exist`);
      }
    });

    if (eArr && eArr.length > 0) throw eArr;
    return 'Success';
  }

  share(obj, core = false){
    if (!obj || typeof obj != 'object') {
        console.log("Error. Need object { name: value }");
        return false;
    }
    Object.keys(obj).forEach((key) => {
      core ? this.core[key] = obj[key] : this[key] = obj[key];
    });

    this.indicators.refresh();
  }

  async asyncForEach(array, callback) {
    const eArr = [];

    for (let index = 0; index < array.length; index++) {
      try {
        await callback(array[index], index, array);
      }
      catch(e) {
        eArr.push(e);
      }
    }
    if (eArr.length > 0) return eArr;
  }
}
