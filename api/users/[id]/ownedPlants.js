const cors = require('cors');
const { getConnection } = require('../../db');

const corsMiddleware = cors({
  origin: 'https://plant-protector-frontend.vercel.app',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

const handler = async (req, res) => {
  await new Promise((resolve, reject) => {
    corsMiddleware(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      resolve();
    });
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const db = await getConnection();

  // Manually parse the ID from the URL
  const urlParts = req.url.split('/');
  const id = urlParts[urlParts.indexOf('users') + 1]; // Get the segment after 'users'
  console.log("Extracted ID:", id);

  if (req.method === 'GET') {
    try {
      const [rows] = await db.query('SELECT owned_plants FROM users WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      res.json({ success: true, ownedPlants: rows[0].owned_plants || [] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

module.exports = handler;
