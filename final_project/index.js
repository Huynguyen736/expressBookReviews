const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const { authenticated, authenticate } = require('./router/auth_users.js');
const { general } = require('./router/general.js');
const app = express();
app.use(express.json());
app.use('/customer', session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 3600000 }
}));
app.use('/customer/auth', authenticate);
app.use('/customer', authenticated);
app.use('/evidence', express.static(__dirname + '/evidence'));
app.use('/', general);
app.use((error, req, res, next) => {
  console.error(error.message);
  res.status(500).json({ message: 'Unable to process request.' });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Book review server listening on port ' + PORT));
