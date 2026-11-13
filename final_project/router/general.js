const express = require('express');
const axios = require('axios');
const books = require('./booksdb.js');
const { registerUser } = require('./auth_users.js');
const public_users = express.Router();

// The local catalog endpoint supplies the provided JSON data to Axios.
public_users.get('/catalog', (req, res) => res.json(books));
const catalog = () => axios.get(
  'http://127.0.0.1:' + (process.env.PORT || 5000) + '/catalog',
  { timeout: 5000, proxy: false }
);

// Task 10: retrieve all books with an Axios Promise callback.
public_users.get('/', (req, res, next) => {
  catalog().then(response => res.json(response.data)).catch(next);
});

// Task 11: retrieve a book by ISBN with Axios and async/await.
public_users.get('/isbn/:isbn', async (req, res, next) => {
  try {
    const { data } = await catalog();
    const book = data[req.params.isbn];
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    return res.json(book);
  } catch (error) { return next(error); }
});

// Task 12: retrieve every matching author with an Axios Promise callback.
public_users.get('/author/:author', (req, res, next) => {
  catalog().then(({ data }) => {
    const matches = Object.fromEntries(Object.entries(data).filter(
      ([, book]) => book.author.toLowerCase() === req.params.author.toLowerCase()
    ));
    res.json(matches);
  }).catch(next);
});

// Task 13: retrieve every matching title with Axios and async/await.
public_users.get('/title/:title', async (req, res, next) => {
  try {
    const { data } = await catalog();
    const matches = Object.fromEntries(Object.entries(data).filter(
      ([, book]) => book.title.toLowerCase() === req.params.title.toLowerCase()
    ));
    return res.json(matches);
  } catch (error) { return next(error); }
});

public_users.get('/review/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  if (!book) return res.status(404).json({ message: 'Book not found.' });
  return res.json(Object.keys(book.reviews).length ? book.reviews :
    { message: 'No reviews found for this book.' });
});
public_users.post('/register', (req, res) => {
  const result = registerUser(req.body.username, req.body.password);
  res.status(result.status).json({ message: result.message });
});
module.exports.general = public_users;
