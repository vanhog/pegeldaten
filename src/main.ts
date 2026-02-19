import { getNestedValue, mapObject } from './helper.ts';

const gaugeStationsURL: string =
  'https://pegelonline.wsv.de/webservices/rest-api/v2/stations.json';

const gaugeStationsURLts: string =
  'https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations.json?includeTimeseries=true&includeCurrentMeasurement=true';

const movieHeader: string[] = [
  'Title',
  'Year',
  'Director',
  'Running Time',
  'Genre',
  'Rate',
];

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

const factsToRender: GaugeStationHeaderMap = {
  num: 'number',
  name: 'longname',
  water: 'water-longname',
  km: 'km',
  lat: 'latitude',
  lon: 'longitude',
};

let currentStation: string = '';

// this is a raw function
function fetchStation(inUUID: string): Object {
  const fetchURL =
    'http://pegelonline.wsv.de/webservices/rest-api/v2/stations/' +
    inUUID +
    '.json?includeTimeseries=true&includeCurrentMeasurement=true';
  //console.log(fetchURL);
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
      let targetCanvas: HTMLElement | null =
        document.getElementById('mapControl');
      if (targetCanvas) {
        targetCanvas.innerHTML = '';
      }

      for (let k of Object.keys(data)) {
        console.log(k);
        console.log((document.createElement('p').innerText = `${k}: data[k]`));
        const el_p = document.createElement('p');
        el_p.innerText = `${k}: ${data[k]}`;

        targetCanvas?.appendChild(el_p);
      }
      if (data['timeseries']) {
        const ts = data['timeseries'];
        const tsp = ts.filter((a) => (a.shortname = 'W'));
        console.log('tsp', tsp[0].currentMeasurement.value);
        const el_pp = document.createElement('p');
        el_pp.innerText = tsp;
        targetCanvas?.appendChild(el_pp);
      }
      console.log(data);
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
  tab.classList.add('max-w-7xl');
  tab.classList.add('overflow-hidden');
  tab.classList.add('bg-hiid-table-bg');
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
    tableHeaderCell.classList.add('movieHeaderRow');
    tableHeaderRow.appendChild(tableHeaderCell);
  }
  tab.appendChild(tableHeaderRow);

  for (const station of inStations) {
    const row = document.createElement('tr');
    const stationUUID: string = station['uuid'];
    row.classList.add('movieRow');
    row.setAttribute('id', stationUUID);
    row.addEventListener('dblclick', () => {
      fetchStation(station['uuid']);
    });

    // cell
    for (const fact in station) {
      if (Object.keys(inHeader).includes(fact)) {
        const thisTd = document.createElement('td');

        thisTd.innerText = String(station[fact]);
        thisTd.classList.add('movieRowElement');
        row.appendChild(thisTd);
      }
    }
    tab?.appendChild(row);
  }
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
  });

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

document.getElementById('searchButton')?.addEventListener('click', () => {
  let searchTerm: string = (
    document.getElementById('searchTerm') as HTMLInputElement
  ).value;
  const results = movies.filter((movie) =>
    movie
      .slice(0, 4)
      .some((field) =>
        String(field)
          .toLocaleLowerCase()
          .includes(searchTerm.toLocaleLowerCase()),
      ),
  );
  populateList(results);
});
