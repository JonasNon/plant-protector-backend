const { getConnection } = require('../db');

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://plant-protector-frontend.vercel.app'); // Adjust the URL if needed
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Handle the CORS preflight request
  }

  const db = await getConnection();

  if (req.method === 'GET') {
    try {
      const [results] = await db.query('SELECT username, password FROM users');
      res.json(results);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error' });
    }
  } else if (req.method === 'POST') {
    const { username, password, tryRegister } = req.body;
    try {
      if (tryRegister) {
        const [existingUser] = await db.query('SELECT username FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        const [result] = await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
        res.status(201).json({ success: true, message: 'User created successfully', userId: result.insertId });
      } else {
        const [user] = await db.query('SELECT id FROM users WHERE username = ? AND password = ?', [username, password]);
        if (user.length > 0) {
          res.status(200).json({ success: true, message: 'User logged in', userId: user[0].id });
        } else {
          res.status(401).json({ error: 'Invalid username or password' });
        }
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

module.exports = handler;
