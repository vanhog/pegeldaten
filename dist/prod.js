'use strict';
import { getNestedValue, mapObject } from './helper.ts';
import { Temporal } from '@js-temporal/polyfill';
//settings
var restStations =
  'http://pegelonline.wsv.de/webservices/rest-api/v2/stations/';
var aisleTSM = '.json?includeTimeseries=true&includeCurrentMeasurement=true';
var gaugeStationsURL =
  'https://pegelonline.wsv.de/webservices/rest-api/v2/stations.json';
var gaugeStationsURLts =
  'https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations.json?includeTimeseries=true&includeCurrentMeasurement=true';
var searchTermWasserstand = 'WASSERSTAND';
var timeZoneClassifier = 'Europe/Copenhagen';
var timeLocaleClassifier = 'de-DE';
var factsToRender = {
  num: 'number',
  name: 'shortname',
  waterlongname: 'water-longname',
  km: 'km',
  lat: 'latitude',
  lon: 'longitude',
};
//state
var currentStation = '';
var sortCol = '';
var sortDirUp = false;
var gaugeStationHeaderMap = {
  num: 'number',
  name: 'shortname',
  longname: 'longname',
  water: 'water.shortname',
  waterlongname: 'water.longname',
  km: 'km',
  lat: 'latitude',
  lon: 'longitude',
  uuid: 'uuid',
  agency: 'agency',
};
function formatDateThenTime(zdt, locale) {
  if (locale === void 0) {
    locale = timeLocaleClassifier;
  }
  var dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  var timeFmt = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
  // Intl.DateTimeFormat works with epoch milliseconds
  var ms = zdt.epochMilliseconds;
  return ''.concat(timeFmt.format(ms), ' - ').concat(dateFmt.format(ms));
}
function renderDrawer01(data) {
  document.getElementById('station-title-admin-shortname').innerText =
    data['shortname'];
  document.getElementById('station-title-admin-longname').innerText =
    data['longname'];
  document.getElementById('station-title-admin-water').innerText =
    data['water'].shortname;
  document.getElementById('station-title-admin-number').innerText =
    data['number'];
  document.getElementById('station-title-admin-agency').innerText =
    data['agency'];
}
function renderDrawer02(data) {
  var ts = [];
  var tStamp;
  console.log(data);
  //remove obsolete values and units
  document.getElementById('current-measurement-value').innerText = '---';
  document.getElementById('current-measurement-unit').innerText = '';
  document.getElementById('cmv-timestamp').innerText = 'Time/Date';
  if (data['timeseries']) {
    var searchTerm_1 = searchTermWasserstand;
    for (var _i = 0, _a = data['timeseries']; _i < _a.length; _i++) {
      var elem = _a[_i];
      ts.push(elem.longname);
    }
    var waterTS = data['timeseries'].filter(function (a) {
      return a.longname.toUpperCase().includes(searchTerm_1);
    });
    if (waterTS.length > 0) {
      // store as UTC for later use
      tStamp = Temporal.Instant.from(waterTS[0].currentMeasurement.timestamp);
      //document.getElementById('current-measurement-title').innerText =
      //searchTerm;
      document.getElementById('current-measurement-value').innerText =
        waterTS[0].currentMeasurement.value;
      document.getElementById('current-measurement-unit').innerText =
        waterTS[0].unit;
      document.getElementById('cmv-timestamp').innerText = formatDateThenTime(
        tStamp.toZonedDateTimeISO(timeZoneClassifier),
      );
    }
  }
}
/**
 * Render or update the map (using OpenStreetMap)
 * ------------------------
 * @param {Object} data - Data object containing at least:
 *   - latitude
 *   - longitude
 * @param {number} [iniZoom=13] - Initial zoom level for the map view
 * @param {boolean} [showMarker=true] - Whether to display/update a marker
 *
 * Behavior:
 * - First call: initializes the map and tile layer
 * - Subsequent calls: updates map center and zoom
 * - Marker is created once and then repositioned
 */
var MapModule = (function () {
  var map = null;
  var marker = null;
  function render(data, iniZoom, showMarker) {
    if (iniZoom === void 0) {
      iniZoom = 13;
    }
    if (showMarker === void 0) {
      showMarker = true;
    }
    var lat = Number(data.latitude);
    var lon = Number(data.longitude);
    if (!map) {
      map = L.map('map').setView([lat, lon], iniZoom);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution:
          '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
    } else {
      map.setView([lat, lon], iniZoom);
    }
    if (showMarker) {
      if (marker) {
        marker.setLatLng([lat, lon]);
      } else {
        marker = L.marker([lat, lon]).addTo(map);
      }
    }
  }
  /**
   * Public API
   * ----------
   */
  return { render: render };
})();
//
function fetchStation(inUUID) {
  var _a, _b;
  var fetchURL = restStations + inUUID + aisleTSM;
  // if there's station selected, remove selection style
  if (currentStation) {
    (_a = document.getElementById(currentStation)) === null || _a === void 0
      ? void 0
      : _a.classList.remove('stationRowSelected');
  }
  (_b = document.getElementById(inUUID)) === null || _b === void 0
    ? void 0
    : _b.classList.add('stationRowSelected');
  currentStation = inUUID;
  fetch(fetchURL)
    .then(function (response) {
      if (!response.ok)
        return console.log('Gauge station could not be loaded!');
      return response.json();
    })
    .then(function (data) {
      renderDrawer01(data);
      renderDrawer02(data);
      //renderDrawer03(data);
      MapModule.render(data, 13);
    });
}
function renderStations(inStations, inHeader) {
  var sect = document.getElementById('stationList');
  // remove old wrapper/table if present
  var oldWrapper = document.getElementById('dataTableWrapper');
  if (oldWrapper) {
    sect === null || sect === void 0 ? void 0 : sect.removeChild(oldWrapper);
  }
  // scroll wrapper
  var tableWrapper = document.createElement('div');
  tableWrapper.id = 'dataTableWrapper';
  tableWrapper.classList.add('hiid-table-wrapper');
  sect === null || sect === void 0 ? void 0 : sect.appendChild(tableWrapper);
  // table
  var tab = document.createElement('table');
  tab.classList.add('hiid-table');
  tab.id = 'dataTable';
  tableWrapper.appendChild(tab);
  var tabCaption = document.createElement('caption');
  tabCaption.innerText = 'Gauge Stations';
  tabCaption.classList.add('sr-only');
  tab.appendChild(tabCaption);
  // table header
  var dataTableHeader = Object.keys(inHeader).map(function (element) {
    return element.toUpperCase();
  });
  var tabHeader = document.createElement('thead');
  var tableHeaderRow = document.createElement('tr');
  tableHeaderRow.classList.add('tableHeaderRow');
  var _loop_1 = function (thisCol) {
    var tableHeaderCell = document.createElement('th');
    tableHeaderCell.innerText = String(thisCol);
    tableHeaderCell.classList.add('tableHeaderRowElement');
    tableHeaderCell.setAttribute('id', ''.concat(thisCol));
    tableHeaderCell.setAttribute('scope', 'col');
    tableHeaderCell.setAttribute('tabindex', '0');
    tableHeaderCell.addEventListener('click', function () {
      sortTable(inStations, ''.concat(thisCol), true);
    });
    tableHeaderRow.appendChild(tableHeaderCell);
  };
  for (
    var _i = 0, dataTableHeader_1 = dataTableHeader;
    _i < dataTableHeader_1.length;
    _i++
  ) {
    var thisCol = dataTableHeader_1[_i];
    _loop_1(thisCol);
  }
  tabHeader.appendChild(tableHeaderRow);
  tab.appendChild(tabHeader);
  // table body
  var tabBody = document.createElement('tbody');
  var _loop_2 = function (station) {
    var row = document.createElement('tr');
    var stationUUID = station['uuid'];
    row.classList.add('stationRow');
    row.setAttribute('id', stationUUID);
    row.setAttribute('tabindex', '0');
    row.addEventListener('dblclick', function () {
      fetchStation(station['uuid']);
    });
    for (var fact in station) {
      if (Object.keys(inHeader).includes(fact)) {
        var thisTd = document.createElement('td');
        thisTd.innerText = String(station[fact]);
        thisTd.classList.add('stationRowElement');
        row.appendChild(thisTd);
      }
    }
    tabBody.appendChild(row);
  };
  for (var _a = 0, inStations_1 = inStations; _a < inStations_1.length; _a++) {
    var station = inStations_1[_a];
    _loop_2(station);
  }
  tab.appendChild(tabBody);
}
function sortTable(inStations, inKey, inUp) {
  // for debugging reasons only
  // console.log(`I would like to sort efter ${inKey}.`);
  // console.log(
  //   inStations[0].num,
  //   inStations[0]['num'],
  //   inStations[0][inKey.toLowerCase()],
  //   Number(inStations[0][inKey.toLowerCase()]),
  // );
  if (inUp === void 0) {
    inUp = true;
  }
  if (sortCol === inKey) {
    sortDirUp = !sortDirUp;
  } else {
    sortCol = inKey;
    sortDirUp = true;
  }
  var sortUp = sortDirUp;
  var viewList = inStations;
  if (isNaN(Number(inStations[0][inKey.toLowerCase()]))) {
    if (sortUp) {
      viewList = inStations.sort(function (a, b) {
        return String(a[inKey.toLowerCase()]).localeCompare(
          b[inKey.toLowerCase()],
        );
      });
    } else {
      viewList = inStations.sort(function (a, b) {
        return String(b[inKey.toLowerCase()]).localeCompare(
          a[inKey.toLowerCase()],
        );
      });
    }
  } else {
    viewList = inStations.sort(function (a, b) {
      var aRank =
        a[inKey.toLowerCase()] === undefined
          ? Infinity
          : a[inKey.toLocaleLowerCase()];
      var bRank =
        b[inKey.toLowerCase()] === undefined
          ? Infinity
          : b[inKey.toLocaleLowerCase()];
      if (sortUp) {
        return Number(aRank) - Number(bRank);
      } else {
        return Number(bRank) - Number(aRank);
      }
    });
    console.log('Sort mode: NUMBER');
  }
  renderStations(viewList, factsToRender);
}
// first of all: get the stations
fetch(gaugeStationsURLts)
  .then(function (response) {
    if (!response.ok) return console.log('Gauge stations could not be loaded!');
    return response.json();
  })
  .then(function (data) {
    var _a, _b;
    var mappedStations = data.map((s) => mapObject(s, gaugeStationHeaderMap));
    currentStation = mappedStations[0].uuid;
    renderStations(mappedStations, factsToRender);
    // renderDrawer03({ longitude: 10.17055, latitude: 53.17903 }, 5);
    MapModule.render({ longitude: 10.17055, latitude: 53.17903 }, 5, false);
    console.log(factsToRender);
    (_a = document.getElementById('searchButton')) === null || _a === void 0
      ? void 0
      : _a.addEventListener('click', function () {
          return keywordSearch(mappedStations, factsToRender);
        });
    (_b = document.getElementById('searchTerm')) === null || _b === void 0
      ? void 0
      : _b.addEventListener('change', function () {
          console.log('enter search');
          keywordSearch(mappedStations, factsToRender);
        });
  });
function keywordSearch(inStations, factsToRender) {
  var searchField = document.getElementById('searchTerm');
  var searchTerm = searchField.value.toLowerCase();
  var term = searchTerm.toLowerCase();
  var filteredStations = inStations.filter(function (station) {
    var _a, _b, _c, _d;
    return (
      ((_a = station.num) !== null && _a !== void 0 ? _a : '')
        .toLowerCase()
        .includes(term) ||
      ((_b = station.name) !== null && _b !== void 0 ? _b : '')
        .toLowerCase()
        .includes(term) ||
      ((_c = station.waterlongname) !== null && _c !== void 0 ? _c : '')
        .toLowerCase()
        .includes(term) ||
      ((_d = station.water) !== null && _d !== void 0 ? _d : '')
        .toLowerCase()
        .includes(term)
    );
  });
  renderStations(filteredStations, factsToRender);
}
