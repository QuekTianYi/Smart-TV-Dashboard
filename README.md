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

## Troubleshooting TV Installation

### `install failed[118, -4], reason: Operation not allowed : :Load archive info fail`

This was the main issue hit when installing via CLI:

```
tizen.bat install -n "Debug\HouseholdDashboard.wgt" -s <tv-ip>:26101
```

**Root cause:** the `package` attribute in `config.xml`'s `<tizen:application>` tag must be **exactly 10 alphanumeric characters**, and the `id` attribute must be that exact same `package` value followed by a dot and a suffix (`<package>.<suffix>`). If `package` is the wrong length, or `id`'s prefix doesn't match `package` character-for-character, the on-device installer fails during manifest parsing — but instead of a clear "invalid package ID" message, it surfaces as this generic archive-read error.

Known-good values (in `config.xml`):
```xml
<tizen:application id="HouseholdD.app"
                   package="HouseholdD"
                   required_version="4.0"/>
```

Things that do **not** fix this error (ruled out while debugging):
- Rebooting the TV (commonly suggested for this error code elsewhere, didn't help here)
- The `.wgt` being corrupt or unsigned (verified valid zip + signature files present)
- API version mismatch (`required_version="4.0"` is well under the TV's actual platform version — check yours with `sdb capability`, look for `platform_version`)

**After editing `config.xml`, you must rebuild** (right-click project → **Build Signed Package** in Tizen Studio) before reinstalling — editing the source `config.xml` alone does not update the already-built `Debug/HouseholdDashboard.wgt`.

If you use Tizen Studio's Config Editor **form view** (not the raw XML), double check the `ID` and `Package` fields there directly — they can end up out of sync with each other, or reset to the project name, if edited independently across sessions. Prefer editing the raw XML source of `config.xml` for these two attributes.

### `tizen.bat uninstall -p <name>` — "Package ID is not valid"

`-p` takes the **package ID** (`HouseholdD`), not the app ID (`HouseholdD.app`) or project name. Uninstall isn't actually needed unless a previous install partially succeeded — check first with `tizen.bat uninstall -p <package-id> -s <tv-ip>:26101`; "The package is not exist" just means there's nothing to remove.

### Checking the TV's actual Tizen platform version

```
cd C:\tizen-studio\tools
sdb.exe connect <tv-ip>:26101
sdb.exe -s <tv-ip>:26101 capability
```

### Installation
```
cd C:\tizen-studio\tools\ide\bin
tizen.bat install -n "C:\<project>\Debug\HouseholdDashboard.wgt" -s <tv_ip>:26101

```

It should look something like this if it is sucessful:
```
Transferring the package...
Transferred the package
Installing the package...
--------------------
Platform log view
--------------------
install HouseholdD.app
package_path /home/owner/share/tmp/sdk_tools/tmp/HouseholdDashboard.wgt
app_id[HouseholdD.app] install start
app_id[HouseholdD.app] installing[10]
app_id[HouseholdD.app] installing[20]
app_id[HouseholdD.app] installing[30]
app_id[HouseholdD.app] installing[40]
app_id[HouseholdD.app] installing[51]
app_id[HouseholdD.app] installing[61]
app_id[HouseholdD.app] installing[71]
app_id[HouseholdD.app] installing[81]
app_id[HouseholdD.app] installing[91]
app_id[HouseholdD.app] installing[100]
app_id[HouseholdD.app] install completed
spend time for wascmd is [2529]ms
Installed the package: Id(HouseholdD.app)
Tizen application is successfully installed.
Total time: 00:00:03.298
```

Look for `platform_version` in the output — useful for confirming `required_version` in `config.xml` is compatible before assuming an API-version mismatch is the cause of an install failure.

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
