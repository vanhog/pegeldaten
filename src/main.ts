import { movies } from '../assets/movies.ts';

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

console.log(
  Object.keys(gaugeStationHeaderMap).map((element) => element.toUpperCase()),
);

function getNestedValue(obj: Object, path: String) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function mapObject(source: Object, mapper: Object) {
  const target = {};

  Object.entries(mapper).forEach(([targetKey, sourcePath]) => {
    target[targetKey] = getNestedValue(source, sourcePath);
  });

  return target;
}

function renderStations(inStations, inHeader): void {
  // for (const element of inStations) {
  //   console.log(element.name);
  // }
  // console.log(inStations[1].name);

  const headerKeys = Object.keys(inHeader);

  const sect = document.getElementById('movieList');

  // if there's already a table, remove it
  const checkTable = document.getElementById('dataTable');
  if (checkTable) {
    sect?.removeChild(checkTable);
  }

  // table
  const tab = document.createElement('table');
  tab.classList.add('w-full');
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
    //console.log(station[headerKeys[0]]);
    console.log(station.length);
    // cell
    for (let i = 0; i < headerKeys.length; i++) {
      const thisTd = document.createElement('td');
      if (headerKeys[i] === 'uuid') {
        thisTd.innerHTML = `<a href="https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations/${station[headerKeys[i]]}/W/currentmeasurement.json" >${station[headerKeys[i]]}</a>`;
      } else {
        thisTd.innerText = String(station[headerKeys[i]]);
      }
      thisTd.classList.add('movieRow');
      row.appendChild(thisTd);
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
    const thisRow = data[9];
    console.log(mapObject(thisRow, gaugeStationHeaderMap));
    const mappedStations = data.map((s) => mapObject(s, gaugeStationHeaderMap));
    //console.log(mappedStations);
    renderStations(mappedStations, gaugeStationHeaderMap);
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

  renderStations(viewList, gaugeStationHeaderMap);
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
