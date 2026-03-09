import { getNestedValue, mapObject } from './helper.ts';
import { Temporal } from '@js-temporal/polyfill';

//settings
const restStations: string =
  'http://pegelonline.wsv.de/webservices/rest-api/v2/stations/';
const aisleTSM: string =
  '.json?includeTimeseries=true&includeCurrentMeasurement=true';

const gaugeStationsURL: string =
  'https://pegelonline.wsv.de/webservices/rest-api/v2/stations.json';

const gaugeStationsURLts: string =
  'https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations.json?includeTimeseries=true&includeCurrentMeasurement=true';

const searchTermWasserstand: string = 'WASSERSTAND';
const timeZoneClassifier: string = 'Europe/Copenhagen';
const timeLocaleClassifier: string = 'de-DE';

const factsToRender: GaugeStationHeaderMap = {
  num: 'number',
  name: 'longname',
  water: 'water-longname',
  km: 'km',
  lat: 'latitude',
  lon: 'longitude',
};

//state
let currentStation: string = '';
let currentStations: GaugeStationHeaderMap;

//consts and variables

type GaugeStationHeaderKeys =
  | 'num'
  | 'name'
  | 'water'
  | 'km'
  | 'lat'
  | 'lon'
  | 'uuid'
  | 'agency';

type GaugeStationHeaderMap = Record<GaugeStationHeaderKeys, string>;

const gaugeStationHeaderMap: GaugeStationHeaderMap = {
  num: 'number',
  name: 'longname',
  water: 'water.longname',
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

function renderDrawer01(data: unknown) {
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

function renderDrawer02(data: unknown) {
  let ts: string[] = [];
  let tStamp: Temporal.Instant;

  console.log(data);
  //remove obsolete values and units
  document.getElementById('current-measurement-value').innerText = '---';
  document.getElementById('current-measurement-unit').innerText = '';
  document.getElementById('cmv-timestamp').innerText = 'Time/Date';

  if (data['timeseries']) {
    let searchTerm: string = searchTermWasserstand;

    for (let elem of data['timeseries']) {
      ts.push(elem.longname);
    }
    const waterTS = data['timeseries'].filter((a) =>
      a.longname.toUpperCase().includes(searchTerm),
    );

    if (waterTS.length > 0) {
      // store as UTC for later use
      tStamp = Temporal.Instant.from(waterTS[0].currentMeasurement.timestamp);

      document.getElementById('current-measurement-title').innerText =
        searchTerm;
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

//
function fetchStation(inUUID: string): Object {
  const fetchURL = restStations + inUUID + aisleTSM;

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
      if (!response.ok)
        return console.log('Gauge station could not be loaded!');

      return response.json();
    })
    .then((data) => {
      renderDrawer01(data);
      renderDrawer02(data);
    });
}

function renderStations(inStations, inHeader): void {
  const sect = document.getElementById('movieList');

  // if there's already a table, remove it
  const checkTable = document.getElementById('dataTable');
  if (checkTable) {
    sect?.removeChild(checkTable);
  }

  // table
  const tab = document.createElement('table');
  tab.classList.add('max-w-5xl');
  tab.classList.add('overflow-hidden');
  tab.classList.add('bg-hiid-table-bg');
  tab.classList.add('rounded-s-2xl');
  tab.id = 'dataTable';
  sect?.appendChild(tab);

  // table header
  const dataTableHeader: string[] = Object.keys(inHeader).map((element) =>
    element.toUpperCase(),
  );

  const tableHeaderRow = document.createElement('tr');
  for (const thisCol of dataTableHeader) {
    const tableHeaderCell = document.createElement('th');
    tableHeaderCell.innerText = String(thisCol);
    tableHeaderCell.classList.add('tableHeaderRowElement');
    tableHeaderCell.setAttribute('id', `${thisCol}`);
    tableHeaderCell.addEventListener('click', () => {
      sortTable(inStations, `${thisCol}`);
    });
    tableHeaderRow.classList.add('tableHeaderRow');
    tableHeaderRow.appendChild(tableHeaderCell);
  }
  tab.appendChild(tableHeaderRow);

  for (const station of inStations) {
    const row = document.createElement('tr');
    const stationUUID: string = station['uuid'];
    row.classList.add('stationRow');
    row.setAttribute('id', stationUUID);
    row.addEventListener('dblclick', () => {
      fetchStation(station['uuid']);
    });

    // cell
    for (const fact in station) {
      if (Object.keys(inHeader).includes(fact)) {
        const thisTd = document.createElement('td');

        thisTd.innerText = String(station[fact]);
        thisTd.classList.add('stationRowElement');
        row.appendChild(thisTd);
      }
    }
    tab?.appendChild(row);
  }
}

function sortTable(inStations, inKey: string): void {
  console.log(`I would like to sort efter ${inKey}.`);
  console.log(
    inStations[0].num,
    inStations[0]['num'],
    inStations[0][inKey.toLowerCase()],
    Number(inStations[0][inKey.toLowerCase()]),
  );

  let viewList = inStations;

  if (isNaN(Number(inStations[0][inKey.toLowerCase()]))) {
    viewList = inStations.sort((a, b) =>
      String(a[inKey.toLowerCase()]).localeCompare(b[inKey.toLowerCase()]),
    );
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
      return Number(aRank) - Number(bRank);
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

    // ///this is where I am
    // const sorted = [...mappedStations].sort((a, b) =>
    //   (a.num ?? '').localeCompare(b.num ?? ''),
    // );

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
      (station.water ?? '').toLowerCase().includes(term),
  );
  renderStations(filteredStations, factsToRender);
}
