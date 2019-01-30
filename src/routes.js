import { Router } from 'express';
import { asyncHandler } from './utils';
import { worker } from './index';
import { auth } from './auth';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { Trading_session } from './Model/Trading_session.js';

export const routes = Router();
export const sess = session({
  secret: 'chopcryptmzfcka',
  cookie: {secure: true}
});

routes.use(cookieParser());
routes.use(sess);

/**
 * GET home page
 */
routes.get('/', auth, asyncHandler(async(req, res) => {
  const symbolsResp = await worker.getSymbols();
  res.render('index', { locals:
    {
      symbols: symbolsResp,
      symbol: worker.chopchop.core.symbol,
      session: worker.chopchop.trader.activeSession,
      balance: worker.chopchop.trader.balance,
      mode: worker.chopchop.mode,
      ema: worker.chopchop.indicators.ema,
      candlesOffset: worker.chopchop.core.trades.timezoneOffset
    }
  });
}));

/**
 * GET log page
 */
routes.get('/log', auth, asyncHandler(async(req, res) => {
  const sessions = await Trading_session.all();
  const history = await worker.chopchop.trader.getHistory();
  res.render('log', { locals:
    {
      sessions: sessions.collection,
      session: worker.chopchop.trader.activeSession,
      history: history,
      mode: worker.chopchop.mode
    }
  });
}));

/**
 * GET auth page
 */
routes.get('/auth', asyncHandler(async(req, res) => {
  res.render('auth');
}));

/**
 * POST auth page
 */
routes.post('/auth', auth, asyncHandler(async(req, res) => {
  res.redirect('/');
}));

/**
 * GET logout page
 */
routes.get('*/logout', asyncHandler(async(req, res) => {
  req.session.userId = undefined;
  res.redirect('/auth');
}));

/**
 * GET error 404 page
 */
routes.get('/*', asyncHandler(async(req, res) => {
  res.render('error', { locals: { status: 404, message: `Page not found`, text: `Go to <a href="${req.protocol}://${req.get('host')}/">home page</a>` } });
}));
