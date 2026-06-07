/**
 * ical-fetcher.js
 *
 * Fetches and parses .ics feeds (Google Calendar, Apple iCloud, or any iCal URL).
 * Uses ical.js (loaded via CDN in index.html) for parsing.
 *
 * Returns a flat array of normalised event objects:
 * {
 *   id:        string,
 *   title:     string,
 *   start:     Date,
 *   end:       Date,
 *   allDay:    boolean,
 *   personId:  number  (index in CONFIG.people)
 * }
 */

const ICalFetcher = (() => {

  /**
   * Fetch a single .ics URL and return raw text.
   * On localhost, routes through the dev-server proxy to avoid CORS issues.
   * On the TV (Tizen), fetches directly.
   */
  const fetchICS = async (url) => {
    // iCloud CalDAV URLs sometimes need webcal→https conversion
    const normalized = url.replace(/^webcal:\/\//i, 'https://');

    // Route through local proxy when developing in browser
    const isDev    = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const fetchUrl = isDev
      ? `http://localhost:3000/proxy?url=${encodeURIComponent(normalized)}`
      : normalized;

    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/calendar' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar (${response.status}): ${normalized}`);
    }

    return response.text();
  };

  /**
   * Parse raw iCal text using ical.js.
   * Expands recurring events within [rangeStart, rangeEnd].
   *
   * @param {string} icsText
   * @param {number} personId
   * @param {Date}   rangeStart
   * @param {Date}   rangeEnd
   * @returns {Array} normalised events
   */
  const parseICS = (icsText, personId, rangeStart, rangeEnd) => {
    const events = [];

    let jcal;
    try {
      jcal = ICAL.parse(icsText);
    } catch (e) {
      console.error('ical.js parse error:', e);
      return [];
    }

    const comp      = new ICAL.Component(jcal);
    const vevents   = comp.getAllSubcomponents('vevent');
    const rangeS    = ICAL.Time.fromDateTimeString(rangeStart.toISOString());
    const rangeE    = ICAL.Time.fromDateTimeString(rangeEnd.toISOString());

    vevents.forEach((vevent) => {
      const event = new ICAL.Event(vevent);

      try {
        if (event.isRecurring()) {
          // Expand recurrences within the visible range
          const iter = event.iterator();
          let next;
          let guard = 0; // safety cap

          while ((next = iter.next()) && guard < 500) {
            guard++;
            if (next.compare(rangeE) > 0) break;

            const occurrence = event.getOccurrenceDetails(next);
            const start = occurrence.startDate.toJSDate();
            const end   = occurrence.endDate.toJSDate();

            if (end < rangeStart) continue;

            events.push(normalise(occurrence.item, start, end, personId));
          }
        } else {
          const start = event.startDate.toJSDate();
          const end   = event.endDate.toJSDate();

          // Skip if completely outside range
          if (end < rangeStart || start > rangeEnd) return;

          events.push(normalise(event, start, end, personId));
        }
      } catch (e) {
        // Silently skip malformed events
      }
    });

    return events;
  };

  /**
   * Normalise an ICAL.Event into our flat event shape.
   */
  const normalise = (event, start, end, personId) => {
    const allDay = event.startDate
      ? event.startDate.isDate
      : false;

    return {
      id:       `${personId}-${event.uid || Math.random()}-${start.getTime()}`,
      title:    event.summary || '(No title)',
      start,
      end,
      allDay,
      personId,
    };
  };

  /**
   * Fetch and parse ALL calendars for ALL people.
   * Returns a flat array of normalised events for the given date range.
   *
   * @param {Date} rangeStart
   * @param {Date} rangeEnd
   * @returns {Promise<Array>}
   */
  const fetchAll = async (rangeStart, rangeEnd) => {
    const allEvents = [];
    const errors    = [];

    for (let personId = 0; personId < CONFIG.people.length; personId++) {
      const person = CONFIG.people[personId];

      for (const cal of person.calendars) {
        try {
          const icsText = await fetchICS(cal.url);
          const parsed  = parseICS(icsText, personId, rangeStart, rangeEnd);
          allEvents.push(...parsed);
        } catch (e) {
          errors.push({ person: person.name, label: cal.label, error: e.message });
          console.warn(`Calendar fetch failed for ${person.name} / ${cal.label}:`, e.message);
        }
      }
    }

    return { events: allEvents, errors };
  };

  return { fetchAll };
})();
