const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure DB exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ presets: [] }));
}

// API Routes

// Get all presets
app.get('/api/presets', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        res.json(data.presets);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read database' });
    }
});

// Save a new preset
app.post('/api/presets', (req, res) => {
    try {
        const newPreset = req.body;
        if (!newPreset.name || !newPreset.url) {
            return res.status(400).json({ error: 'Name and URL are required' });
        }

        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        
        // Add ID and timestamp
        newPreset.id = Date.now().toString();
        newPreset.createdAt = new Date().toISOString();
        
        data.presets.push(newPreset);
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        
        res.status(201).json(newPreset);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save preset' });
    }
});

// Delete a preset
app.delete('/api/presets/:id', (req, res) => {
    try {
        const { id } = req.params;
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        
        const initialLength = data.presets.length;
        data.presets = data.presets.filter(p => p.id !== id);
        
        if (data.presets.length === initialLength) {
            return res.status(404).json({ error: 'Preset not found' });
        }

        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete preset' });
    }
});

// Fallback to serve index.html for any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
