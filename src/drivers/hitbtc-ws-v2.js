import crypto from 'crypto';
import { Client as WSClient } from 'rpc-websockets';
import uuid from 'uuid-random';

// export class WSError extends Error {
//   contructor(err) {
//   }
// }

export class HitBTCWebsocketClientv2 {
  constructor({ key, secret }) {
    this.key = key;
    this.secret = secret;
    this.url = `wss://api.hitbtc.com/api/2/ws`;
    this.ws = new WSClient(this.url);
  }

  async open() {
    return new Promise(resolve => this.ws.on("open", resolve))
    .then(() => this.ws.on("error", (data) => { throw new Error(data); }));
  }

  async login(useHash) {
    if (this.key && this.secret) {
      console.log("Loggin in" + useHash ? " using hash..." : "...");

      if(useHash) {
        const nonce = uuid() + String(Date.now()) + uuid();

        const signature = crypto
        .createHmac(`sha256`, this.secret)
        .update(nonce)
        .digest(`base64`);

        return this.ws.call("login", {
          algo: "HS256",
          pKey: this.key,
          nonce: nonce,
          signature: signature
        });
      }
      else {
        return this.ws.call("login", {
          algo: "BASIC",
          pKey: this.key,
          sKey: this.secret,
        });
      }
    }
    else {
      throw new Error("Wrong credentials");
    }
  }

  subscribe(method, cbc) {
    this.ws.on(method, cbc);
  }

  call(method, params) {
    return this.ws.call(method, params);
  }

}
