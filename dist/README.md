# TimeFlow

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

## Updating Distribution Files
To ensure that your dist folder always reflects the latest changes to your app, follow these steps:
1. Make your changes to the app (e.g., update code, styles, or assets).
2. Rebuild the app to generate the latest static files:
```bash
   npm run build
```
This command will create a fresh out directory with the updated static files.
3. Repackage the app to update the dist folder:
```bash
  node scripts/package.js
```
This will copy the latest out directory into dist and update the necessary files (like package.json, server.js, and README.md).
4. Test the updated distribution by running:
```bash
  cd dist
  npm install --production
  npm start
```

