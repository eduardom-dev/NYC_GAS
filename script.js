// Endpoints used:
//   1. /petroleum/pri/gnd/data/   → gas price data
//   2. /petroleum/pri/gnd/facet/duoarea → area code list
const API_KEY = "650AreLTKWz6eqyeVQAaSyHeouaTrHVnw9BhGRtN";
// The base URL for all EIA API requests
const BASE_URL = "https://api.eia.gov/v2";
// FUEL TYPE LOOKUP TABLE
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
// FUEL TYPE BADGE COLOR
// Gives each fuel type a Bootstrap color class for the badge
function getFuelBadgeColor(productCode) {
  if (productCode === "EPM0" || productCode === "EPM0U") return "success";
  if (productCode === "EPMM") return "primary";
  if (productCode === "EPMP") return "danger";
  if (productCode.startsWith("EPD")) return "dark";
  return "secondary";
}
// GLOBAL VARIABLE — stores all rows for filtering
let allRows = [];
// FUNCTION: loadGasPrices(areaCode)
// Used on: index.html
// Uses async/await to fetch data from Endpoint 1.
// Renders summary cards + a data table.
async function loadGasPrices(areaCode) {

  // Build the API request URL
  const url = BASE_URL + "/petroleum/pri/gnd/data/"
    + "?frequency=weekly"
    + "&data[0]=value"
    + "&facets[duoarea][]=" + areaCode
    + "&sort[0][column]=period"
    + "&sort[0][direction]=desc"
    + "&length=20"
    + "&api_key=" + API_KEY;

  try {
    // Call the API and wait for a response
    const response = await fetch(url);

    // Check if the server responded successfully
    if (!response.ok) {
      throw new Error("API request failed with status " + response.status);
    }

    // Convert the response to JSON so we can work with it
    const json = await response.json();

    // The actual data rows are inside json.response.data
    const rows = json.response.data;

    // If no data came back, show an error
    if (!rows || rows.length === 0) {
      showError("loading", "error-box");
      return;
    }

    // Save rows globally so filter function can access them
    allRows = rows;

    // Hide the loading spinner now that we have data
    document.getElementById("loading").classList.add("d-none");

    // Show the table title using DOM manipulation
    const titleEl = document.getElementById("table-title");
    if (titleEl) titleEl.style.display = "block";

    // Show the filter section
    const filterSection = document.getElementById("filter-section");
    if (filterSection) filterSection.classList.remove("d-none");

    // Build the summary cards (one per fuel type for the most recent week)
    buildSummaryCards(rows);

    // Build the full data table
    buildPriceTable(rows);

  } catch (error) {
    // Something went wrong — hide loading and show the error box
    console.error("EIA API error:", error);
    showError("loading", "error-box");
  }
}

// FUNCTION: filterTable()
// Called by the filter button (onclick event).
// Reads the user's input from the form and filters the table.
function filterTable() {

  // Read the value the user typed in the search box
  const searchInput = document.getElementById("search-fuel");
  const searchValue = searchInput.value.toLowerCase();

  // Filter the rows array to only keep matching entries
  const filtered = allRows.filter(function(row) {
    const fuelName = getFuelName(row["product"]).toLowerCase();
    return fuelName.includes(searchValue);
  });

  // Show a message if nothing matched
  const noResults = document.getElementById("no-results");
  if (filtered.length === 0) {
    if (noResults) noResults.classList.remove("d-none");
  } else {
    if (noResults) noResults.classList.add("d-none");
  }

  // Re-build the table with only the filtered rows
  buildPriceTable(filtered);
}


// FUNCTION: clearFilter()
// Called by the clear button (onclick event).
// Resets the search box and shows all rows again.
function clearFilter() {
  // Clear the text input
  document.getElementById("search-fuel").value = "";

  // Hide the no-results message
  const noResults = document.getElementById("no-results");
  if (noResults) noResults.classList.add("d-none");

  // Rebuild the table with all rows
  buildPriceTable(allRows);
}


// FUNCTION: buildSummaryCards(rows)
// Creates one Bootstrap card per fuel type showing the
// most recent price for that fuel.
function buildSummaryCards(rows) {
  const container = document.getElementById("summary-cards");
  if (!container) return;

  // Track which fuel types we've already shown
  const seen = {};

  rows.forEach(function(row) {
    const product = row["product"];

    // Skip if we've already made a card for this fuel type
    if (seen[product]) return;
    seen[product] = true;

    // Only show rows where we have a valid price
    if (!row["value"] || row["value"] === null) return;

    // Create one card column
    const col = document.createElement("div");
    col.className = "col-sm-6 col-md-3";

    const price = parseFloat(row["value"]).toFixed(3);
    const fuel  = getFuelName(product);
    const badge = getFuelBadgeColor(product);
    const date  = row["period"];

    // Set the innerHTML of the card
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

  // Show the cards container
  container.classList.remove("d-none");
}


// FUNCTION: buildPriceTable(rows)
// Builds a full HTML table with one row per data entry.
function buildPriceTable(rows) {
  const tbody   = document.getElementById("price-table-body");
  const wrapper = document.getElementById("table-wrapper");
  if (!tbody || !wrapper) return;

  // Clear any old content using innerHTML
  tbody.innerHTML = "";

  rows.forEach(function(row) {
    // Skip rows with no price data
    if (!row["value"] || row["value"] === null) return;

    const tr = document.createElement("tr");

    const price    = parseFloat(row["value"]).toFixed(3);
    const fuel     = getFuelName(row["product"]);
    const badge    = getFuelBadgeColor(row["product"]);
    const areaName = row["area-name"] || row["duoarea"];

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


// FUNCTION: showError(loadingId, errorId)
// Hides the loading spinner and shows an error message box.
function showError(loadingId, errorId) {
  const loading  = document.getElementById(loadingId);
  const errorBox = document.getElementById(errorId);
  if (loading)  loading.classList.add("d-none");
  if (errorBox) errorBox.classList.remove("d-none");
}


// FUNCTION: loadAreaComparison()
// Used on: boroughs.html
// Uses async/await with Endpoint 2 (facets) and Endpoint 1
// to display regional price cards and an area code table.
async function loadAreaComparison() {

  // These are the EIA area codes relevant to New York
  const nyAreas = ["SNY", "NUS", "R10", "R1X"];

  // Friendly labels for each area code
  const areaLabels = {
    "SNY": "New York State",
    "NUS": "U.S. National Average",
    "R10": "East Coast (PADD 1)",
    "R1X": "New England"
  };

  //STEP 1: Fetch the facets list (Endpoint 2)
  try {
    const facetUrl = BASE_URL + "/petroleum/pri/gnd/facet/duoarea?api_key=" + API_KEY;
    const facetResponse = await fetch(facetUrl);

    if (!facetResponse.ok) throw new Error("Facet request failed");

    const facetJson = await facetResponse.json();
    buildFacetsTable(facetJson.response.values || []);

  } catch (error) {
    console.error("Facet load error:", error);
    // Non-critical — page still works without the facets table
  }

  // STEP 2: Fetch price data for each NY area (Endpoint 1)
  const allResults = [];

  // Loop through each area code and fetch its most recent price
  for (let i = 0; i < nyAreas.length; i++) {
    const areaCode = nyAreas[i];

    const url = BASE_URL + "/petroleum/pri/gnd/data/"
      + "?frequency=weekly"
      + "&data[0]=value"
      + "&facets[duoarea][]=" + areaCode
      + "&facets[product][]=EPM0U"
      + "&sort[0][column]=period"
      + "&sort[0][direction]=desc"
      + "&length=1"
      + "&api_key=" + API_KEY;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Area request failed for " + areaCode);

      const json = await response.json();
      const rows = json.response.data;

      if (rows && rows.length > 0) {
        // Add a friendly label to the result
        rows[0]["friendly-name"] = areaLabels[areaCode] || rows[0]["area-name"];
        allResults.push(rows[0]);
      }

    } catch (error) {
      console.error("Error fetching area " + areaCode + ":", error);
    }
  }

  // Render all the area cards once all fetches are done
  renderAreaCards(allResults);
}


// FUNCTION: renderAreaCards(results)
// Displays one card per region on the boroughs page.
function renderAreaCards(results) {
  // Hide the loading spinner
  document.getElementById("loading-areas").classList.add("d-none");

  const container = document.getElementById("area-cards");
  const heading   = document.getElementById("areas-heading");
  if (!container) return;

  // If nothing loaded, show the error box
  if (results.length === 0) {
    showError("loading-areas", "error-areas");
    return;
  }

  // Show the section heading
  if (heading) heading.classList.remove("d-none");

  results.forEach(function(row) {
    const price    = parseFloat(row["value"]).toFixed(3);
    const areaName = row["friendly-name"] || row["area-name"];
    const date     = row["period"];

    const col = document.createElement("div");
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


// FUNCTION: buildFacetsTable(values)
// Fills in the reference table of all EIA area codes on
// the boroughs page.
function buildFacetsTable(values) {
  const tbody   = document.getElementById("facets-table-body");
  const wrapper = document.getElementById("facets-wrapper");
  const heading = document.getElementById("facets-heading");
  const subtext = document.getElementById("facets-subtext");
  if (!tbody || !wrapper) return;

  // Clear old content
  tbody.innerHTML = "";

  values.forEach(function(item) {
    const tr = document.createElement("tr");
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
