const express = require('express');
const mysql = require('mysql2');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT || 3036;
const cors = require('cors');

// Define allowed origins for CORS
const allowedOrigins = ['https://plant-protector-frontend.vercel.app'];

// Use the CORS middleware
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// MySQL database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST, 
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});


// Allow requests from your frontend's domain


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
      console.log(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);  // Send the results as JSON
  });
});

app.get('/users/:id/ownedPlants', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.promise().query('SELECT owned_plants FROM users WHERE id = ?', [id]);
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let ownedPlants;
    if (rows[0].owned_plants === null) {
      ownedPlants = [];
    } else {
      try {
        ownedPlants = rows[0].owned_plants;
      } catch (parseError) {
        console.error("Error parsing owned_plants:", parseError);
        ownedPlants = [];
      }
    }
    res.json({ success: true, ownedPlants });

  } catch (error) {
    console.error('Error fetching owned_plants:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/users', (req, res) => {
  const { username, password, tryRegister } = req.body;

  if (tryRegister) {
    const checkUserQuery = 'SELECT username FROM users WHERE username = ?';
    db.query(checkUserQuery, [username], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const insertUserQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
      db.query(insertUserQuery, [username, password], (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Database error during user insertion' });
        }
        return res.status(201).json({ success: true, message: 'User created successfully', userId: result.insertId });
      });
    });
  } else {
    const checkUserQuery = 'SELECT id FROM users WHERE username = ? AND password = ?';
    db.query(checkUserQuery, [username, password], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length > 0) {
        return res.status(200).json({ success: true, message: 'User logged in', userId: results[0].id });
      } else {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
    });
  }
});

app.put('/users/:id/addPlant', async (req, res) => {
  const { id } = req.params;
  const { plantName } = req.body;
  
  try {
    // Retrieve the user's current `owned_plants` list
    const [rows] = await db.promise().query('SELECT owned_plants FROM users WHERE id = ?', [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let ownedPlants = [];
    if (rows[0].owned_plants !== null) {
      try {
        // Parse the owned_plants field if it contains valid JSON data
        ownedPlants = rows[0].owned_plants;
      } catch (parseError) {
        console.error("Error parsing owned_plants:", parseError);
      }
    }

    // Check if the plant is already in the list
    const plantExists = ownedPlants.some(plant => plant.name === plantName);
    if (plantExists) {
      return res.status(400).json({ success: false, message: 'Plant already exists in the owned plants list' });
    }

    // Add the new plant to the list with the current date as lastWatered
    const currentDate = new Date().toLocaleString();
    ownedPlants.push({ name: plantName[0], lastWatered: currentDate });

    // Update the database with the modified ownedPlants list
    await db.promise().query('UPDATE users SET owned_plants = ? WHERE id = ?', [JSON.stringify(ownedPlants), id]);

    res.json({ success: true, message: 'Plant added successfully' });
  } catch (error) {
    console.error('Error adding plant:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/users/:id/removePlant', async (req, res) => {
  const { id } = req.params;
  const { plantName } = req.body;

  try {
    // Retrieve the user's current `owned_plants` list
    const [rows] = await db.promise().query('SELECT owned_plants FROM users WHERE id = ?', [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let ownedPlants;
    if (rows[0].owned_plants) {
      try {
        ownedPlants = rows[0].owned_plants;
      } catch (parseError) {
        console.error("Error parsing owned_plants:", parseError);
        return res.status(500).json({ success: false, message: 'Error parsing owned plants' });
      }
    } else {
      ownedPlants = [];
    }

    // Ensure `plantName` is a string and filter ownedPlants by name
    const updatedOwnedPlants = ownedPlants.filter(plant => plant.name !== plantName);
    if (updatedOwnedPlants.length === ownedPlants.length) {
      return res.status(404).json({ success: false, message: 'Plant not found in owned plants' });
    }

    // Update the database with the modified ownedPlants list
    await db.promise().query('UPDATE users SET owned_plants = ? WHERE id = ?', [JSON.stringify(updatedOwnedPlants), id]);

    res.json({ success: true, message: 'Plant removed successfully' });
  } catch (error) {
    console.error('Error removing plant:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});



// Route to update the lastWatered date for a specific plant
app.put('/users/:id/updatePlant', async (req, res) => {
  const { id } = req.params;
  const { plantName, lastWatered } = req.body;

  console.log(id, plantName, lastWatered)

  try {
    const [rows] = await db.promise().query('SELECT owned_plants FROM users WHERE id = ?', [id]);
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let ownedPlants;
    if (rows[0].owned_plants === null) {
      return res.status(400).json({ success: false, message: 'No plants found for this user' });
    } else {
      try {
        ownedPlants = rows[0].owned_plants;
      } catch (parseError) {
        console.error("Error parsing owned_plants:", parseError);
        return res.status(500).json({ success: false, message: 'Server error parsing owned plants' });
      }
    }

    // Find the specific plant by name and update its lastWatered date
    const plantIndex = ownedPlants.findIndex(plant => plant.name === plantName);
    if (plantIndex === -1) {
      return res.status(404).json({ success: false, message: 'Plant not found' });
    }
    ownedPlants[plantIndex].lastWatered = lastWatered;

    // Update the database with the modified ownedPlants array
    await db.promise().query('UPDATE users SET owned_plants = ? WHERE id = ?', [JSON.stringify(ownedPlants), id]);

    res.json({ success: true, message: 'Plant last watered date updated successfully' });

  } catch (error) {
    console.error('Error updating plant last watered date:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});