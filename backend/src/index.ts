'use strict';
require('dotenv').config();

const express       = require('express');
const cors          = require('cors');
const helmet        = require('helmet');
const morgan        = require('morgan');
const rateLimit     = require('express-rate-limit');

const { authRouter }          = require('./routes/auth');
const { shopRouter }          = require('./routes/shop');
const { customersRouter }     = require('./routes/customers');
const { framesRouter }        = require('./routes/frames');
const { lensesRouter }        = require('./routes/lenses');
const { accessoriesRouter }   = require('./routes/accessories');
const { ordersRouter }        = require('./routes/orders');
const { labOrdersRouter }     = require('./routes/labOrders');
const { repairsRouter }       = require('./routes/repairs');
const { prescriptionsRouter } = require('./routes/prescriptions');
const { staffRouter }         = require('./routes/staff');
const { invoicesRouter }      = require('./routes/invoices');
const { reportsRouter }       = require('./routes/reports');
const { errorHandler }        = require('./middleware/errorHandler');

const app  = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

app.set('trust proxy', 1);
app.use(helmet());

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: function(origin, cb) {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    if (/https:\/\/lensflow.*\.vercel\.app$/.test(origin)) return cb(null, true);
    if (/\.vercel\.app$/.test(origin)) return cb(null, true);
    return cb(null, true); // Allow all for now
  },
  credentials: true,
}));

const globalLimiter = rateLimit({ windowMs: 15*60*1000, max: 300 });
const authLimiter   = rateLimit({ windowMs: 15*60*1000, max: 15  });

app.use('/api/', globalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

app.get('/health',     function(req, res) { res.json({ status: 'ok' }); });
app.get('/api/health', function(req, res) { res.json({ status: 'ok', version: '1.0.0' }); });

app.use('/api/auth',          authLimiter, authRouter);
app.use('/api/shop',          shopRouter);
app.use('/api/customers',     customersRouter);
app.use('/api/frames',        framesRouter);
app.use('/api/lenses',        lensesRouter);
app.use('/api/accessories',   accessoriesRouter);
app.use('/api/orders',        ordersRouter);
app.use('/api/lab-orders',    labOrdersRouter);
app.use('/api/repairs',       repairsRouter);
app.use('/api/prescriptions', prescriptionsRouter);
app.use('/api/staff',         staffRouter);
app.use('/api/invoices',      invoicesRouter);
app.use('/api/reports',       reportsRouter);

app.use(function(req, res) {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', function() {
  console.log('LensFlow API running on port ' + PORT);
});

module.exports = app;
