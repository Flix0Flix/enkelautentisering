// server.js
import express from 'express';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createId } from '@paralleldrive/cuid2';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const db = new sqlite3.Database("database.db");

// Session storage
const sessions = {};

// Middleware
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  
  // Basic validation
  if (!username || !email || !password) {
    return res.status(400).send('All fields are required');
  }

  // Check if user exists
  db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    
    if (row) {
      return res.status(400).send('Email already registered');
    }

    // Insert new user
    db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, password], // In a real app, hash the password!
      function(err) {
        if (err) {
          return res.status(500).send('Registration failed');
        }
        res.redirect('/login');
      }
    );
  });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).send('Email and password are required');
  }

  db.get(
    'SELECT id, username FROM users WHERE email = ? AND password = ?',
    [email, password],
    (err, user) => {
      if (err || !user) {
        return res.status(401).render('login', { error: 'Invalid credentials' });
      }

      // Create session
      const sessionId = createId();
      sessions[sessionId] = { userId: user.id };
      res.cookie('sessionId', sessionId, { httpOnly: true });
      res.redirect('/dashboard');
    }
  );
});

app.get('/dashboard', (req, res) => {
  const sessionId = req.cookies.sessionId;
  const session = sessions[sessionId];

  if (!session) {
    return res.redirect('/login');
  }

  db.get(
    'SELECT username FROM users WHERE id = ?',
    [session.userId],
    (err, user) => {
      if (err || !user) {
        return res.redirect('/login');
      }
      res.render('dashboard', { username: user.username });
    }
  );
});

app.get('/logout', (req, res) => {
  const sessionId = req.cookies.sessionId;
  delete sessions[sessionId];
  res.clearCookie('sessionId');
  res.redirect('/login');
});

app.listen(3000, err => {
  if(err) {
    console.error(err);
  } else {
    console.log('Server running on http://localhost:3000');
  }
});