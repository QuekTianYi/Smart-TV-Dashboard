/**
 * Household Dashboard — config.js
 *
 * Fill in your details here before deploying.
 * Each person can have multiple iCal URLs (Google Calendar, Apple Calendar, or any .ics source).
 * All URLs under one person are merged and displayed under their name and colour.
 *
 * HOW TO GET YOUR iCAL URL:
 *   Google Calendar:
 *     1. Open Google Calendar → Settings → your calendar → "Integrate calendar"
 *     2. Copy the "Secret address in iCal format" link
 *
 *   Apple Calendar (iCloud):
 *     1. Open iCloud.com → Calendar → click the share icon next to a calendar
 *     2. Enable "Public Calendar" and copy the URL
 *     3. Replace "webcal://" with "https://" in the URL
 *
 * COLOURS: Any valid CSS colour — hex, rgb, hsl, named colours.
 */

const CONFIG = {

  // ─── App Settings ─────────────────────────────────────────────────────────

  /** Which side the person filter sidebar appears on: "left" or "right" */
  sidebarPosition: "left",

  /**
   * Default view when the app loads.
   * Options: "3day" | "7day"
   */
  defaultDayView: "3day",

  /**
   * Default time mode when the app loads.
   * Options: "5hour" | "24hour"
   */
  defaultTimeView: "5hour",

  /**
   * How often to refresh calendar data, in minutes.
   * Recommended: 15–60. Set to 0 to disable auto-refresh.
   */
  refreshIntervalMinutes: 30,

  /**
   * Start of the working day used as a fallback if auto-centre can't be calculated.
   * 24h format. e.g. 8 = 8:00am
   */
  fallbackStartHour: 8,

  // ─── People ───────────────────────────────────────────────────────────────

  /**
   * Add one entry per household member.
   * Each person can have multiple calendar sources — they will be merged.
   */
  people: [
    {
      name: "Alex",
      colour: "#4A90D9",       // blue
      defaultVisible: true,    // whether this person is ticked on load
      calendars: [
        {
          label: "Google",
          url: "https://calendar.google.com/calendar/ical/REPLACE_ME/basic.ics"
        },
        {
          label: "iCloud",
          url: "https://p62-caldav.icloud.com/published/2/REPLACE_ME"
        }
      ]
    },
    {
      name: "Jordan",
      colour: "#E8524A",       // red
      defaultVisible: true,
      calendars: [
        {
          label: "Google",
          url: "https://calendar.google.com/calendar/ical/REPLACE_ME/basic.ics"
        }
      ]
    },
    {
      name: "Sam",
      colour: "#52C27A",       // green
      defaultVisible: true,
      calendars: [
        {
          label: "iCloud",
          url: "https://p62-caldav.icloud.com/published/2/REPLACE_ME"
        }
      ]
    },
    {
      name: "Morgan",
      colour: "#F0A500",       // amber
      defaultVisible: true,
      calendars: [
        {
          label: "Google",
          url: "https://calendar.google.com/calendar/ical/REPLACE_ME/basic.ics"
        }
      ]
    }
  ]
};
