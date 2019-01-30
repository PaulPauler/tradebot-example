export class Core{
  constructor(){
    this.symbol;
    this.symbols = {};
    this.trades;
    this.candles;
    this.callback = {};
  }

  callbackRegister(name, callback){
    this.callback[name] = callback;
  }
}
