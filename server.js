const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'uniranker'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to the database');
});

// ----- Helper Function: Calculate Cosine Similarity -----
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }
    return dotProduct / (magnitudeA * magnitudeB);
}

// ----- University CRUD Operations -----

// READ operation: Fetch all universities with PopularityScore > 0
app.get('/University', (req, res) => {
    const query = 'SELECT * FROM University WHERE PopularityScore > 0';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching universities:', err);
            res.status(500).send({ error: 'Failed to fetch universities.' });
        } else {
            res.json(results);
        }
    });
});

// CREATE operation: Add a new university
app.post('/University', (req, res) => {
    const { InstitutionName, Quality, Research, Alumni } = req.body;
    const query = `
        INSERT INTO University (InstitutionName, Quality, Research, Alumni)
        VALUES (?, ?, ?, ?)
    `;
    db.query(query, [InstitutionName, Quality, Research, Alumni], (err, result) => {
        if (err) {
            console.error('Error adding university:', err);
            res.status(500).send({ error: 'Failed to add university.' });
        } else {
            res.status(201).send({ message: 'University added successfully', id: result.insertId });
        }
    });
});

// UPDATE operation: Update university details
app.put('/University/:id', (req, res) => {
    const { id } = req.params;
    const { InstitutionName, Quality, Research, Alumni } = req.body;
    const query = `
        UPDATE University
        SET InstitutionName = ?, Quality = ?, Research = ?, Alumni = ?
        WHERE id = ?
    `;
    db.query(query, [InstitutionName, Quality, Research, Alumni, id], (err, result) => {
        if (err) {
            console.error('Error updating university:', err);
            res.status(500).send({ error: 'Failed to update university.' });
        } else if (result.affectedRows === 0) {
            res.status(404).send({ message: 'University not found' });
        } else {
            res.send({ message: 'University updated successfully' });
        }
    });
});

// DELETE operation: Remove a university
app.delete('/University/:id', (req, res) => {
    const { id } = req.params;
    const query = `
        DELETE FROM University WHERE id = ?
    `;
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error deleting university:', err);
            res.status(500).send({ error: 'Failed to delete university.' });
        } else if (result.affectedRows === 0) {
            res.status(404).send({ message: 'University not found' });
        } else {
            res.send({ message: 'University deleted successfully' });
        }
    });
});

// ----- Advanced Features -----

// Add or Update Favorite and Change Popularity Score 
app.post('/Favorites', (req, res) => {
    const { UserID, ChoiceID } = req.body;

    if (!UserID || !ChoiceID) {
        return res.status(400).send({ error: 'UserID and ChoiceID are required.' });
    }

    const callProcedureQuery = `CALL AddOrUpdateFavorite(?, ?)`;

    db.query(callProcedureQuery, [UserID, ChoiceID], (err, results) => {
        if (err) {
            console.error('Error adding/updating favorite:', err);
            res.status(500).send({ error: 'Failed to add or update favorite.' });
        } else {
            res.status(200).send({ message: 'Favorite added or updated successfully.' });
        }
    });
});


// Get Top 5 Universities based on weights
app.get('/Top5Universities', (req, res) => {
    const { quality_weight, research_weight, alumni_weight } = req.query;

    // Validate input weights
    const qWeight = parseFloat(quality_weight);
    const rWeight = parseFloat(research_weight);
    const aWeight = parseFloat(alumni_weight);

    if (isNaN(qWeight) || isNaN(rWeight) || isNaN(aWeight)) {
        return res.status(400).send({ error: 'All weights must be valid numbers.' });
    }

    if (qWeight < 0 || rWeight < 0 || aWeight < 0) {
        return res.status(400).send({ error: 'Weights must be non-negative numbers.' });
    }

    const callProcedureQuery = `CALL GetTop5Universities(?, ?, ?)`;

    db.query(callProcedureQuery, [qWeight, rWeight, aWeight], (err, results) => {
        if (err) {
            console.error('Error fetching top 5 universities:', err);
            res.status(500).send({ error: 'Failed to fetch top 5 universities.' });
        } else {
            // Stored procedures return results in an array; the first element contains the rows
            res.json(results[0]);
        }
    });
});


// Fetch top 10 most recent favorites for readability
app.get('/Favorites', (req, res) => {
    const query = `
        SELECT f.FavoriteID, f.ChoiceID, f.UserID, f.Date, 
               u.InstitutionName
        FROM Favorites f
        JOIN Choices c ON f.ChoiceID = c.ChoiceID
        JOIN University u ON c.FirstChoice = u.InstitutionName
        ORDER BY f.Date DESC
        LIMIT 10
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching favorites:', err);
            res.status(500).send({ error: 'Failed to fetch favorites.' });
        } else {
            res.json(results);
        }
    });
});

// DELETE operation: Remove a favorite
app.delete('/Favorites/:id', (req, res) => {
    const { id } = req.params;
    const query = `
        DELETE FROM Favorites WHERE FavoriteID = ?
    `;
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error deleting favorite:', err);
            res.status(500).send({ error: 'Failed to delete favorite.' });
        } else if (result.affectedRows === 0) {
            res.status(404).send({ message: 'Favorite not found' });
        } else {
            res.send({ message: 'Favorite deleted successfully' });
        }
    });
});

// ----- New Feature: Machine Learning-Based Recommendation System -----

// RECOMMENDATIONS operation: Get recommended universities based on user inputs
app.get('/recommendations', (req, res) => {
    const { quality, research, alumni } = req.query;

    // Validate input parameters
    const q = parseFloat(quality);
    const r = parseFloat(research);
    const a = parseFloat(alumni);

    if ([q, r, a].some(val => isNaN(val))) {
        return res.status(400).send({ error: 'Quality, Research, and Alumni must be valid numbers.' });
    }

    if ([q, r, a].some(val => val < 0)) {
        return res.status(400).send({ error: 'Quality, Research, and Alumni must be non-negative numbers.' });
    }

    // User preference vector
    const userVector = [q, r, a];

    // Fetch all universities
    const uniQuery = `
        SELECT id, InstitutionName, Quality, Research, Alumni
        FROM University
    `;

    db.query(uniQuery, (err, uniResults) => {
        if (err) {
            console.error('Error fetching universities:', err);
            return res.status(500).send({ error: 'Failed to fetch universities.' });
        }

        // Calculate similarity scores
        const recommendations = uniResults.map(uni => {
            const uniVector = [uni.Quality, uni.Research, uni.Alumni];
            const similarity = cosineSimilarity(userVector, uniVector);
            return { ...uni, similarity };
        });

        // Sort universities by similarity score in descending order
        recommendations.sort((a, b) => b.similarity - a.similarity);

        // Select top 5 recommendations
        const topRecommendations = recommendations.slice(0, 5);

        res.json(topRecommendations);
    });
});


// SEARCH operation: Search universities by keyword
app.get('/search', (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).send({ error: 'Query parameter is required.' });
    }

    // Use parameterized queries to prevent SQL injection
    const searchQuery = `
        SELECT * FROM University
        WHERE InstitutionName LIKE ?
    `;
    const searchValue = `%${query}%`;

    db.query(searchQuery, [searchValue], (err, results) => {
        if (err) {
            console.error('Error searching universities:', err);
            res.status(500).send({ error: 'Failed to search universities.' });
        } else {
            res.json(results);
        }
    });
});

// ----- Start the Server -----
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
