# BAPS NA Communications MidYear Meeting Site

This is a static website that can run directly from a shared folder without a build step.

## Files

- `index.html`: page structure
- `styles.css`: visual styling
- `app.js`: filtering and view logic
- `data.js`: event data and attendee records
- `sync_registration.py`: converts the registration workbook into `data.js`

## Update The Real Event Data

1. Open `index.html` in a browser and use the **Load Spreadsheet** section to import the latest registration workbook directly.
2. Or regenerate `data.js` from the spreadsheet with:

```powershell
C:\Users\tsola\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe .\sync_registration.py "C:\path\to\Comms Mid-Year Retreat Registration (Responses).xlsx"
```

3. Open `index.html` in a browser to use the updated logistics dashboard.

## Flight Tracker Links

The airport arrivals and departures tables include direct FlightStats tracker links built from the airline code, flight number, and flight date, for example:

`https://www.flightstats.com/v2/flight-tracker/NK/2701?year=2026&month=4&date=26`

## Suggested Data Fields

Each attendee record can include:

- `name`
- `city`
- `role`
- `phone`
- `email`
- `arrivalAirport`
- `arrivalDate`
- `arrivalTime`
- `arrivalFlight`
- `departureAirport`
- `departureDate`
- `departureTime`
- `departureFlight`
- `airportNeed`
- `driverGroup`
- `mealPreference`
- `foodNotes`
- `transportationNeed`
- `hotel`
- `rooming`
- `status`
- `notes`

## Shared Folder Use

If your team is using Google Drive for Desktop or another synced shared folder, keep the site files together in the same folder and open `index.html` locally in a browser.
