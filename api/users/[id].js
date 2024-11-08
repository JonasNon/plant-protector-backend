const { getConnection } = require('../db');

const handler = async (req, res) => {
  const db = await getConnection();
  const { id } = req.query;

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
  } else if (req.method === 'PUT') {
    const { action, plantName, lastWatered } = req.body;
    try {
      const [rows] = await db.query('SELECT owned_plants FROM users WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      let ownedPlants = rows[0].owned_plants || [];

      if (action === 'add') {
        ownedPlants.push({ name: plantName, lastWatered: new Date().toLocaleString() });
      } else if (action === 'remove') {
        ownedPlants = ownedPlants.filter((plant) => plant.name !== plantName);
      } else if (action === 'update') {
        const plant = ownedPlants.find((p) => p.name === plantName);
        if (plant) plant.lastWatered = lastWatered;
      }

      await db.query('UPDATE users SET owned_plants = ? WHERE id = ?', [JSON.stringify(ownedPlants), id]);
      res.json({ success: true, message: `Plant ${action} successfully` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

module.exports = handler;