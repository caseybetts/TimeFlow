const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper function to recursively copy a directory
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// Create a README for the distribution
const readmeContent = `# TimeFlow

## Installation Instructions

1. Make sure you have Node.js installed (version 18 or higher)
2. Extract all files from this package
3. Open a terminal in the extracted directory
4. Run: npm install --production
5. Run: npm start
6. Open http://localhost:3000 in your browser

## Requirements
- Node.js 18 or higher
- npm (comes with Node.js)

## Troubleshooting
If you encounter any issues:
1. Make sure Node.js is properly installed
2. Try deleting the node_modules folder and running npm install again
3. Check that port 3000 is not in use by another application
`;

fs.writeFileSync(path.join(distDir, 'README.md'), readmeContent);

// Create a minimal package.json for production
const packageJson = {
    name: "timeflow",
    version: "1.0.0",
    private: true,
    scripts: {
        start: "node server.js"
    },
    dependencies: {
        "express": "^4.18.2"
    }
};

fs.writeFileSync(
    path.join(distDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
);

// Create a simple Express server
const serverContent = `const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the out directory
app.use(express.static(path.join(__dirname, 'out')));

// Handle all routes by serving index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'out', 'index.html'));
});

app.listen(port, () => {
    console.log(\`TimeFlow is running at http://localhost:\${port}\`);
});`;

fs.writeFileSync(path.join(distDir, 'server.js'), serverContent);

// Copy the static export
const outDir = path.join(__dirname, '..', 'out');
const outDistDir = path.join(distDir, 'out');

if (fs.existsSync(outDir)) {
    copyDir(outDir, outDistDir);
}

console.log('Package created successfully in the dist directory!'); 