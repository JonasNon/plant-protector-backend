const express = require('express');
const mysql = require('mysql2');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT || 3036;
const cors = require('cors');

app.use(cors());
app.use(express.json());

// MySQL database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST, 
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Route to fetch all usernames
app.get('/users', (req, res) => {
  const sql = 'SELECT username, password FROM users';
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    console.log(results)
    res.json(results);  // Send the results as JSON
  });
});

app.post('/users', (req, res) => {
  console.log(req.body)
  const { username, password } = req.body;

  // Check if the username already exists
  const checkUserQuery = 'SELECT username FROM users WHERE username = ?';
  db.query(checkUserQuery, [username], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length > 0) {
      // Username already exists
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Username is unique, insert new user
    const insertUserQuery = 'INSERT INTO users (id, username, password) VALUES (null, ?, ?)';
    db.query(insertUserQuery, [username, password], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error during user insertion' });
      }

      // Successfully inserted user
      res.status(201).json({ success: true, message: 'User created successfully' });
    });
  });
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});