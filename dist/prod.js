import { mapObject } from './helper.js';
import { Temporal } from 'https://esm.sh/@js-temporal/polyfill';

//settings
const restStations =
  'https://pegelonline.wsv.de/webservices/rest-api/v2/stations/';
const aisleTSM = '.json?includeTimeseries=true&includeCurrentMeasurement=true';

const gaugeStationsURL =
  'https://pegelonline.wsv.de/webservices/rest-api/v2/stations.json';

const gaugeStationsURLts =
  'https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations.json?includeTimeseries=true&includeCurrentMeasurement=true';

const searchTermWasserstand = 'WASSERSTAND';
const timeZoneClassifier = 'Europe/Copenhagen';
const timeLocaleClassifier = 'de-DE';

const factsToRender = {
  num: 'number',
  name: 'shortname',
  waterlongname: 'water-longname',
  km: 'km',
  lat: 'latitude',
  lon: 'longitude',
};

//state
let currentStation = '';
let currentStations;

const gaugeStationHeaderMap = {
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

function formatDateThenTime(zdt, locale = timeLocaleClassifier) {
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  const timeFmt = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });

  // Intl.DateTimeFormat works with epoch milliseconds
  const ms = zdt.epochMilliseconds;

  return `${timeFmt.format(ms)} - ${dateFmt.format(ms)}`;
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
  let ts = [];
  let tStamp;

  console.log(data);
  //remove obsolete values and units
  document.getElementById('current-measurement-value').innerText = '---';
  document.getElementById('current-measurement-unit').innerText = '';
  document.getElementById('cmv-timestamp').innerText = 'Time/Date';

  if (data['timeseries']) {
    let searchTerm = searchTermWasserstand;

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
function fetchStation(inUUID) {
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

function renderStations(inStations, inHeader) {
  const sect = document.getElementById('stationList');

  // remove old wrapper/table if present
  const oldWrapper = document.getElementById('dataTableWrapper');
  if (oldWrapper) {
    sect?.removeChild(oldWrapper);
  }

  // scroll wrapper
  const tableWrapper = document.createElement('div');
  tableWrapper.id = 'dataTableWrapper';
  tableWrapper.classList.add(
    'max-w-5xl',
    'max-h-153',
    'overflow-y-auto',
    'rounded-2xl',
  );
  sect?.appendChild(tableWrapper);

  // table
  const tab = document.createElement('table');
  tab.classList.add(
    'w-full',
    'border-separate',
    'border-spacing-0',
    'bg-hiid-table-bg',
  );
  tab.id = 'dataTable';
  tableWrapper.appendChild(tab);

  const tabCaption = document.createElement('caption');
  tabCaption.innerText = 'Gauge Stations';
  tabCaption.classList.add('sr-only');
  tab.appendChild(tabCaption);

  // table header
  const dataTableHeader = Object.keys(inHeader).map((element) =>
    element.toUpperCase(),
  );

  const tabHeader = document.createElement('thead');

  const tableHeaderRow = document.createElement('tr');
  tableHeaderRow.classList.add('tableHeaderRow');

  for (const thisCol of dataTableHeader) {
    const tableHeaderCell = document.createElement('th');
    tableHeaderCell.innerText = String(thisCol);

    tableHeaderCell.classList.add(
      'tableHeaderRowElement',
      'sticky',
      'top-0',
      'z-10',
      'bg-hiid-table-bg',
    );

    tableHeaderCell.setAttribute('id', `${thisCol}`);
    tableHeaderCell.setAttribute('scope', 'col');
    tableHeaderCell.setAttribute('tabindex', '0');

    tableHeaderCell.addEventListener('click', () => {
      sortTable(inStations, `${thisCol}`, true);
    });

    tableHeaderCell.addEventListener('dblclick', () => {
      console.log('dbl click');
      sortTable(inStations, `${thisCol}`, false);
    });

    tableHeaderRow.appendChild(tableHeaderCell);
  }

  tabHeader.appendChild(tableHeaderRow);
  tab.appendChild(tabHeader);

  // table body
  const tabBody = document.createElement('tbody');

  for (const station of inStations) {
    const row = document.createElement('tr');
    const stationUUID = station['uuid'];

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

// function renderStations(inStations, inHeader): void {
//   const sect = document.getElementById('stationList');

//   // if there's already a table, remove it
//   const checkTable = document.getElementById('dataTable');
//   if (checkTable) {
//     sect?.removeChild(checkTable);
//   }

//   // table
//   const tab = document.createElement('table');
//   tab.classList.add('max-w-5xl');
//   tab.classList.add('overflow-hidden');
//   tab.classList.add('bg-hiid-table-bg');
//   tab.classList.add('rounded-s-2xl');
//   tab.id = 'dataTable';
//   sect?.appendChild(tab);

//   const tabCaption = document.createElement('caption');
//   tabCaption.innerText = 'Gauge Stations';
//   tabCaption.classList.add('sr-only');
//   tab?.appendChild(tabCaption);

//   // table header
//   const dataTableHeader: string[] = Object.keys(inHeader).map((element) =>
//     element.toUpperCase(),
//   );

//   const tabHeader = document.createElement('thead');

//   const tableHeaderRow = document.createElement('tr');
//   for (const thisCol of dataTableHeader) {
//     const tableHeaderCell = document.createElement('th');
//     tableHeaderCell.innerText = String(thisCol);
//     tableHeaderCell.classList.add('tableHeaderRowElement');
//     tableHeaderCell.classList.add(
//       'sticky',
//       'top-0',
//       'z-10',
//       'bg-hiid-table-bg',
//     );
//     tableHeaderCell.setAttribute('id', `${thisCol}`);
//     tableHeaderCell.setAttribute('scope', 'col');
//     tableHeaderCell.setAttribute('tabindex', '0');
//     tableHeaderCell.addEventListener('click', () => {
//       sortTable(inStations, `${thisCol}`, true);
//     });
//     tableHeaderCell.addEventListener('dblclick', () => {
//       sortTable(inStations, `${thisCol}`, false);
//     });
//     tableHeaderRow.classList.add('tableHeaderRow');
//     tableHeaderRow.appendChild(tableHeaderCell);
//   }
//   tabHeader.appendChild(tableHeaderRow);
//   tab.appendChild(tabHeader);

//   // table body
//   const tabBody = document.createElement('tbody');

//   for (const station of inStations) {
//     const row = document.createElement('tr');
//     const stationUUID: string = station['uuid'];
//     row.classList.add('stationRow');
//     row.setAttribute('id', stationUUID);
//     row.setAttribute('tabindex', '0');
//     row.addEventListener('dblclick', () => {
//       fetchStation(station['uuid']);
//     });

//     // cell
//     for (const fact in station) {
//       if (Object.keys(inHeader).includes(fact)) {
//         const thisTd = document.createElement('td');

//         thisTd.innerText = String(station[fact]);
//         thisTd.classList.add('stationRowElement');
//         row.appendChild(thisTd);
//       }
//     }
//     tabBody.appendChild(row);
//   }
//   tab.appendChild(tabBody);
// }

function sortTable(inStations, inKey, inUp = true) {
  console.log(`I would like to sort efter ${inKey}.`);
  console.log(
    inStations[0].num,
    inStations[0]['num'],
    inStations[0][inKey.toLowerCase()],
    Number(inStations[0][inKey.toLowerCase()]),
  );

  let viewList = inStations;

  if (isNaN(Number(inStations[0][inKey.toLowerCase()]))) {
    if (inUp) {
      viewList = inStations.sort((a, b) =>
        String(a[inKey.toLowerCase()]).localeCompare(b[inKey.toLowerCase()]),
      );
    } else {
      viewList = inStations.sort((a, b) =>
        String(b[inKey.toLowerCase()]).localeCompare(a[inKey.toLowerCase()]),
      );
    }
  } else {
    viewList = inStations.sort((a, b) => {
      const aRank =
        a[inKey.toLowerCase()] === undefined
          ? Infinity
          : a[inKey.toLocaleLowerCase()];
      const bRank =
        b[inKey.toLowerCase()] === undefined
          ? Infinity
          : b[inKey.toLocaleLowerCase()];
      if (inUp) {
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

function keywordSearch(inStations, factsToRender) {
  let searchField = document.getElementById('searchTerm');

  let searchTerm = searchField.value.toLowerCase();

  const term = searchTerm.toLowerCase();

  const filteredStations = inStations.filter(
    (station) =>
      (station.num ?? '').toLowerCase().includes(term) ||
      (station.name ?? '').toLowerCase().includes(term) ||
      (station.waterlongname ?? '').toLowerCase().includes(term) ||
      (station.water ?? '').toLowerCase().includes(term),
  );
  renderStations(filteredStations, factsToRender);
}
