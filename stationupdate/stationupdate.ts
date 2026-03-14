import pg from 'pg';

const { Pool } = pg;

const API_URL =
  'https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations.json';

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'gauge_stations',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
});

let isConnected = false;

async function testDbConnection() {
  const res = await pool.query('SELECT NOW()');
  console.log('DB connected:', res.rows[0].now);
}

console.log('test');
testDbConnection();

async function fetchStations() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching stations`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error('Unexpected API response: expected an array');
  }

  return data;
}

async function insertStations(stations) {
  const sql = `
    INSERT INTO gauge_stations (
      uuid,
      number,
      shortname,
      longname,
      km,
      agency,
      longitude,
      latitude,
      water_shortname,
      water_longname,
      geom
    )
    VALUES (
      $1::uuid,
      $2,
      $3,
      $4,
      $5::double precision,
      $6,
      $7::double precision,
      $8::double precision,
      $9,
      $10,
      CASE
        WHEN $7::double precision IS NOT NULL AND $8::double precision IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint($7::double precision, $8::double precision), 4326)
        ELSE NULL
      END
    )
    ON CONFLICT (uuid) DO NOTHING
  `;

  let inserted = 0;

  for (const s of stations) {
    const values = [
      s.uuid ?? null,
      s.number ?? null,
      s.shortname ?? null,
      s.longname ?? null,
      s.km ?? null,
      s.agency ?? null,
      s.longitude ?? null,
      s.latitude ?? null,
      s.water?.shortname ?? null,
      s.water?.longname ?? null,
    ];

    const result = await pool.query(sql, values);
    inserted += result.rowCount;
  }

  return inserted;
}

// async function main() {
//   console.log('Up and running');
//   try {
//     await pool.connect();
//     console.log('Connected to PostgreSQL');

//     const stations = await fetchStations();
//     console.log(`Fetched ${stations.length} stations from API`);

//     const inserted = await insertStations(stations);
//     console.log(`Inserted ${inserted} new stations`);
//     console.log(`Skipped ${stations.length - inserted} existing stations`);
//   } catch (err) {
//     console.error('Import failed:', err);
//     process.exitCode = 1;
//   } finally {
//     console.log('Closing DB connection...');
//     await pool.end();
//     console.log('DB connection closed.');
//   }
// }

// main()
//   .then(() => {
//     console.log('Done.');
//     process.exit(0);
//   })
//   .catch((err) => {
//     console.error(err);
//     process.exit(1);
//   });

async function main() {
  try {
    await pool.connect();
    isConnected = true;
    console.log('Connected to PostgreSQL');

    const stations = await fetchStations();
    console.log(`Fetched ${stations.length} stations from API`);

    const inserted = await insertStations(stations);
    console.log(`Inserted ${inserted} new stations`);
    console.log(`Skipped ${stations.length - inserted} existing stations`);
  } catch (err) {
    console.error('Import failed:', err);
    process.exitCode = 1;
  } finally {
    if (isConnected) {
      console.log('Closing DB');
      try {
        // do not await forever
        await Promise.race([
          pool.end(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('client.end() timed out')), 3000),
          ),
        ]);
        console.log('DB closed');
      } catch (err) {
        console.error('DB close failed or timed out:', err);
      }
    }
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
