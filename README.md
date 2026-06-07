# Household Dashboard

A shared household calendar dashboard for Samsung Frame TV (and any modern browser).

Displays up to 4 people's schedules side-by-side, pulling from **Google Calendar** and **Apple iCloud Calendar** via public iCal URLs — no auth server required.

![Dashboard preview](preview.png)

---

## Features

- 📅 **3-day and 7-day views** — 3-day centres today with a wider highlighted column
- ⏰ **5-hour band and 24-hour views** — band auto-centres on current time
- 👥 **Up to 4 people** — colour-coded, side-by-side columns per day
- 🔀 **Event overlap cascade** — overlapping events tile horizontally (Google Calendar style)
- ☑️ **Person filter sidebar** — tick/untick who to show; configurable left or right
- 🍎🟦 **Google + Apple Calendar** — each person can have multiple iCal sources merged
- 📺 **Tizen Web App** — runs natively on Samsung Frame TV via developer mode
- ⌨️ **TV remote, keyboard, and mouse** — full input support
- 🔄 **Auto-refresh** — configurable poll interval

---

## Setup

### 1. Get your iCal URLs

**Google Calendar:**
1. Open [Google Calendar](https://calendar.google.com) → Settings (gear) → your calendar
2. Scroll to *Integrate calendar*
3. Copy the **"Secret address in iCal format"** link

**Apple iCloud Calendar:**
1. Open [iCloud.com](https://icloud.com) → Calendar
2. Click the share icon (📡) next to a calendar → enable *Public Calendar*
3. Copy the URL and replace `webcal://` with `https://`

### 2. Create and edit config.js

If it is a new setup: copy `sample-config.js` and rename to `config.js`
If not: open `config.js` 

Fill in your details:

```js
const CONFIG = {
  sidebarPosition: "left",   // or "right"
  defaultDayView:  "3day",   // or "7day"
  defaultTimeView: "5hour",  // or "24hour"
  refreshIntervalMinutes: 30,

  people: [
    {
      name: "Alex",
      colour: "#4A90D9",
      defaultVisible: true,
      calendars: [
        { label: "Google", url: "https://calendar.google.com/calendar/ical/..." },
        { label: "iCloud", url: "https://p62-caldav.icloud.com/published/2/..." }
      ]
    },
    // add up to 4 people
  ]
};
```

### 3. Deploy to Samsung Frame TV

#### Prerequisites
- [Tizen Studio](https://developer.tizen.org/development/tizen-studio/download) installed
- Samsung developer account (free)
- TV and computer on the same Wi-Fi network

#### Enable Developer Mode on the TV
1. Exit Art Mode (press the physical button on the TV or use the remote)
2. Press **Home** → go to **Apps**
3. In the Apps panel, use the number pad to type **12345** quickly
4. Developer Mode dialog appears → turn it **On**, enter your computer's IP address
5. Reboot the TV when prompted

#### Deploy via Tizen Studio
1. Open Tizen Studio → **Tools → Certificate Manager**
2. Create a new Samsung TV certificate — log in with your Samsung account
3. The TV's DUID auto-fills once connected
4. Open this project folder in Tizen Studio
5. Right-click project → **Run As → Tizen Web Application**

The app installs and launches on the TV. It persists after reboot.

---

## Browser / Local Testing

Open `index.html` directly in Chrome or Firefox for development.

> **Note:** Browsers block cross-origin requests to iCal URLs, so you may need to run a local CORS proxy or use browser extensions like *CORS Unblock* during development. On the TV, this isn't an issue.

---

## Keyboard Shortcuts (browser / keyboard)

| Key | Action |
|-----|--------|
| `←` / `→` | Previous / next day window |
| `↑` / `↓` | Shift time band up/down (5h mode) or scroll (24h mode) |
| `Tab` | Switch focus between sidebar and calendar |
| `t` | Jump to today |
| `3` | Switch to 3-day view |
| `7` | Switch to 7-day view |
| `h` | Toggle 5h / 24h time view |

---

## Project Structure

```
household-dashboard/
├── config.js          ← Edit this
├── config.xml         ← Tizen app manifest
├── index.html
├── css/
│   ├── reset.css
│   ├── main.css       ← Layout & variables
│   ├── sidebar.css
│   ├── toolbar.css
│   └── calendar.css
└── js/
    ├── utils.js
    ├── ical-fetcher.js  ← Fetches & parses Google + Apple iCal
    ├── state.js         ← App state
    ├── sidebar.js
    ├── toolbar.js
    ├── calendar.js      ← Grid renderer
    ├── input.js         ← Remote / keyboard / mouse
    └── app.js           ← Entry point
```

---

## Roadmap

- [ ] Chores rotation display (dishes, laundry)
- [ ] Event detail popup (remote OK button)
- [ ] Dark/light theme toggle
- [ ] CORS proxy helper script for local dev

---

## Contributing

PRs welcome. Please keep dependencies minimal — the goal is a self-contained, easy-to-fork project with no build step required.

---

## License

MIT
