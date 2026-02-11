import { movies } from "../assets/movies.ts";

const gaugeStationsURL: string =
  "https://pegelonline.wsv.de/webservices/rest-api/v2/stations.json";

const movieHeader: string[] = [
  "Title",
  "Year",
  "Director",
  "Running Time",
  "Genre",
  "Rate",
];

type GaugeStationHeaderKeys =
  | "numberid"
  | "longname"
  | "water"
  | "km"
  | "lat"
  | "lon"
  | "uuid"
  | "agency";

type GaugeStationHeaderMap = Record<GaugeStationHeaderKeys, string>;

const gaugeStationHeaderMap: GaugeStationHeaderMap = {
  numberid: "number",
  longname: "longname",
  water: "water.longname",
  km: "km",
  lat: "latitude",
  lon: "longitude",
  uuid: "uuid",
  agency: "agency",
} as const;

function getNestedValue(obj: Object, path: String) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

function mapObject(source: Object, mapper: Object) {
  const target = {};

  Object.entries(mapper).forEach(([targetKey, sourcePath]) => {
    target[targetKey] = getNestedValue(source, sourcePath);
  });

  return target;
}

// first of all: get the stations

fetch(gaugeStationsURL)
  .then((response) => {
    if (!response.ok) return console.log("Gauge stations could not be loaded!");

    return response.json();
  })
  .then((data) => {
    const thisRow = data[9];
    console.log(mapObject(thisRow, gaugeStationHeaderMap));
    const mappedStations = data.map((s) => mapObject(s, gaugeStationHeaderMap));
    console.log(mappedStations);
  });

const moviesc = movies;

populateList(moviesc);

function populateList(
  inArr: [string, string, string, string, string[], string][],
): void {
  const sect = document.getElementById("movieList");

  // if there's already a table, remove it
  const checkTable = document.getElementById("movieTable");
  if (checkTable) {
    sect?.removeChild(checkTable);
  }

  // table
  const tab = document.createElement("table");
  tab.classList.add("w-full");
  tab.id = "movieTable";
  sect?.appendChild(tab);

  // table header
  const tableHeaderRow = document.createElement("tr");
  for (const thisCol of movieHeader) {
    const tableHeaderCell = document.createElement("th");
    tableHeaderCell.innerText = String(thisCol);
    tableHeaderCell.classList.add("movieHeaderRow");
    tableHeaderRow.appendChild(tableHeaderCell);
  }
  tab.appendChild(tableHeaderRow);

  // row
  for (const film of inArr) {
    const row = document.createElement("tr");
    // cell
    for (const fact of film) {
      const thisTd = document.createElement("td");
      thisTd.innerText = String(fact);
      thisTd.classList.add("movieRow");
      row.appendChild(thisTd);
    }
    tab?.appendChild(row);
  }
}

document.getElementById("up")?.addEventListener("input", () => {
  //console.log('up checked', movies[0][1]);
  let viewList: [string, string, string, string, string[], string][] =
    movies.sort((a, b) => Number(a[1]) - Number(b[1]));
  populateList(viewList);
});

document.getElementById("down")?.addEventListener("input", () => {
  let viewList: [string, string, string, string, string[], string][] =
    movies.sort((a, b) => Number(b[1]) - Number(a[1]));
  populateList(viewList);
});

document.getElementById("rate")?.addEventListener("input", () => {
  let viewList: [string, string, string, string, string[], string][] =
    movies.sort((a, b) => Number(b[5]) - Number(a[5]));
  populateList(viewList);
});

document.getElementById("searchButton")?.addEventListener("click", () => {
  let searchTerm: string = (
    document.getElementById("searchTerm") as HTMLInputElement
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
