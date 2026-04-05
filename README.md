# al-Ṯurayyā In-Box

**al-Ṯurayyā In-Box** is a bring-your-own-data version of the [al-Ṯurayyā Project](https://althurayya.github.io/). It provides the same interactive gazetteer and geospatial tools, but instead of loading a fixed dataset it lets you **upload your own data files** at runtime directly in the browser.

Live site: **https://althurayya-in-box.github.io/**

---

## How to use

Open the site. An upload panel will appear asking for three JSON files:

| File | Description | Default filename |
|------|-------------|-----------------|
| **Places** | GeoJSON feature collection of toponyms | `places_new_structure.geojson` |
| **Routes** | GeoJSON feature collection of route sections | `routes.json` |
| **Regions** | JSON object mapping region URIs to metadata | `regions.json` |

Select your files, click **Load Data**, and the map will initialise. To load a different dataset later, click the **Upload New Data** button on the Home tab.

The data files for the original al-Ṯurayyā dataset are available in the [althurayya.github.io repository](https://github.com/althurayya/althurayya.github.io/) under `master/`.

---

## Data format

### Places (`places_new_structure.geojson`)

A GeoJSON `FeatureCollection` of `Point` features. Each feature must have an `althurayyaData` block inside `properties`:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [<lon>, <lat>] },
      "properties": {
        "althurayyaData": {
          "URI": "PLACENAME_LONLAT_S",
          "coord_certainty": "certain|uncertain|approximate",
          "language": ["ara", "eng"],
          "names": {
            "ara": { "common": "...", "search": "...", "translit": "..." },
            "eng": { "common": "...", "search": "...", "translit": "..." }
          },
          "region_URI": "RegionCode_RE",
          "top_type": "metropoles|capitals|towns|villages|waystations|sites|xroads|waters|mont"
        }
      }
    }
  ]
}
```

### Routes (`routes.json`)

A GeoJSON `FeatureCollection` of `LineString` features:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "LineString", "coordinates": [[<lon>, <lat>], ...] },
      "properties": {
        "sToponym": "START_URI",
        "eToponym": "END_URI",
        "Meter": 45820.34,
        "sTitle": "...", "sTitleAr": "...", "sUri": "...",
        "eTitle": "...", "eTitleAr": "...", "eUri": "..."
      }
    }
  ]
}
```

### Regions (`regions.json`)

A plain JSON object keyed by region URI:

```json
{
  "RegionCode_RE": {
    "region_code": "Human readable name",
    "color": "#6CD941",
    "display": "Display label",
    "visual_center": "PLACE_URI"
  }
}
```

---

## Features

- **Gazetteer** — browse 2,000+ toponyms with Arabic names, transliterations, and regional metadata
- **Search** — autocomplete search by Arabic name or LOC transliteration
- **Regions** — highlight all places and routes belonging to a province
- **Route sections** — click any route to see its start/end points and length
- **Pathfinding** — find shortest and optimal paths between locations (Dijkstra's algorithm)
- **Network analysis** — model settlements reachable from a point within N days of travel (~30 km/day)

---

## Repository structure

```
index.html          Main page with upload overlay and sidebar
index.js            Map initialisation and file-upload logic
index.css           Styles, including the upload overlay
global_var.js       Global constants (place-type sizes, travel-day distance)
graph.js            Graph data structure
dijkstra.js         Dijkstra's algorithm
helper.js           Map utility functions
handle_marker.js    Marker creation and click handling
handle_routes.js    Route rendering and interaction
search_toponym.js   Autocomplete search
addPlace.js         Pathfinding UI helpers
addNetwork.js       Network UI helpers
addInput.js         Input UI helpers
HelpersForSelectionsUI.js  Selection UI helpers
coordAssign.js      Coordinate-assignment research tool
myzoom.js           Zoom handling
tile.stamen.js      Tile layer definitions
css/                Leaflet and sidebar stylesheets
fonts/              Brill and Gentium web fonts
d3.v3.min.js        D3 v3 (bundled)
data-structures-1.4.2.min.js  Graph data-structures library (bundled)
```

---

## Credits and Acknowledgments

**Current team**: Masoumeh Seydi (Aga Khan University, ISMC—London) and Maxim Romanov (Universität Hamburg, Asien-Afrika-Institut).

**Former contributors**: Cameron Jackson (Tufts University, 2013–2014) — technical and conceptual development; Adam Tavares (Perseus Project, Tufts University, 2013) — technical development.

**Suggested citation**: Seydi, Masoumeh, and Maxim Romanov. *al-Ṯurayyā Project: a gazetteer and a geospatial model of the early Islamic World.* [https://althurayya.github.io/](https://althurayya.github.io/), 2022—.

All data is available on [GitHub](https://github.com/althurayya/althurayya.github.io/).
