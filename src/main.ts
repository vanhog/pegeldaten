import { getNestedValue, mapObject, getElementOrThrow } from './helper.ts';
import { Temporal } from '@js-temporal/polyfill';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import Chart from 'chart.js/auto';

//settings
const restStations: string =
  'https://pegelonline.wsv.de/webservices/rest-api/v2/stations/';

const fetchStationAisleTSM: string =
  '.json?includeTimeseries=true&includeCurrentMeasurement=true';

const fetchTSAisleTSM: string = '/W/measurements.json?start=P15D';

const gaugeStationsURL: string =
  'https://pegelonline.wsv.de/webservices/rest-api/v2/stations.json';

const gaugeStationsURLts: string =
  'https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations.json?includeTimeseries=true&includeCurrentMeasurement=true';

const searchTermWasserstand: string = 'WASSERSTAND';
const timeZoneClassifier: string = 'Europe/Copenhagen';
const timeLocaleClassifier: string = 'de-DE';

const factsToRender: Partial<GaugeStationHeaderMap> = {
  num: 'number',
  name: 'shortname',
  waterlongname: 'water-longname',
  km: 'km',
  lat: 'latitude',
  lon: 'longitude',
};

//state
let currentStation: string = '';

let sortCol: string = '';
let sortDirUp: boolean = false;

// let map = '';
// let marker = '';

//consts and variables

type CurrentMeasurement = {
  timestamp: string;
  value: number;
};

type TimeSeries = {
  longname: string;
  unit: string;
  currentMeasurement: CurrentMeasurement;
};

type StationDetails = {
  shortname: string;
  longname: string;
  number: string;
  agency: string;
  latitude: number;
  longitude: number;
  water: {
    shortname: string;
    longname: string;
  };
  timeseries?: TimeSeries[];
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type GaugeStationHeaderKeys =
  | 'num'
  | 'name'
  | 'longname'
  | 'water'
  | 'waterlongname'
  | 'km'
  | 'lat'
  | 'lon'
  | 'uuid'
  | 'agency';

type GaugeStationHeaderMap = Record<GaugeStationHeaderKeys, string>;

const gaugeStationHeaderMap: GaugeStationHeaderMap = {
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
} as const;

function formatDateThenTime(
  zdt: Temporal.ZonedDateTime,
  locale = timeLocaleClassifier,
): string {
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  const timeFmt = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });

  // Intl.DateTimeFormat works with epoch milliseconds
  const ms = zdt.epochMilliseconds;

  return `${timeFmt.format(ms)} - ${dateFmt.format(ms)}`;
}

function renderDrawer01(data: StationDetails): void {
  getElementOrThrow('station-title-admin-shortname').innerText = data.shortname;
  getElementOrThrow('station-title-admin-longname').innerText = data.longname;
  getElementOrThrow('station-title-admin-water').innerText =
    data.water.shortname;
  getElementOrThrow('station-title-admin-number').innerText = data.number;
  getElementOrThrow('station-title-admin-agency').innerText = data.agency;
}

function renderDrawer02(data: StationDetails): void {
  let tStamp: Temporal.Instant;

  console.log(data);
  //remove obsolete values and units
  getElementOrThrow('current-measurement-value').innerText = '---';
  getElementOrThrow('current-measurement-unit').innerText = '';
  getElementOrThrow('cmv-timestamp').innerText = 'Time/Date';

  if (data.timeseries) {
    const waterMeasurement = data.timeseries?.filter((timeseries) =>
      timeseries.longname.toUpperCase().includes(searchTermWasserstand),
    );

    if (!waterMeasurement || waterMeasurement.length === 0) return;

    if (waterMeasurement.length > 0) {
      // store as UTC for later use
      tStamp = Temporal.Instant.from(
        waterMeasurement[0].currentMeasurement.timestamp,
      );

      //document.getElementById('current-measurement-title').innerText =
      //searchTerm;
      getElementOrThrow('current-measurement-value').innerText = String(
        waterMeasurement[0].currentMeasurement.value,
      );
      getElementOrThrow('current-measurement-unit').innerText =
        waterMeasurement[0].unit;

      getElementOrThrow('cmv-timestamp').innerText = formatDateThenTime(
        tStamp.toZonedDateTimeISO(timeZoneClassifier),
      );
    }
  }
}

/**
 * Render or update the map (using OpenStreetMap)
 * ------------------------
 * @param {Coordinates} data - Data object containing at least:
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

const MapModule = (() => {
  let map: L.Map | null = null;
  let marker: L.Marker | null = null;

  function render(
    data: Coordinates,
    iniZoom: number = 13,
    showMarker: boolean = true,
  ): void {
    const lat = Number(data.latitude);
    const lon = Number(data.longitude);

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
  return { render };
})();

function renderTS(inTS) {
  //const data = inTS;
  const data = [
    { date: '2024-01-01', temperature: 4.2 },
    { date: '2024-02-01', temperature: 5.1 },
    { date: '2024-03-01', temperature: 8.4 },
    { date: '2024-04-01', temperature: 12.0 },
  ];
  const ctx = document.getElementById('chart-container');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((d) => d.date),
      datasets: [
        {
          label: 'Temperature',
          data: data.map((d) => d.temperature),
          borderWidth: 2,
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Date',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Temperature [°C]',
          },
        },
      },
    },
  });
}
function fetchTS(inUUID: string) {
  const fetchURL = restStations + inUUID + fetchTSAisleTSM;
  console.log(fetchURL);
  fetch(fetchURL)
    .then((response) => {
      if (!response.ok)
        return console.log('Gauge station could not be loaded!');

      return response.json();
    })
    .then((data) => {
      console.log('We have some data');
      console.log(data);
      renderTS();
    });
}
//
function fetchStation(inUUID: string) {
  const fetchURL = restStations + inUUID + fetchStationAisleTSM;

  // if there's station selected, remove selection style
  if (currentStation) {
    document
      .getElementById(currentStation)
      ?.classList.remove('stationRowSelected');
  }

  document.getElementById(inUUID)?.classList.add('stationRowSelected');
  currentStation = inUUID;
  fetch(fetchURL)
    .then((response) => {
      if (!response.ok) throw new Error('Gauge station could not be loaded!');

      return response.json() as Promise<StationDetails>;
    })
    .then((data) => {
      renderDrawer01(data);
      renderDrawer02(data);
      //TODO: MapModule only, when Lat/Lon supplied
      MapModule.render(data, 13);
      fetchTS(inUUID);
    });
}

function renderStations(inStations, inHeader): void {
  const sect = document.getElementById('stationList');

  // remove old wrapper/table if present
  const oldWrapper = document.getElementById('dataTableWrapper');
  if (oldWrapper) {
    sect?.removeChild(oldWrapper);
  }

  // scroll wrapper
  const tableWrapper = document.createElement('div');
  tableWrapper.id = 'dataTableWrapper';
  tableWrapper.classList.add('hiid-table-wrapper');
  sect?.appendChild(tableWrapper);

  // table
  const tab = document.createElement('table');
  tab.classList.add('hiid-table');
  tab.id = 'dataTable';
  tableWrapper.appendChild(tab);

  const tabCaption = document.createElement('caption');
  tabCaption.innerText = 'Gauge Stations';
  tabCaption.classList.add('sr-only');
  tab.appendChild(tabCaption);

  // table header
  const dataTableHeader: string[] = Object.keys(inHeader).map((element) =>
    element.toUpperCase(),
  );

  const tabHeader = document.createElement('thead');

  const tableHeaderRow = document.createElement('tr');
  tableHeaderRow.classList.add('tableHeaderRow');

  for (const thisCol of dataTableHeader) {
    const tableHeaderCell = document.createElement('th');
    tableHeaderCell.innerText = String(thisCol);

    tableHeaderCell.classList.add('tableHeaderRowElement');

    tableHeaderCell.setAttribute('id', `${thisCol}`);
    tableHeaderCell.setAttribute('scope', 'col');
    tableHeaderCell.setAttribute('tabindex', '0');

    tableHeaderCell.addEventListener('click', () => {
      sortTable(inStations, `${thisCol}`, true);
    });

    tableHeaderRow.appendChild(tableHeaderCell);
  }

  tabHeader.appendChild(tableHeaderRow);
  tab.appendChild(tabHeader);

  // table body
  const tabBody = document.createElement('tbody');

  for (const station of inStations) {
    const row = document.createElement('tr');
    const stationUUID: string = station['uuid'];

    row.classList.add('stationRow');
    row.setAttribute('id', stationUUID);
    row.setAttribute('tabindex', '0');

    row.addEventListener('dblclick', () => {
      fetchStation(station['uuid']);
    });

    for (const fact in station) {
      if (Object.keys(inHeader).includes(fact)) {
        const thisTd = document.createElement('td');
        thisTd.innerText = String(station[fact]);
        thisTd.classList.add('stationRowElement');
        row.appendChild(thisTd);
      }
    }

    tabBody.appendChild(row);
  }

  tab.appendChild(tabBody);
}

function sortTable(inStations, inKey: string, inUp: boolean = true): void {
  // for debugging reasons only
  // console.log(`I would like to sort efter ${inKey}.`);
  // console.log(
  //   inStations[0].num,
  //   inStations[0]['num'],
  //   inStations[0][inKey.toLowerCase()],
  //   Number(inStations[0][inKey.toLowerCase()]),
  // );

  if (sortCol === inKey) {
    sortDirUp = !sortDirUp;
  } else {
    sortCol = inKey;
    sortDirUp = true;
  }

  let sortUp: boolean = sortDirUp;

  let viewList = inStations;

  if (isNaN(Number(inStations[0][inKey.toLowerCase()]))) {
    if (sortUp) {
      viewList = inStations.sort((a, b) =>
        String(a[inKey.toLowerCase()]).localeCompare(b[inKey.toLowerCase()]),
      );
    } else {
      viewList = inStations.sort((a, b) =>
        String(b[inKey.toLowerCase()]).localeCompare(a[inKey.toLowerCase()]),
      );
    }
  } else {
    viewList = inStations.sort((a?, b?) => {
      const aRank =
        a[inKey.toLowerCase()] === undefined
          ? Infinity
          : a[inKey.toLocaleLowerCase()];
      const bRank =
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
  .then((response) => {
    if (!response.ok) return console.log('Gauge stations could not be loaded!');

    return response.json();
  })
  .then((data) => {
    const mappedStations = data.map((s) => mapObject(s, gaugeStationHeaderMap));
    currentStation = mappedStations[0].uuid;
    renderStations(mappedStations, factsToRender);
    // renderDrawer03({ longitude: 10.17055, latitude: 53.17903 }, 5);
    MapModule.render({ longitude: 10.17055, latitude: 53.17903 }, 5, false);

    console.log(factsToRender);
    document
      .getElementById('searchButton')
      ?.addEventListener('click', () =>
        keywordSearch(mappedStations, factsToRender),
      );

    document.getElementById('searchTerm')?.addEventListener('change', () => {
      console.log('enter search');
      keywordSearch(mappedStations, factsToRender);
    });
  });

function keywordSearch(
  inStations: GaugeStationHeaderMap,
  factsToRender: GaugeStationHeaderMap,
): void {
  let searchField = document.getElementById('searchTerm') as HTMLInputElement;

  let searchTerm: string = searchField.value.toLowerCase();

  const term = searchTerm.toLowerCase();

  const filteredStations = inStations.filter(
    (station: GaugeStationHeaderMap) =>
      (station.num ?? '').toLowerCase().includes(term) ||
      (station.name ?? '').toLowerCase().includes(term) ||
      (station.waterlongname ?? '').toLowerCase().includes(term) ||
      (station.water ?? '').toLowerCase().includes(term),
  );
  renderStations(filteredStations, factsToRender);
}
