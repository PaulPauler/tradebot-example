import express from 'express';
import path from 'path';
import logger from 'morgan';
import bodyParser from 'body-parser';
import es6Renderer from 'express-es6-template-engine';
import { routes } from './routes';

const app = express();

app.disable('x-powered-by');

// View engine setup
app.engine('html', es6Renderer);
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'html');

app.use(logger('dev', {
  skip: () => app.get('env') === 'test'
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

if (app.get('env') === 'production') app.set('trust proxy', 1);

app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/', routes);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  res
    .status(err.status || 500)
    .render('error', { locals: {
      status: err.status || 500,
      message: err.message,
      stack: err.stack || ""
    }});
});

export default app;
