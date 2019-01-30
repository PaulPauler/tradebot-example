import * as Async from 'async';
import { HitBTCv2 } from './drivers/hitbtc-v2';
import { HitBTCWebsocketClientv2 } from './drivers/hitbtc-ws-v2';
import { asyncWait, compareObjects } from './utils.js';
import { Database } from './database';
import { Trades } from './classes/Trades.js';
import { Candles } from './classes/Candles.js';
import { ChopChop } from './classes/ChopChop.js';
import UUID from 'uuid-random';

export class Worker {
  constructor(symbol) {
    this.restClient;
    this.wsClient;
    this.symbol = symbol;
    this.chopchop = new ChopChop({symbol: this.symbol});

    // ticker
    this.ticker;

    this.isRunning = false;

    console.log(`Worker for symbol '${this.symbol}' created`);
    this.restClient = new HitBTCv2({ key: "495060bc7f1747fee6cf54c93b486c54", secret: "38c2a8a1e1ec4c61895ddb0a7c3346d9"});
    this.wsClient = new HitBTCWebsocketClientv2({ key: "495060bc7f1747fee6cf54c93b486c54", secret: "38c2a8a1e1ec4c61895ddb0a7c3346d9"});
    this.chopchop.share({restClient: this.restClient, wsClient: this.wsClient});
  }

  async initWorker(params) {
    if(params.symbol){
      this.symbol = this.chopchop.core.symbol = params.symbol;
      console.log(`An active session was found. Symbol changed to '${this.symbol}`);
    }
    if(params.activeSession){
      if(params.activeSession.params.ema.period && this.chopchop.indicators.ema){
        this.chopchop.indicators.ema.period = params.activeSession.params.ema.period;
      }
      this.chopchop.share({activeSession: params.activeSession}, true);
    }

    // Load recent trades
    await this.wsClient.open();
    console.log(await this.wsClient.login(false));

    let balance;
    await this.wsClient.call("getTradingBalance", {}).then(data => balance = data);
    this.chopchop.share({balance: balance}, true);

    await this.wsClient.call("getOrders", {}).then(data => console.log("Active Orders:", data));
    await this.wsClient.call("subscribeTrades", {
      symbol: this.symbol
    });

    this.wsClient.subscribe("ticker", data => {
      this.ticker = data;
      if(this.chopchop.core.callback.ticker) this.chopchop.core.callback.ticker(this.ticker);
    });
    this.start();

    //Init trades and share it in ChopChop Core
    this.trades = new Trades(this.chopchop);
    this.chopchop.share({trades: this.trades}, true);

    //Init candles and share it in ChopChop Core
    this.candles = new Candles(this.chopchop);
    this.chopchop.share({candles: this.candles}, true);

    //Subscribe to indicators
    this.chopchop.indicators.subscribe(['EMA']);

    //Get symbols from stock and share it in ChopChop Core
    const symbols = await this.getSymbols();
    this.chopchop.share({symbols: symbols}, true);

    //Starting trading: "test" or "trading" modes
    this.chopchop.startTrading('test');
    // this.chopchop.startTrading('trading');
  }

  async newOrder(params) {
    const uuid = UUID().replace(/-/g, "");
    return this.wsClient.call("newOrder", {
      clientOrderId: uuid,
      symbol: this.symbol,
      ...params
    });
  }

  async setOptions(options){
    if(this.trades.timezoneOffset != options.timezone_offset){
      if(this.chopchop.trader.activeSession && this.chopchop.trader.activeSession.active) await this.chopchop.trading(['endSession']);
      this.trades.timezoneOffset = this.chopchop.indicators.chartParams.timezoneOffset = Number(options.timezone_offset);
      await this.chopchop.core.trades.rebuild();
    }

    /*Change ema*/
    if(this.chopchop.indicators.ema.period != Number(options.ema_period)) {
      if(this.chopchop.trader.activeSession && this.chopchop.trader.activeSession.active) await this.chopchop.trading(['endSession']);
      this.chopchop.indicators.ema.change({period: Number(options.ema_period)});
      this.chopchop.indicators.refresh();
    }

    /*Rebuild trades*/
    if(this.symbol != options.symbol) await this.restart(options.symbol);

    return 'success';
  }
  /*Ended the methods of making of trades and candles data*/

  async getSymbols() {
    return this.restClient.getSymbol();
  }

  // Lifecycle management
  async restart(symbol) {
    await this.stop();
    if(this.chopchop.trader.activeSession && this.chopchop.trader.activeSession.active) await this.chopchop.trading(['endSession']);
    if(this.symbol) this.symbol = symbol;

    await this.chopchop.core.trades.rebuild(this.symbol);

    await this.start();
  }

  async start() {
    if(this.isRunning) return;
    console.log(`Starting worker for symbol '${this.symbol}'`);
    this.isRunning = true;

    await this.wsClient.call("subscribeTrades", {
      symbol: this.symbol
    });

    await this.wsClient.call("subscribeTicker", {
      symbol: this.symbol
    });

    await this.wsClient.call("subscribeOrderbook", {
      symbol: this.symbol
    });
  }

  async stop() {
    this.isRunning = false;

    await this.wsClient.call("unsubscribeTrades", {
      symbol: this.symbol
    });

    await this.wsClient.call("unsubscribeTicker", {
      symbol: this.symbol
    });

    await this.wsClient.call("unsubscribeOrderbook", {
      symbol: this.symbol
    });

    console.log(`Worker ${this.symbol} stopped`);
  }

  subscribe(obj) {
    if (!obj || typeof obj != 'object') return console.log("Error. Need object { name: func }");

    const allowed = ['ticker', 'candles', 'trades', 'ema'];
    Object.keys(obj).forEach((key) => {
      allowed.indexOf(key) != -1 ? this.chopchop.core.callbackRegister(key, obj[key]) : console.log("No such subscription exists.");
    });
  }
}
