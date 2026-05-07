// ============================================================
// script.js — NYC Gas Price Tracker
// Uses the EIA Open Data API to display weekly gas prices
// for New York State and surrounding regions.
//
// Endpoints used:
//   1. /petroleum/pri/gnd/data/   → gas price data
//   2. /petroleum/pri/gnd/facet/duoarea → area code list
// ============================================================


// ============================================================
// CONFIGURATION
// Replace YOUR_API_KEY with your real EIA API key.
// Get a free key at: https://www.eia.gov/opendata/
// ============================================================
const API_KEY = "650AreLTKWz6eqyeVQAaSyHeouaTrHVnw9BhGRtN";

// The base URL for all EIA API requests
const BASE_URL = "https://api.eia.gov/v2";


// ============================================================
// FUEL TYPE LOOKUP TABLE
// Maps EIA product codes to human-readable fuel names
// ============================================================
const FUEL_NAMES = {
  "EPM0":  "Regular Gasoline",
  "EPM0U": "Regular (All Formulations)",
  "EPMM":  "Midgrade Gasoline",
  "EPMP":  "Premium Gasoline",
  "EPD2D": "Diesel (No. 2)",
  "EPD2":  "Diesel"
};

// Returns a readable fuel name, or the raw code if not found
function getFuelName(productCode) {
  return FUEL_NAMES[productCode] || productCode;
}


// ============================================================
// FUEL TYPE BADGE COLOR
// Gives each fuel type a Bootstrap color class for the badge
// ============================================================
function getFuelBadgeColor(productCode) {
  if (productCode === "EPM0" || productCode === "EPM0U") return "success";   // green
  if (productCode === "EPMM") return "primary";                               // blue
  if (productCode === "EPMP") return "danger";                                // red
  if (productCode.startsWith("EPD")) return "dark";                           // black
  return "secondary";                                                          // gray
}


// ============================================================
// FUNCTION: loadGasPrices(areaCode)
// Used on: index.html
//
// Fetches weekly gas price data for a specific EIA area code
// and renders summary cards + a data table on the page.
//
// Uses Endpoint 1: /petroleum/pri/gnd/data/
// ============================================================
function loadGasPrices(areaCode) {

  // Build the API request URL with all query parameters
  const url = BASE_URL + "/petroleum/pri/gnd/data/"
    + "?frequency=weekly"
    + "&data[0]=value"
    + "&facets[duoarea][]=" + areaCode
    + "&sort[0][column]=period"
    + "&sort[0][direction]=desc"
    + "&length=20"
    + "&api_key=" + API_KEY;

  // Use fetch() to call the API — this is built into modern browsers
  fetch(url)
    .then(function(response) {
      // Check if the server responded successfully
      if (!response.ok) {
        throw new Error("API request failed with status " + response.status);
      }
      // Convert the response to JSON so we can work with it
      return response.json();
    })
    .then(function(json) {
      // The actual data rows are inside json.response.data
      var rows = json.response.data;

      // If no data came back, show an error
      if (!rows || rows.length === 0) {
        showError("loading", "error-box");
        return;
      }

      // Hide the loading spinner now that we have data
      document.getElementById("loading").classList.add("d-none");

      // Show the table title
      var titleEl = document.getElementById("table-title");
      if (titleEl) titleEl.style.display = "block";

      // Build the summary cards (one per fuel type for the most recent week)
      buildSummaryCards(rows);

      // Build the full data table
      buildPriceTable(rows);
    })
    .catch(function(error) {
      // Something went wrong — hide loading and show the error box
      console.error("EIA API error:", error);
      showError("loading", "error-box");
    });
}


// ============================================================
// FUNCTION: buildSummaryCards(rows)
// Creates one Bootstrap card per fuel type showing the
// most recent price for that fuel.
// ============================================================
function buildSummaryCards(rows) {
  var container = document.getElementById("summary-cards");
  if (!container) return;

  // Track which fuel types we've already shown (to get only the latest)
  var seen = {};

  rows.forEach(function(row) {
    var product = row["product"];

    // Skip if we've already made a card for this fuel type
    if (seen[product]) return;
    seen[product] = true;

    // Only show rows where we have a valid price
    if (!row["value"] || row["value"] === null) return;

    // Create one card column
    var col = document.createElement("div");
    col.className = "col-sm-6 col-md-3";

    var price = parseFloat(row["value"]).toFixed(3);
    var fuel  = getFuelName(product);
    var badge = getFuelBadgeColor(product);
    var date  = row["period"];

    col.innerHTML = `
      <div class="card h-100 shadow-sm price-card">
        <div class="card-body text-center">
          <span class="badge bg-${badge} mb-2">${fuel}</span>
          <h2 class="display-5 fw-bold text-success">$${price}</h2>
          <p class="text-muted mb-0">per gallon</p>
          <small class="text-muted">Week of ${date}</small>
        </div>
      </div>
    `;

    container.appendChild(col);
  });

  // Now show the cards container (it was hidden until now)
  container.classList.remove("d-none");
}


// ============================================================
// FUNCTION: buildPriceTable(rows)
// Builds a full HTML table with one row per data entry.
// ============================================================
function buildPriceTable(rows) {
  var tbody  = document.getElementById("price-table-body");
  var wrapper = document.getElementById("table-wrapper");
  if (!tbody || !wrapper) return;

  // Clear any old content
  tbody.innerHTML = "";

  rows.forEach(function(row) {
    // Skip rows with no price data
    if (!row["value"] || row["value"] === null) return;

    var tr = document.createElement("tr");

    var price    = parseFloat(row["value"]).toFixed(3);
    var fuel     = getFuelName(row["product"]);
    var badge    = getFuelBadgeColor(row["product"]);
    var areaName = row["area-name"] || row["duoarea"];

    tr.innerHTML = `
      <td>${row["period"]}</td>
      <td>${areaName}</td>
      <td><span class="badge bg-${badge}">${fuel}</span></td>
      <td class="fw-bold text-success">$${price}</td>
      <td>${row["units"] || "$/gal"}</td>
    `;

    tbody.appendChild(tr);
  });

  // Show the table wrapper
  wrapper.classList.remove("d-none");
}


// ============================================================
// FUNCTION: showError(loadingId, errorId)
// Hides the loading spinner and shows an error message box.
// ============================================================
function showError(loadingId, errorId) {
  var loading = document.getElementById(loadingId);
  var errorBox = document.getElementById(errorId);
  if (loading)  loading.classList.add("d-none");
  if (errorBox) errorBox.classList.remove("d-none");
}


// ============================================================
// FUNCTION: loadAreaComparison()
// Used on: boroughs.html
//
// Step 1: Calls Endpoint 2 (facets) to get all area codes
// Step 2: For a set of NY-relevant areas, calls Endpoint 1
//         to fetch the most recent price
// Then displays cards and a facets reference table
// ============================================================
function loadAreaComparison() {

  // These are the EIA area codes relevant to New York
  // The EIA does not have per-borough data, so these are the
  // closest regional breakdowns available
  var nyAreas = ["SNY", "NUS", "R10", "R1X"];

  // Area labels so we can show a friendly name
  var areaLabels = {
    "SNY": "New York State",
    "NUS": "U.S. National Average",
    "R10": "East Coast (PADD 1)",
    "R1X": "New England"
  };

  // --- STEP 1: Fetch the facets list (Endpoint 2) ---
  var facetUrl = BASE_URL + "/petroleum/pri/gnd/facet/duoarea?api_key=" + API_KEY;

  fetch(facetUrl)
    .then(function(response) {
      if (!response.ok) throw new Error("Facet request failed");
      return response.json();
    })
    .then(function(json) {
      // Build the reference table of all area codes
      buildFacetsTable(json.response.values || []);
    })
    .catch(function(error) {
      console.error("Facet load error:", error);
      // Non-critical — the page still works without the facets table
    });

  // --- STEP 2: Fetch price data for each NY area (Endpoint 1) ---
  // We'll collect all results in an array, then render them all at once
  var allResults = [];
  var pending    = nyAreas.length;  // how many requests are still in progress

  nyAreas.forEach(function(areaCode) {

    var url = BASE_URL + "/petroleum/pri/gnd/data/"
      + "?frequency=weekly"
      + "&data[0]=value"
      + "&facets[duoarea][]=" + areaCode
      + "&facets[product][]=EPM0U"   // Regular gasoline (all formulations)
      + "&sort[0][column]=period"
      + "&sort[0][direction]=desc"
      + "&length=1"                  // Just the most recent record
      + "&api_key=" + API_KEY;

    fetch(url)
      .then(function(response) {
        if (!response.ok) throw new Error("Area request failed for " + areaCode);
        return response.json();
      })
      .then(function(json) {
        var rows = json.response.data;
        if (rows && rows.length > 0) {
          // Add a friendly label to the result
          rows[0]["friendly-name"] = areaLabels[areaCode] || rows[0]["area-name"];
          allResults.push(rows[0]);
        }
        pending--;
        // Once all area requests are done, render the cards
        if (pending === 0) {
          renderAreaCards(allResults);
        }
      })
      .catch(function(error) {
        console.error("Error fetching area " + areaCode + ":", error);
        pending--;
        if (pending === 0) {
          renderAreaCards(allResults);
        }
      });
  });
}


// ============================================================
// FUNCTION: renderAreaCards(results)
// Displays one card per region on the boroughs page.
// ============================================================
function renderAreaCards(results) {
  // Hide the loading spinner
  document.getElementById("loading-areas").classList.add("d-none");

  var container = document.getElementById("area-cards");
  var heading   = document.getElementById("areas-heading");
  if (!container) return;

  // If nothing loaded, show the error box
  if (results.length === 0) {
    showError("loading-areas", "error-areas");
    return;
  }

  // Show the section heading
  if (heading) heading.classList.remove("d-none");

  results.forEach(function(row) {
    var price     = parseFloat(row["value"]).toFixed(3);
    var areaName  = row["friendly-name"] || row["area-name"];
    var date      = row["period"];

    var col = document.createElement("div");
    col.className = "col-sm-6 col-md-3";

    col.innerHTML = `
      <div class="card h-100 shadow-sm price-card">
        <div class="card-header text-center fw-bold">${areaName}</div>
        <div class="card-body text-center">
          <h2 class="display-5 fw-bold text-success">$${price}</h2>
          <p class="text-muted mb-0">Regular Gasoline / gal</p>
          <small class="text-muted">Week of ${date}</small>
        </div>
      </div>
    `;

    container.appendChild(col);
  });
}


// ============================================================
// FUNCTION: buildFacetsTable(values)
// Fills in the reference table of all EIA area codes on
// the boroughs page.
// ============================================================
function buildFacetsTable(values) {
  var tbody   = document.getElementById("facets-table-body");
  var wrapper = document.getElementById("facets-wrapper");
  var heading = document.getElementById("facets-heading");
  var subtext = document.getElementById("facets-subtext");
  if (!tbody || !wrapper) return;

  tbody.innerHTML = "";

  values.forEach(function(item) {
    var tr = document.createElement("tr");
    tr.innerHTML = `
      <td><code>${item.id}</code></td>
      <td>${item.description}</td>
    `;
    tbody.appendChild(tr);
  });

  // Show the table and its heading
  wrapper.classList.remove("d-none");
  if (heading) heading.classList.remove("d-none");
  if (subtext) subtext.classList.remove("d-none");
}
