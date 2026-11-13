const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const books = require('./booksdb.js');
const regd_users = express.Router();
const users = new Map();
const tokenSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

function registerUser(username, password) {
  if (typeof username !== 'string' || !username.trim() ||
      typeof password !== 'string' || !password) {
    return { status: 400, message: 'Username and password are required.' };
  }
  if (users.has(username)) return { status: 409, message: 'Username already exists.' };
  const salt = crypto.randomBytes(16).toString('hex');
  users.set(username, { salt, hash: crypto.scryptSync(password, salt, 64) });
  return { status: 201, message: 'User successfully registered. You can now log in.' };
}
function authenticatedUser(username, password) {
  const user = users.get(username);
  return typeof password === 'string' && !!user &&
    crypto.timingSafeEqual(user.hash, crypto.scryptSync(password, user.salt, 64));
}
function authenticate(req, res, next) {
  const sessionUser = req.session.authorization;
  if (!sessionUser) return res.status(401).json({ message: 'Please log in first.' });
  try {
    const payload = jwt.verify(sessionUser.accessToken, tokenSecret);
    if (payload.username !== sessionUser.username) throw new Error('Invalid session');
    req.username = payload.username;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
}
regd_users.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!authenticatedUser(username, password)) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }
  req.session.authorization = {
    username, accessToken: jwt.sign({ username }, tokenSecret, { expiresIn: '1h' })
  };
  return res.json({ message: 'User successfully logged in.' });
});
regd_users.put('/auth/review/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  if (!book) return res.status(404).json({ message: 'Book not found.' });
  const review = req.query.review;
  if (typeof review !== 'string' || !review.trim()) {
    return res.status(400).json({ message: 'A non-empty review is required.' });
  }
  book.reviews[req.username] = review;
  return res.json({ message: 'Review successfully added or updated.', reviews: book.reviews });
});
regd_users.delete('/auth/review/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  if (!book) return res.status(404).json({ message: 'Book not found.' });
  if (!Object.hasOwn(book.reviews, req.username)) {
    return res.status(404).json({ message: 'No review found for this user.' });
  }
  delete book.reviews[req.username];
  return res.json({ message: 'Review successfully deleted.', reviews: book.reviews });
});
module.exports = { authenticated: regd_users, registerUser, authenticatedUser, authenticate };
