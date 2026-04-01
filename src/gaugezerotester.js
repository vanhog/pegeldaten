import { Temporal } from '@js-temporal/polyfill';

//settings
const gaugeStationsURL =
  'https://pegelonline.wsv.de/webservices/rest-api/v2/stations.json';

const timeZoneClassifier = 'Europe/Copenhagen';
const timeLocaleClassifier = 'de-DE';

console.log('gaugezerotester');

function formatDateThenTime(zdt, locale = timeLocaleClassifier) {
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  const timeFmt = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });

  // Intl.DateTimeFormat works with epoch milliseconds
  const ms = zdt.epochMilliseconds;

  return `${timeFmt.format(ms)} - ${dateFmt.format(ms)}`;
}

function renderDrawer02(data) {
  let ts = [];
  let tStamp = '';

  //console.log(data);
  //remove obsolete values and units
  document.getElementById('current-measurement-value').innerText = '---';
  document.getElementById('current-measurement-unit').innerText = '';
  document.getElementById('cmv-timestamp').innerText = 'Time/Date';

  if (data['timeseries']) {
    let searchTerm = 'WASSERSTAND'; //(searchTermWasserstand );

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

function fetcheGauge(inUuid) {
  const restStations =
    'http://pegelonline.wsv.de/webservices/rest-api/v2/stations/';
  const aisleTSM =
    '.json?includeTimeseries=true&includeCurrentMeasurement=true';
  let fetchURL = restStations + inUuid + aisleTSM;
  //console.log(fetchURL);
  fetch(fetchURL)
    .then((response) => {
      if (!response.ok)
        return console.log('Gauge station could not be loaded!');

      return response.json();
    })
    .then((response) => {
      for (let ts of response.timeseries) {
        let gz = {};
        if (ts.gaugeZero) {
          gz = ts.gaugeZero;
        }
        console.log(
          Number(ts.currentMeasurement.value) / 100 + Number(gz.value),
          ts.currentMeasurement.value,
          ts.unit,
          gz.unit,
          gz.value,
          response.longname,
        );
        renderDrawer02(response);
      }
      //console.log(response.timeseries[0].gaugeZero);
    });
}

// first of all: get the stations
let i = 0;
fetch(gaugeStationsURL)
  .then((response) => {
    if (!response.ok) return console.log('Gauge stations could not be loaded!');

    return response.json();
  })
  .then((data) => {
    let d_area = document.getElementById('data');
    for (let row of data) {
      i += 1;
      //console.log(row);
      fetcheGauge(row.uuid);
      let d_row = document.createElement('p');
      let d_text =
        String(i) +
        ' | ' +
        row.uuid +
        ' | ' +
        row.longname +
        ' | ' +
        row.water.longname;
      d_row.innerText = d_text;
      // d_area.appendChild(d_row);
    }
  });

// //
// function fetchStation(inUUID: string): Object {
//   const fetchURL = restStations + inUUID + aisleTSM;

//   // if there's station selected, remove selection style
//   if (currentStation) {
//     document
//       .getElementById(currentStation)
//       ?.classList.remove('stationRowSelected');
//   }

//   document.getElementById(inUUID)?.classList.add('stationRowSelected');
//   currentStation = inUUID;
//   fetch(fetchURL)
//     .then((response) => {
//       if (!response.ok)
//         return console.log('Gauge station could not be loaded!');

//       return response.json();
//     })
//     .then((data) => {
//       renderDrawer01(data);
//       renderDrawer02(data);
//     });
// }
