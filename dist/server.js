const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the out directory
app.use(express.static(path.join(__dirname, 'out')));

// Handle all routes by serving index.html
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'out', 'index.html'));
});

app.listen(port, () => {
    console.log(`MissionBoard is running at http://localhost:${port}`);
});