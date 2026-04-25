(function () {
  var defaultData = window.EVENT_DATA || { event: {}, attendees: [] };
  var data = cloneData(defaultData);
  var attendees = Array.isArray(data.attendees) ? data.attendees : [];
  var storageKey = "baps-logistics-data";
  var currentSourceStatus = "Using the bundled event data.";

  var topViews = {
    attendees: {
      title: "Attendees",
      description: "All participants, their status, wing, lodging, and contact details.",
      subviews: [
        { key: "directory", label: "Directory" },
        { key: "lodging", label: "Lodging" }
      ]
    },
    airport: {
      title: "Airport Pickup / Dropoff",
      description: "Arrivals and departures grouped so airport runs can be coordinated quickly.",
      subviews: [
        { key: "arrivals", label: "Arrivals" },
        { key: "departures", label: "Departures" },
        { key: "driver-groups", label: "Driver Groups" }
      ]
    },
    meals: {
      title: "Meals",
      description: "Meal preference counts plus attendee-level food restrictions and notes.",
      subviews: [
        { key: "to-go", label: "To Go" },
        { key: "restrictions", label: "Restrictions" }
      ]
    },
    config: {
      title: "Config",
      description: "Spreadsheet loading and site data notes.",
      subviews: [
        { key: "setup", label: "Setup" }
      ]
    }
  };

  var state = {
    view: getViewFromHash(),
    subview: "",
    search: "",
    status: "All",
    role: "All",
    directoryFilters: {
      name: "",
      phone: "",
      email: "",
      airportNeed: "",
      transportationNeed: ""
    }
  };

  function getViewFromHash() {
    var hash = (window.location.hash || "#attendees").replace("#", "");
    return topViews[hash] ? hash : "attendees";
  }

  function init() {
    hydrateStoredData();
    if (attendees.some(function (item) { return item.status === "Confirmed"; })) {
      state.status = "Confirmed";
    }
    state.subview = topViews[state.view].subviews[0].key;
    bindNav();
    bindImporter();
    renderNotice();
    render();
    window.addEventListener("hashchange", function () {
      state.view = getViewFromHash();
      state.subview = topViews[state.view].subviews[0].key;
      render();
    });
  }

  function bindNav() {
    document.querySelectorAll("[data-view-link]").forEach(function (link) {
      link.addEventListener("click", function () {
        state.view = link.getAttribute("data-view-link");
      });
    });
  }

  function bindImporter() {
    var input = document.getElementById("xlsxInput");
    if (!input) {
      return;
    }

    input.addEventListener("change", function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }

      if (typeof XLSX === "undefined") {
        setSourceStatus("Spreadsheet reader could not load. Refresh while online and try again.");
        return;
      }

      var reader = new FileReader();
      setSourceStatus("Reading " + file.name + "...");
      reader.onload = function (loadEvent) {
        try {
          var workbook = XLSX.read(loadEvent.target.result, { type: "array", cellDates: true });
          var imported = normalizeWorkbookData(workbook, file.name);
          setData(imported, "Loaded from " + file.name + ".");
        } catch (error) {
          setSourceStatus("Could not read that spreadsheet. Please confirm it is the registration workbook.");
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function hydrateStoredData() {
    try {
      var raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setSourceStatus("Using the bundled event data.");
        return;
      }

      var parsed = JSON.parse(raw);
      if (parsed && parsed.attendees) {
        data = cloneData(parsed);
        attendees = Array.isArray(data.attendees) ? data.attendees : [];
        setSourceStatus("Using the most recently imported spreadsheet on this device.");
        return;
      }
    } catch (error) {
      // Fall back to bundled data.
    }

    setSourceStatus("Using the bundled event data.");
  }

  function setData(nextData, statusText) {
    data = cloneData(nextData);
    attendees = Array.isArray(data.attendees) ? data.attendees : [];
    renderNotice();
    render();
    setSourceStatus(statusText);

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      // Ignore storage failures and keep imported data in memory.
    }
  }

  function setSourceStatus(text) {
    currentSourceStatus = text;
    var node = document.getElementById("sourceStatus");
    if (node) {
      node.textContent = text;
    }
  }

  function render() {
    highlightTopNav();
    renderSubnav();
    renderToolbar();
    renderContent();
  }

  function renderNotice() {
    var notes = Array.isArray(data.event.notes) ? data.event.notes : [];
    return "<section class=\"panel\"><h2>Load Spreadsheet</h2><p class=\"muted\">Choose the registration `.xlsx` file to refresh the dashboard from the latest form responses.</p><label class=\"file-picker\" for=\"xlsxInput\">Choose Registration File</label><input id=\"xlsxInput\" type=\"file\" accept=\".xlsx,.xlsm,.xls\"><p class=\"muted\" id=\"sourceStatus\">Using the bundled event data.</p></section>" +
      "<section class=\"panel notice\"><h2>Data Note</h2><p class=\"muted\">The site can use the bundled <strong>data.js</strong> file or load the registration spreadsheet directly in this Config tab.</p>" +
      notes.map(function (note) { return "<p>" + escapeHtml(note) + "</p>"; }).join("") + "</section>";
  }

  function highlightTopNav() {
    document.querySelectorAll("[data-view-link]").forEach(function (link) {
      var active = link.getAttribute("data-view-link") === state.view;
      link.classList.toggle("is-active", active);
    });
  }

  function renderSubnav() {
    var subnav = document.getElementById("subnav");
    var items = topViews[state.view].subviews;
    subnav.innerHTML = items.map(function (item) {
      var active = item.key === state.subview ? " is-active" : "";
      return '<button class="' + active.trim() + '" data-subview="' + escapeHtml(item.key) + '">' + escapeHtml(item.label) + "</button>";
    }).join("");

    subnav.querySelectorAll("button").forEach(function (button) {
      button.addEventListener("click", function () {
        state.subview = button.getAttribute("data-subview");
        render();
      });
    });
  }

  function renderToolbar() {
    document.getElementById("viewTitle").textContent = topViews[state.view].title;
    document.getElementById("viewDescription").textContent = topViews[state.view].description;

    var filters = document.getElementById("filters");
    if (state.view === "attendees") {
      filters.innerHTML =
        '<input id="searchInput" type="search" placeholder="Search attendees">' +
        buildRoleFilter();
    } else {
      filters.innerHTML =
        '<input id="searchInput" type="search" placeholder="Search attendees">' +
        buildStatusFilter();
    }

    document.getElementById("searchInput").value = state.search;
    document.getElementById("searchInput").addEventListener("input", function (event) {
      state.search = event.target.value;
      renderContent();
    });

    if (state.view === "attendees") {
      document.getElementById("roleFilter").addEventListener("change", function (event) {
        state.role = event.target.value;
        renderContent();
      });
    } else {
      document.getElementById("statusFilter").addEventListener("change", function (event) {
        state.status = event.target.value;
        renderContent();
      });
    }
  }

  function buildStatusFilter() {
    var statuses = ["All"].concat(uniqueValues(attendees.map(function (item) { return item.status || "Unknown"; })));
    return '<select id="statusFilter">' + statuses.map(function (status) {
      var selected = status === state.status ? ' selected' : "";
      return '<option value="' + escapeHtml(status) + '"' + selected + ">" + escapeHtml(status) + "</option>";
    }).join("") + "</select>";
  }

  function buildRoleFilter() {
    var roles = ["All"].concat(uniqueValues(attendees.map(function (item) { return item.role || "Unknown"; })));
    return '<select id="roleFilter">' + roles.map(function (role) {
      var selected = role === state.role ? ' selected' : "";
      return '<option value="' + escapeHtml(role) + '"' + selected + ">" + escapeHtml(role) + "</option>";
    }).join("") + "</select>";
  }

  function renderAttendeeViews(list) {
    if (state.subview === "lodging") {
      return renderGroupedCards(list, "hotel", "Lodging Groups", function (item) {
        return [
          "Rooming: " + valueOrDash(item.rooming),
          "Status: " + valueOrDash(item.status)
        ];
      });
    }

    var directoryList = applyDirectoryFilters(list);
    var filterRow = renderDirectoryFilters();
    return renderTable([
      "Name", "Mobile", "Email", "Airport Transport", "Hotel Transport"
    ], directoryList.map(function (item) {
      return [
        item.name,
        item.phone,
        item.email,
        directoryTransportLabel(item.airportNeed),
        directoryTransportLabel(item.transportationNeed)
      ];
    }), filterRow);
  }

  function renderDirectoryFilters() {
    var columns = [
      { key: "name", placeholder: "Filter name" },
      { key: "phone", placeholder: "Filter mobile" },
      { key: "email", placeholder: "Filter email" },
      { key: "airportNeed", placeholder: "Filter airport" },
      { key: "transportationNeed", placeholder: "Filter hotel transport" }
    ];

    return columns.map(function (column) {
      return '<input class="table-filter" data-directory-filter="' + escapeHtml(column.key) + '" type="search" placeholder="' + escapeHtml(column.placeholder) + '" value="' + escapeHtml(state.directoryFilters[column.key] || "") + '">';
    });
  }

  function bindDirectoryFilters() {
    document.querySelectorAll("[data-directory-filter]").forEach(function (input) {
      input.addEventListener("input", function (event) {
        var key = event.target.getAttribute("data-directory-filter");
        state.directoryFilters[key] = event.target.value;
        renderContent();
      });
    });
  }

  function applyDirectoryFilters(list) {
    return list.filter(function (item) {
      return Object.keys(state.directoryFilters).every(function (key) {
        var filterValue = (state.directoryFilters[key] || "").toLowerCase();
        if (!filterValue) {
          return true;
        }
        var value = item[key] || "";
        if (key === "airportNeed" || key === "transportationNeed") {
          value = directoryTransportLabel(value);
        }
        return String(value).toLowerCase().indexOf(filterValue) !== -1;
      });
    });
  }

  function renderTable(headers, rows, filterRow) {
    if (!rows.length) {
      return '<div class="panel empty-state">No records match the current filters.</div>';
    }

    var filterMarkup = "";
    if (filterRow && filterRow.length) {
      filterMarkup = "<tr>" + filterRow.map(function (cell) { return '<th class="table-filter-cell">' + cell + "</th>"; }).join("") + "</tr>";
    }

    return '<div class="table-wrap"><table><thead><tr>' +
      headers.map(function (header) { return "<th>" + escapeHtml(header) + "</th>"; }).join("") +
      "</tr>" + filterMarkup + '</thead><tbody>' +
      rows.map(function (row) {
        return "<tr>" + row.map(function (cell) { return "<td>" + sanitizeCell(cell) + "</td>"; }).join("") + "</tr>";
      }).join("") +
      "</tbody></table></div>";
  }

  function renderContent() {
    var contentArea = document.getElementById("contentArea");
    var filtered = getFilteredAttendees();
    var html = "";

    if (state.view === "attendees") {
      html = renderAttendeeViews(filtered);
    } else if (state.view === "airport") {
      html = renderAirportViews(filtered);
    } else if (state.view === "meals") {
      html = renderMealViews(filtered);
    } else if (state.view === "config") {
      html = renderConfigView();
    }

    contentArea.innerHTML = html || '<div class="panel empty-state">No records match the current filters.</div>';
    if (state.view === "attendees" && state.subview === "directory") {
      bindDirectoryFilters();
    }
    if (state.view === "config") {
      bindImporter();
      setSourceStatus(currentSourceStatus);
    }
  }

  function renderConfigView() {
    return '<div class="view-stack">' + renderNotice() + "</div>";
  }

  function renderAirportViews(list) {
    if (state.subview === "departures") {
      var departures = list.filter(function (item) { return item.departureFlight; });
      return renderTable([
        "Name", "Airport", "Date", "Time", "Flight", "Flight Tracker", "Dropoff Contact"
      ], departures.map(function (item) {
        var departureIdent = resolveFlightIdent(item.departureFlightIdent, item.departureFlight);
        return [
          item.name,
          item.departureAirport,
          item.departureDate,
          item.departureTime,
          item.departureFlight,
          renderFlightTrackerLink(departureIdent, item.departureDate),
          item.airportDropoffContact
        ];
      }));
    }

    if (state.subview === "driver-groups") {
      return renderGroupedCards(list, "driverGroup", "Driver Groups", function (item) {
        return [
          "Arrival: " + compactFlight(item.arrivalAirport, item.arrivalDate, item.arrivalTime, item.arrivalFlight),
          "Departure: " + compactFlight(item.departureAirport, item.departureDate, item.departureTime, item.departureFlight),
          "Contact: " + valueOrDash(item.airportPickupContact || item.airportDropoffContact)
        ];
      });
    }

    var arrivals = list.filter(function (item) { return item.arrivalFlight; });
    return renderTable([
      "Name", "Airport", "Date", "Time", "Flight", "Flight Tracker", "Pickup Contact"
    ], arrivals.map(function (item) {
      var arrivalIdent = resolveFlightIdent(item.arrivalFlightIdent, item.arrivalFlight);
      return [
        item.name,
        item.arrivalAirport,
        item.arrivalDate,
        item.arrivalTime,
        item.arrivalFlight,
        renderFlightTrackerLink(arrivalIdent, item.arrivalDate),
        item.airportPickupContact
      ];
    }));
  }

  function renderMealViews(list) {
    if (state.subview === "restrictions") {
      var restrictions = list.filter(function (item) { return item.foodNotes; });
      return renderTable([
        "Name", "Restriction Notes"
      ], restrictions.map(function (item) {
        return [
          item.name,
          item.foodNotes
        ];
      }));
    }

    var mealSets = [
      { label: "Dinner (Thursday)", field: "dinnerThursday" },
      { label: "Dinner (Saturday)", field: "dinnerSaturday" },
      { label: "Breakfast (Sunday)", field: "breakfastSunday" }
    ];

    return '<div class="view-stack">' + mealSets.map(function (mealSet) {
      return renderToGoMealSection(list, mealSet.label, mealSet.field);
    }).join("") + "</div>";
  }

  function renderGroupedCards(list, field, heading, itemFormatter) {
    var groups = groupBy(list, field);
    var groupNames = Object.keys(groups).sort();

    if (!groupNames.length) {
      return '<div class="panel empty-state">No records match the current filters.</div>';
    }

    return '<div class="view-stack">' +
      '<div class="section-heading"><h3>' + escapeHtml(heading) + '</h3><p>' + groupNames.length + " group(s)</p></div>" +
      '<div class="card-grid">' +
      groupNames.map(function (group) {
        return '<article class="card"><h3>' + escapeHtml(group || "Unassigned") + '</h3><div class="detail-list">' +
          groups[group].map(function (item) {
            return "<div><strong>" + escapeHtml(item.name) + "</strong><br>" + itemFormatter(item).map(function (line) {
              return '<span class="muted">' + escapeHtml(line) + "</span>";
            }).join("<br>") + "</div>";
          }).join("") +
          "</div></article>";
        }).join("") +
        "</div></div>";
  }

  function renderToGoMealSection(list, label, field) {
    var entries = list
      .filter(function (item) {
        var value = cleanValue(item[field]);
        return value && value.toLowerCase() !== "none";
      })
      .map(function (item) {
        return {
          name: item.name,
          value: cleanValue(item[field])
        };
      });

    var summary = countByValue(entries.map(function (entry) { return entry.value; }));
    var summaryMarkup = Object.keys(summary).sort().map(function (key) {
      return '<span class="chip chip--brand">' + escapeHtml(key) + ': ' + escapeHtml(String(summary[key])) + "</span>";
    }).join("");

    var tableMarkup = entries.length
      ? renderTable(["Name", "Selection"], entries.map(function (entry) {
          return [entry.name, entry.value];
        }))
      : '<div class="panel empty-state">No selections listed.</div>';

    return '<section class="panel">' +
      '<div class="section-heading"><h3>' + escapeHtml(label) + '</h3><p>' + entries.length + ' selection(s)</p></div>' +
      '<div class="tag-row">' + (summaryMarkup || '<span class="muted">No summary available.</span>') + '</div>' +
      '<div class="meal-section-table">' + tableMarkup + '</div>' +
      '</section>';
  }

  function getFilteredAttendees() {
    return attendees.filter(function (item) {
      var matchesStatus = state.view === "attendees" ? true : (state.status === "All" || (item.status || "Unknown") === state.status);
      var matchesRole = state.view !== "attendees" || state.role === "All" || (item.role || "Unknown") === state.role;
      var haystack = [
        item.name,
        item.role,
        item.phone,
        item.email,
        item.hotel,
        item.mealPreference,
        item.airportNeed,
        item.transportationNeed,
        item.notes
      ].join(" ").toLowerCase();
      var matchesSearch = !state.search || haystack.indexOf(state.search.toLowerCase()) !== -1;
      return matchesStatus && matchesRole && matchesSearch;
    });
  }

  function normalizeWorkbookData(workbook, sourceName) {
    var sheet = workbook.Sheets[workbook.SheetNames[0]];
    var rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
    var mappedAttendees = rows.map(function (row, index) {
      var attending = cleanValue(row["Will you be attending?"]);
      var dietary = cleanValue(row["Dietary restrictions"]);
      var airportTransfer = cleanValue(row["Do you need Airport Pick-up/Drop-off? "]) || cleanValue(row["Do you need Airport Pick-up/Drop-off?"]);
      var hotelTransport = cleanValue(row["Do you need transport from Hotel to Mandir?"]);
      return {
        id: index + 1,
        name: cleanValue(row["Full Name"]),
        city: "",
        role: cleanValue(row["Wing"]) || "Attendee",
        phone: normalizePhone(row["Mobile"]),
        email: cleanValue(row["Email Address"]),
        bapsEmail: cleanValue(row["BAPS Email"]),
        arrivalAirport: shortAirport(cleanValue(row["Arrival Airport"])),
        arrivalDate: normalizeDate(row["Arrival Date"]),
        arrivalTime: normalizeTime(row["Arrival Time"]),
        arrivalFlight: cleanValue(row["Arrival Airline & Flight Number"]),
        arrivalFlightIdent: extractFlightIdent(row["Arrival Airline & Flight Number"]),
        departureAirport: shortAirport(cleanValue(row["Departure Airport"])),
        departureDate: normalizeDate(row["Departure Date"]),
        departureTime: normalizeTime(row["Departure Time"]),
        departureFlight: cleanValue(row["Departure Airline & Flight Number"]),
        departureFlightIdent: extractFlightIdent(row["Departure Airline & Flight Number"]),
        airportNeed: toAirportNeed(airportTransfer),
        driverGroup: buildDriverGroup(cleanValue(row["Arrival Airport"]), row["Arrival Date"], row["Arrival Time"], airportTransfer),
        mealPreference: dietary || "Standard vegetarian",
        foodNotes: dietary,
        transportationNeed: toTransportationNeed(hotelTransport),
        hotel: cleanValue(row["Hotel"]) || hotelFromAccommodation(row["Accommodation"]),
        rooming: cleanValue(row["Hotel Confirmation"]),
        status: attending === "Yes" ? "Confirmed" : (attending || "Unknown"),
        accommodation: cleanValue(row["Accommodation"]),
        airportPickupContact: cleanValue(row["Airport Pickup Contact"]),
        airportDropoffContact: cleanValue(row["Airport Dropoff Contact"]),
        dinnerThursday: cleanValue(row["Dinner (Thursday)"]),
        dinnerSaturday: cleanValue(row["Dinner (Saturday)"]),
        breakfastSunday: cleanValue(row["Breakfast (Sunday)"]),
        notes: buildNotes(row)
      };
    }).filter(function (item) {
      return item.name;
    });

    return {
      event: {
        name: "BAPS NA Communications MidYear Meeting 2026",
        location: "Dallas, Texas",
        dates: "Update with meeting dates",
        notes: [
          "Imported from " + sourceName + ".",
          "The dashboard keeps all responses, and logistics teams can filter to confirmed attendees."
        ]
      },
      attendees: mappedAttendees
    };
  }

  function buildDriverGroup(airport, arrivalDate, arrivalTime, airportTransfer) {
    if (cleanValue(airportTransfer) !== "Yes") {
      return "Self-arranged";
    }

    return [shortAirport(cleanValue(airport)), normalizeDate(arrivalDate), normalizeTime(arrivalTime)]
      .filter(Boolean)
      .join(" | ");
  }

  function buildNotes(row) {
    var parts = [];
    var accommodation = cleanValue(row["Accommodation"]);
    var pickup = cleanValue(row["Airport Pickup Contact"]);
    var dropoff = cleanValue(row["Airport Dropoff Contact"]);
    if (accommodation) {
      parts.push("Stay: " + accommodation);
    }
    if (pickup) {
      parts.push("Pickup contact: " + pickup);
    }
    if (dropoff) {
      parts.push("Dropoff contact: " + dropoff);
    }
    return parts.join(" | ");
  }

  function groupBy(list, field) {
    return list.reduce(function (groups, item) {
      var key = item[field] || "Unassigned";
      groups[key] = groups[key] || [];
      groups[key].push(item);
      return groups;
    }, {});
  }

  function uniqueValues(list) {
    return list.filter(function (value, index) {
      return value && list.indexOf(value) === index;
    });
  }

  function countByValue(list) {
    return list.reduce(function (counts, value) {
      counts[value] = (counts[value] || 0) + 1;
      return counts;
    }, {});
  }

  function compactFlight(airport, date, time, flight) {
    var chunks = [airport, date, time, flight].filter(Boolean);
    return chunks.length ? chunks.join(" | ") : "Not listed";
  }

  function renderFlightTrackerLink(ident, date) {
    if (!ident) {
      return '<span class="muted">No link</span>';
    }

    var parsed = parseFlightIdent(ident);
    var parts = splitDateParts(date);
    if (!parsed) {
      return '<span class="muted">No link</span>';
    }

    var url = "https://www.flightstats.com/v2/flight-tracker/" +
      encodeURIComponent(parsed.airline) + "/" +
      encodeURIComponent(parsed.number);

    if (parts && isFlightStatsDateInRange(parts)) {
      url +=
        "?year=" + encodeURIComponent(parts.year) +
        "&month=" + encodeURIComponent(parts.month) +
        "&date=" + encodeURIComponent(parts.day);
    }

    return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noreferrer">View</a>';
  }

  function resolveFlightIdent(storedIdent, flightText) {
    var extracted = extractFlightIdent(flightText);
    if (extracted) {
      return extracted;
    }

    var parsedStored = parseFlightIdent(storedIdent);
    if (parsedStored) {
      return parsedStored.airline + parsedStored.number;
    }

    return "";
  }

  function directoryTransportLabel(value) {
    if (value === "Needs pickup / dropoff" || value === "Needs hotel to mandir transport") {
      return "Yes";
    }
    if (value === "No airport transfer needed" || value === "No hotel shuttle needed") {
      return "No";
    }
    return value || "Not listed";
  }

  function toAirportNeed(value) {
    if (value === "Yes") {
      return "Needs pickup / dropoff";
    }
    if (value === "No") {
      return "No airport transfer needed";
    }
    return value || "Not listed";
  }

  function toTransportationNeed(value) {
    if (value === "Yes") {
      return "Needs hotel to mandir transport";
    }
    if (value === "No") {
      return "No hotel shuttle needed";
    }
    return value || "Not listed";
  }

  function shortAirport(value) {
    if (!value) {
      return "";
    }
    return value.split(" - ")[0] || value;
  }

  function hotelFromAccommodation(value) {
    var text = cleanValue(value).toLowerCase();
    if (text.indexOf("hotel") !== -1) {
      return "Hotel requested";
    }
    if (text) {
      return "Self-arranged";
    }
    return "";
  }

  function normalizeDate(value) {
    var text = cleanValue(value);
    return text === "N/A" ? "" : text;
  }

  function normalizeTime(value) {
    var text = cleanValue(value);
    return text === "N/A" ? "" : text;
  }

  function normalizePhone(value) {
    var text = cleanValue(value).replace(/\.0$/, "").replace(/\s+/g, "");
    if (!text) {
      return "";
    }
    var digits = text.replace(/\D/g, "");
    if (digits.length === 10) {
      return digits.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    }
    return text;
  }

  function cleanValue(value) {
    return String(value == null ? "" : value).trim();
  }

  function extractFlightIdent(value) {
    var text = cleanValue(value);
    if (!text || text === "N/A") {
      return "";
    }

    var bracketed = text.match(/\(([A-Z0-9]{2,3})\s+(\d{1,4})\)/i);
    if (bracketed) {
      return normalizeAirlineCode(bracketed[1]) + bracketed[2];
    }

    var direct = text.match(/\b([A-Z0-9]{2,3})\s*-?\s*(\d{1,4})\b/i);
    if (direct) {
      return normalizeAirlineCode(direct[1]) + direct[2];
    }

    var normalized = text.toLowerCase();
    var airlineCodes = {
      "american airlines": "AA",
      "american": "AA",
      "delta air lines": "DL",
      "delta": "DL",
      "united airlines": "UA",
      "united": "UA",
      "southwest airlines": "WN",
      "southwest": "WN",
      "sw": "WN",
      "spirit airlines": "NK",
      "spirit": "NK",
      "frontier airlines": "F9",
      "frontier": "F9"
    };
    var airlineCode = "";

    Object.keys(airlineCodes).some(function (name) {
      if (normalized.indexOf(name) === 0) {
        airlineCode = normalizeAirlineCode(airlineCodes[name]);
        return true;
      }
      return false;
    });

    var flightNumber = normalized.match(/(\d{1,4})/);
    if (airlineCode && flightNumber) {
      return (airlineCode + flightNumber[1]).toUpperCase();
    }

    return "";
  }

  function parseFlightIdent(value) {
    var ident = cleanValue(value).toUpperCase();
    if (!ident) {
      return null;
    }

    var candidates = [2, 3];
    for (var i = 0; i < candidates.length; i += 1) {
      var codeLength = candidates[i];
      if (ident.length <= codeLength) {
        continue;
      }

      var airline = ident.slice(0, codeLength);
      var number = ident.slice(codeLength);
      if (!hasLetter(airline)) {
        continue;
      }
      if (!/^\d{1,4}$/.test(number)) {
        continue;
      }

      return {
        airline: normalizeAirlineCode(airline),
        number: number
      };
    }

    return null;
  }

  function normalizeAirlineCode(value) {
    var code = cleanValue(value).toUpperCase();
    if (code === "SW") {
      return "WN";
    }
    if (code === "DAL") {
      return "DL";
    }
    if (code === "UAL") {
      return "UA";
    }
    return code;
  }

  function hasLetter(value) {
    return /[A-Z]/i.test(cleanValue(value));
  }

  function splitDateParts(value) {
    var text = cleanValue(value);
    var isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return {
        year: isoMatch[1],
        month: String(Number(isoMatch[2])),
        day: String(Number(isoMatch[3]))
      };
    }

    var slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (slashMatch) {
      var year = slashMatch[3].length === 2 ? ("20" + slashMatch[3]) : slashMatch[3];
      return {
        year: year,
        month: String(Number(slashMatch[1])),
        day: String(Number(slashMatch[2]))
      };
    }

    var parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return {
        year: String(parsed.getFullYear()),
        month: String(parsed.getMonth() + 1),
        day: String(parsed.getDate())
      };
    }

    return null;
  }

  function isFlightStatsDateInRange(parts) {
    var flightDate = new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
    var today = new Date();
    var localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var diffMs = flightDate.getTime() - localToday.getTime();
    var diffDays = Math.round(diffMs / 86400000);
    return diffDays >= -3 && diffDays <= 3;
  }

  function cloneData(value) {
    return JSON.parse(JSON.stringify(value || { event: {}, attendees: [] }));
  }


  function badge(text, tone) {
    var safeTone = tone ? " chip--" + tone : "";
    return '<span class="chip' + safeTone + '">' + escapeHtml(text || "Unknown") + "</span>";
  }

  function valueOrDash(value) {
    return value || "Not listed";
  }

  function sanitizeCell(value) {
    if (String(value).indexOf("<span") !== -1 || String(value).indexOf("<a ") !== -1) {
      return value;
    }
    return escapeHtml(value == null ? "" : String(value));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  init();
}());
