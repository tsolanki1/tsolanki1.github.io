# BAPS NA Communications MidYear Meeting Site

This is a static website designed to be hosted on GitHub Pages with no build step.

## Files

- `index.html`: page structure
- `styles.css`: visual styling
- `app.js`: filtering and view logic
- `data.js`: event data and attendee records
- `sync_registration.py`: converts the registration workbook into `data.js`
- `.nojekyll`: tells GitHub Pages to serve the site as plain static files

## Update The Real Event Data

1. Regenerate `data.js` from the latest spreadsheet:

```powershell
C:\Users\tsola\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe .\sync_registration.py "C:\path\to\Comms Mid-Year Retreat Registration (Responses).xlsx"
```

2. Commit and push the updated `data.js` to GitHub.
3. GitHub Pages will publish the updated dashboard automatically.

You can also use the **Load Spreadsheet** control in the browser for a temporary local view, but that import is only saved in that browser and does not update the published site for everyone else.

## Deploy On GitHub Pages

1. Push this folder to a GitHub repository.
2. In GitHub, open `Settings -> Pages`.
3. Set the source to deploy from your main branch and the repository root.
4. Save, then wait for the Pages URL to go live.

Because all file references are relative, the site works cleanly from either a custom domain or a standard GitHub Pages repository URL.

## Password Protection Note

The current password screen is browser-side only. On GitHub Pages, that means it can hide the site from casual viewers, but it is not secure protection for sensitive data because the files are still publicly hosted.

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
