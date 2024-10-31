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
      console.log(err)
      return res.status(500).json({ error: 'Database error' });
    }
    // console.log(results)
    res.json(results);  // Send the results as JSON
  });
});

app.get('/users/:id/ownedPlants', async (req, res) => {
  const { id } = req.params;

  try {
    // Retrieve the current `owned_plants` list for the user
    const [rows] = await db.promise().query('SELECT owned_plants FROM users WHERE id = ?', [id]);
    
    // Check if user exists
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let ownedPlants;

    // Check if owned_plants is null or not a valid JSON string
    if (rows[0].owned_plants === null) {
      ownedPlants = [];
    } else {
      try {
        // Parse owned_plants as JSON if it's a valid JSON string
        ownedPlants = rows[0].owned_plants;
      } catch (parseError) {
        console.error("Error parsing owned_plants, resetting to empty array:", parseError);
        console.error("Invalid owned_plants data:", rows[0].owned_plants);
        // Reinitialize ownedPlants to an empty array if parsing fails
        ownedPlants = [];
      }
    }

    console.log("Current ownedPlants:", ownedPlants);
    // Send the ownedPlants array back as the response
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

      // Insert new user
      const insertUserQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
      db.query(insertUserQuery, [username, password], (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Database error during user insertion' });
        }

        // Return the new user's id
        return res.status(201).json({ success: true, message: 'User created successfully', userId: result.insertId });
      });
    });
  } else {
    // Login: Check if username and password match
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
  let { plantName } = req.body;
  plantName = plantName[0];
  console.log("Received plantName:", plantName);

  try {
    // Retrieve the current `owned_plants` list for the user
    const [rows] = await db.promise().query('SELECT owned_plants FROM users WHERE id = ?', [id]);

    // Check if user exists
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let ownedPlants;

    // Check if owned_plants is null or not a valid JSON string
    if (rows[0].owned_plants === null) {
      ownedPlants = [];
    } else {
      try {
        // Try to parse owned_plants as JSON
        ownedPlants = rows[0].owned_plants;
        console.log("Parsed ownedPlants:", ownedPlants);
      } catch (parseError) {
        console.error("Error parsing owned_plants, resetting to empty array:", parseError);
        ownedPlants = [];
      }
    }

    // Ensure plant name is not already in the list by checking against the `name` property
    const plantExists = ownedPlants.some(plant => plant.name === plantName);
    if (!plantExists) {
      const currentDate = new Date().toLocaleString();
      const newPlant = {
        name: plantName,
        lastWatered: currentDate,
      };

      ownedPlants.push(newPlant); // Add the new plant object

      // Update the `owned_plants` list in the database
      console.log(JSON.stringify(ownedPlants))
      await db.promise().query('UPDATE users SET owned_plants = ? WHERE id = ?', [JSON.stringify(ownedPlants), id]);

      res.json({ success: true, message: 'Plant added successfully' });
    } else {
      res.json({ success: false, message: 'Plant already exists in owned plants list' });
    }
  } catch (error) {
    console.error('Error updating owned_plants:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});



// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});