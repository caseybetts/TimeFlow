# MissionBoard

MissionBoard is a browser-based mission scheduling tool for tracking tasks, event times, buffers, owners, and timeline status.

## Use Online

MissionBoard is primarily intended to run from GitHub Pages:

[https://caseybetts.github.io/TimeFlow/](https://caseybetts.github.io/TimeFlow/)

Open the link in a browser and use the tool directly. Settings stay in the browser profile where the tool is used, while task data should be exported when you need to save or reuse a schedule.

## Features And Effective Use

### Task Scheduling

The easiest way to add tasks is the **Batch Add Tasks (via Table)** section. Select the target date first, then use **Add Row** to enter one or more tasks with spacecraft, core event time, task type, and optional custom name. When the table looks right, use **Add All Tasks to Schedule** to place the rows onto the schedule.

The table is usually the fastest and cleanest method because it lets you build a whole set of tasks for the same UTC date, duplicate similar rows, and review timing before committing them to the schedule. Times are handled in UTC, so enter times as mission/event times rather than local clock times.

The **Add Task** button is still useful for one-off additions or quick edits when you only need to create a single scheduled item.

Each task type has pre-action and post-action buffer durations. The task's core event time stays fixed, while the timeline uses those buffers to show the full work window around that event.

### Timeline And Day View

The day chart gives a visual view of the schedule for the selected date. Use it to spot overlaps, buffer pressure, open time, and tasks that are approaching the current time.

The task list below the chart is best for managing individual items. Mark tasks complete as work finishes, edit tasks when event times shift, and delete items that no longer apply.

### Owners And Filtering

Set your name in settings, then use **My Tasks** to focus the list on tasks assigned to you. This is useful when the full schedule includes work owned by multiple operators.

Owners are also included in CSV import and export, so assignments can be preserved when schedules move between users or tools.

### Task Type Settings

Open settings to adjust task type labels and default buffer durations. Use this when a workflow changes and the default pre-action or post-action timing should apply to newly created tasks.

Changing defaults affects new tasks. Existing tasks keep the durations they already have unless you edit them.

### CSV Import And Export

Use **Export CSV** to create a reusable day-agnostic task template. The exported file stores task times as UTC times without tying the schedule to a specific date.

Use **Import Tasks** to apply a CSV schedule to a target date. Choose **Replace existing tasks** when starting a fresh day, or **Add to existing tasks** when merging in extra work.

Generic CSV imports support `spacecraft`, `startTime`, and `type`, with optional `name`, `preActionDuration`, `postActionDuration`, `Done`, and `Owner` columns. Legacy `isCompleted` columns are still accepted.

CSV time fields accept colon or compact UTC forms, such as `7:30`, `07:30`, `07:30:00`, `730`, `0730`, and `073000`.

### TL Monitoring Tracker Import

TL Monitoring Tracker CSV files can be imported directly when they include `Quantity`, `SCID`, `Acquisition Time`, and `Needs CAD Check`. MissionBoard creates TL tasks and, when needed, CAD Check tasks from those rows.

When numbered FSV columns are present, such as `FSV 1`, `FSV 2`, and `FSV 3`, each populated time cell creates an FSV task on the selected target date. FSV task names combine the row quantity, SCID, and FSV number, for example `4 WV01 FSV 1`.

Review the imported task list after processing so any partial import errors can be corrected before the schedule is used operationally.

### High Pri FSV Paste

Use the high priority paste area for slash-separated `hhmm` time groups such as `0730/0745/0810`. Each line group gets the next available numbered High Pri name on the selected target date.

This is fastest when pulling high priority FSV times from text notes or messages without preparing a full CSV first.

### Browser Storage

MissionBoard stores settings, task type defaults, owner name, and theme preference in the browser. These settings persist after closing, refreshing, or reopening the page in the same browser profile.

Task data does not persist after closing or refreshing the page. Export CSV when you need to save a schedule, move it to another device, or reuse it later.

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

## Offline Package

Use these steps only when running a packaged build, such as the contents of the `dist/` folder or a distribution zip created from it.

1. Make sure Node.js 18 or higher is installed.
2. Extract the package to a folder for this tool.
3. Open a terminal in the extracted package folder.
4. Run `npm install --production`.
5. Run `npm start`.
6. Open [http://localhost:3000](http://localhost:3000) in your browser.

These steps assume the package already contains a built static site at `out/` and the package `server.js`. They should work for a properly built `dist/` package. They are not the right steps for running the source repository directly.
