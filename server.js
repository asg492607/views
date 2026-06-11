const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// On Render, the filesystem is ephemeral (resets on redeploy).
// We use /tmp for writable storage that persists during a session.
const DATA_DIR = process.env.NODE_ENV === 'production'
    ? path.join('/tmp', 'data')
    : path.join(__dirname, 'data');

const DB_FILE = path.join(DATA_DIR, 'db.json');

// ── Ensure data directory and DB file exist ──
function ensureDB() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ presets: [] }, null, 2));
    }
}

function readDB() {
    ensureDB();
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
        return { presets: [] };
    }
}

function writeDB(data) {
    ensureDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Health Check (required for Render) ──
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// ── API: Get all presets ──
app.get('/api/presets', (req, res) => {
    try {
        const data = readDB();
        res.json(data.presets);
    } catch (err) {
        console.error('GET /api/presets error:', err);
        res.status(500).json({ error: 'Failed to read database' });
    }
});

// ── API: Save a new preset ──
app.post('/api/presets', (req, res) => {
    try {
        const { name, url, algorithm, min, max } = req.body;

        if (!name || !url) {
            return res.status(400).json({ error: 'Name and URL are required' });
        }

        const data = readDB();
        const newPreset = {
            id: Date.now().toString(),
            name,
            url,
            algorithm: algorithm || 'casual',
            min: parseInt(min) || 10,
            max: parseInt(max) || 50,
            createdAt: new Date().toISOString()
        };

        data.presets.push(newPreset);
        writeDB(data);

        res.status(201).json(newPreset);
    } catch (err) {
        console.error('POST /api/presets error:', err);
        res.status(500).json({ error: 'Failed to save preset' });
    }
});

// ── API: Delete a preset ──
app.delete('/api/presets/:id', (req, res) => {
    try {
        const { id } = req.params;
        const data = readDB();
        const before = data.presets.length;
        data.presets = data.presets.filter(p => p.id !== id);

        if (data.presets.length === before) {
            return res.status(404).json({ error: 'Preset not found' });
        }

        writeDB(data);
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/presets/:id error:', err);
        res.status(500).json({ error: 'Failed to delete preset' });
    }
});

// ── Fallback: serve index.html ──
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start server ──
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   DB location: ${DB_FILE}`);
});
