const { getConnection } = require('../../db');

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://plant-protector-frontend.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const db = await getConnection();
  const urlParts = req.url.split('/');
  const id = urlParts[urlParts.indexOf('users') + 1]; // Get the segment after 'users'
  console.log("Extracted ID:", id);
  const { plantName } = req.body;
  plantName = plantName[0]
  console.log(plantName)

  if (req.method === 'PUT') {
    try {
      const [rows] = await db.query('SELECT owned_plants FROM users WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      let ownedPlants = rows[0].owned_plants || [];
      ownedPlants.push({ name: plantName, lastWatered: new Date().toLocaleString() });

      await db.query('UPDATE users SET owned_plants = ? WHERE id = ?', [JSON.stringify(ownedPlants), id]);
      res.json({ success: true, message: 'Plant added successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

module.exports = handler;
