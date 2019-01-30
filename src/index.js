import app from './app';
import http from 'http';
import https from 'https';
import fs from 'fs';
import helmet from 'helmet';
import socketIo from 'socket.io';

import { Worker }  from './worker';
import { Database } from './database';
import { sess } from './routes.js';
import sharedsession from 'express-socket.io-session';
import { Trading_session } from './Model/Trading_session.js';

const {
  PORT = 8080,
  PORT_SSL = 8443,
  KEY_FILE = undefined,
  CERT_FILE = undefined,
  DH_FILE = undefined,
  CA_FILE = undefined
} = process.env;

const sslOptions = {
  key: KEY_FILE && fs.readFileSync(KEY_FILE),
  cert: CERT_FILE && fs.readFileSync(CERT_FILE),
  dhparam: DH_FILE && fs.readFileSync(DH_FILE),
  ca: CA_FILE && fs.readFileSync(CA_FILE)
};

// Redirect to HTTPS server
http.createServer(function (req, res) {
    const hostname = ( req.headers.host.match(/:/g) ) ? req.headers.host.slice( 0, req.headers.host.indexOf(":") ) : req.headers.host;
    res.writeHead(301, { "Location": `https://${hostname}${PORT_SSL === 443 ? "" : ":" + String(PORT_SSL)}${req.url}` });    //`
    res.end();
}).listen(PORT);

app.use(helmet());

const httpsServer = https.createServer(sslOptions, app);
const io = socketIo(httpsServer);

httpsServer.listen(PORT_SSL);

export let worker = new Worker('BTCUSD');

const bootstrap = async () => {
  const ioSockets = [];

  await Database.connect();

  const lastSession = await Trading_session.last();
  let params;

  if(lastSession.active) {
    params = {
      symbol: lastSession.balance.base.currency + lastSession.balance.quote.currency,
      activeSession: lastSession
    };
  } else {
    params = {};
  }
  await worker.initWorker(params);

  io.use(sharedsession(sess, {
    autoSave:true
  }));
  io.use((socket, next) => {
    if (socket.handshake.session && socket.handshake.session.userId) return next();
    console.error(new Error('Websocket: Authentication error'));
    next(new Error('Websocket: Authentication error'));
  });

  process.on('SIGINT', async () => {
    await worker.stop();
    ioSockets.forEach(socket => {
      if (socket && socket.close && typeof socket == "function") socket.close();
    });
    process.exit();
  });

  io.on('connection', (socket) => {
    ioSockets.push(socket);

    socket.on('disconnect', (socket) => {
      ioSockets.splice(ioSockets.indexOf(socket), 1);
    });

    io.clients((error, clients) => {
      if (error) throw error;
      console.log(`io sockets connected: ${clients.length}`);
      // console.log(`io sockets connected: ${ioSockets.length}`);
    });


    worker.subscribe(
      {
        ticker: (ticker) => {
          socket.emit('ticker', ticker);
        },
        trades: (lastTrades) => {
          socket.emit('trades', lastTrades);
        },
        candles: (candles, params) => {
          socket.emit('candles', candles, params);
        },
        ema: (ema) => {
          socket.emit('ema', ema);
        }
      }
    );

    socket.on('setOptions', (data, cbc) => {
      worker.setOptions(data)
      .then(res => cbc(false, res))
      .catch(eArr => {
        if(eArr.length > 0){
          eArr.forEach((error) =>{
            console.error(error);
          });
          cbc({ error: eArr[0].message });
        }
      });
    });

    socket.on('startSession', (data, cbc) => {
      worker.chopchop.trading(['startSession'], data)
      .then(res => cbc(false, res))
      .catch(eArr => {
        if(eArr.length > 0){
          eArr.forEach((error) =>{
            console.error(error);
          });
          cbc({ error: eArr[0].message });
        }
      });
    });

    socket.on('endSession', (cbc) => {
      worker.chopchop.trading(['endSession'])
      .then(res => cbc(false, res))
      .catch(eArr => {
        if(eArr.length > 0){
          eArr.forEach((error) =>{
            console.error(error);
          });
          cbc({ error: eArr[0].message });
        }
      });
    });

    socket.on('clearHistory', (cbc) => {
      worker.chopchop.trading(['clearHistory'])
      .then(res => cbc(false, res))
      .catch(eArr => {
        if(eArr.length > 0){
          eArr.forEach((error) =>{
            console.error(error);
          });
          cbc({ error: eArr[0].message });
        }
      });
    });

    socket.on('init-candles', (cbc) => {
      cbc(worker.chopchop.core.candles.all, worker.chopchop.indicators.chartParams);
    });

    socket.on('status', (cbc) => {
      cbc(worker.isRunning ? "Worker is running" : "Worker is stopped");
    });
    socket.on('newOrder', async (data, cbc) => {
      try {
        const res = await worker.newOrder(data);
        cbc(JSON.stringify(res));
      }
      catch (e){
        if(e.code && e.message) {
          cbc(`Error ${e.code}: ${e.message}`);
        }
        else {
          cbc(JSON.stringify(e));
        }
      }
    });
  });
};

bootstrap();
