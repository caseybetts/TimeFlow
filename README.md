# MissionBoard

MissionBoard is a browser-based mission scheduling tool for tracking tasks, event times, buffers, owners, and timeline status.

## Use Online

MissionBoard is primarily intended to run from GitHub Pages:

[https://caseybetts.github.io/TimeFlow/](https://caseybetts.github.io/TimeFlow/)

Open the link in a browser and use the tool directly. Schedule data and user settings are stored in the browser's local storage, so they stay on the device and browser profile where the tool is used.

## Offline Package

Use these steps only when running a packaged build, such as the contents of the `dist/` folder or a distribution zip created from it.

1. Make sure Node.js 18 or higher is installed.
2. Extract the package to a folder for this tool.
3. Open a terminal in the extracted package folder.
4. Run `npm install --production`.
5. Run `npm start`.
6. Open [http://localhost:3000](http://localhost:3000) in your browser.

These steps assume the package already contains a built static site at `out/` and the package `server.js`. They should work for a properly built `dist/` package. They are not the right steps for running the source repository directly.

## Source Repository

For development from the repo root:

1. Run `npm ci`.
2. Run `npm run dev`.
3. Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

The GitHub Pages build uses:

```sh
npm run build:pages
```

The deployment workflow in `.github/workflows/deploy-pages.yml` builds the static site and publishes the `out/` directory to GitHub Pages.
