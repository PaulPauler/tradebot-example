import https from 'https';
import axios from 'axios';

export class HitBTCv2 {
  // static WebsocketClient = HitBTCWebsocketClient;

  constructor({ key, secret }) {
    this.key = key;
    this.secret = secret;
    this.baseUrl = `https://api.hitbtc.com/api/2/`;
    this.httpsAgent = new https.Agent({ keepAlive: true });
    this.axios = axios.create({
      method: 'get',
      baseURL: this.baseUrl,
      httpsAgent: this.httpsAgent,
      responseType: 'json'
    });
  }

  requestPublic (endpoint, params = {}) {
    // console.log(endpoint);

    return this.axios.request({
      url: `/public${endpoint}`,
      params: params
    })
    .then(res => res.data);
    // .catch(err => { throw new Error(err.response.data); });

  }

  requestAuth (method, endpoint, params = {}) {
    const objParams = (method === 'get') ? { params: params } : { data: params };
    return this.axios.request({
      url: `/${endpoint}`,
      auth: {
        username: this.key,
        password: this.secret
      },
      ...objParams
    })
    .then(res => res.data)
    .catch(err => { throw new Error(err.response.data); });
  }


  // Public methods
  getCurrency = (currency) => this.requestPublic(`/symbol${ (currency) ? '/' + currency : '' }`);
  getSymbol = (symbol) => this.requestPublic(`/symbol${ (symbol) ? '/' + symbol : '' }`);
  getTicker = (symbol) => this.requestPublic(`/ticker${ (symbol) ? '/' + symbol : '' }`);
  getTrades = (symbol, params) => this.requestPublic(`/trades/${symbol}`, params);
  getOrderBook = (symbol, params) => this.requestPublic(`/orderbook/${symbol}`, params);
  getCandels = (symbol, params) => this.requestPublic(`/candels/${symbol}`, params);

  // Authenticated methods
  getOrder = (params) => this.requestAuth('get', `/order`, params);
  postOrder = (params) => this.requestAuth('post', `/order`, params);
  deleteOrder = (params) => this.requestAuth('delete', `/order`, params);

  getOrderByClientOrderId = (id, params) => this.requestAuth('get', `/order/${id}`, params);
  putOrderByClientOrderId = (id, params) => this.requestAuth('put', `/order/${id}`, params);
  deleteOrderByClientOrderId = (id, params) => this.requestAuth('delete', `/order/${id}`, params);

  getTradingBalance = () => this.requestAuth('get', `/trading/balance`);
  getTradingFee = (symbol) => this.requestAuth('get', `/trading/fee/${symbol}`);

  getHistoryTrades = (params) => this.requestPath('get', `/history/trades`, params);
  getHistoryOrder = (params) => this.requestPath('get', `/history/order`, params);
  getHistoryTradesByOrder = (id) => this.requestPath('get', `/history/order/${id}/trades`);

  getAccountBalance = () => this.requestPath('get', `/account/balance`);

  getAccountTransactions = (params) => this.requestPath('get', `/account/transactions`, params);
  getAccountTransactionsById = (id) => this.requestPath('get', `/account/transactions/${id}`);

  postAccountCryptoWithdraw = (params) => this.requestPath('post', `/account/crypto/withdraw`, params);
  putAccountCryptoWithdrawById = (id, params) => this.requestPath('put', `/account/crypto/withdraw/${id}`, params);
  deleteAccountCryptoWithdrawById = (id) => this.requestPath('delete', `/account/crypto/withdraw/${id}`);

  getAccountCryptoAddress = (currency) => this.requestPath('get', `/account/crypto/address/${currency}`);
  postAccountCryptoAddress = (currency) => this.requestPath('get', `/account/crypto/address/${currency}`);

  postAccountTransfer = (params) => this.requestPath('get', `/account/transfer`, params);
}
