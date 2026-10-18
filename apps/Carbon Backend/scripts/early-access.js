// Prints the early-access list as CSV: `npm run early-access > list.csv`
// (on the server, run it where DATA_DIR points at the live data volume).
const { db } = require('../lib/db');
require('../routes/earlyAccess'); // makes sure the table exists

const rows = db.prepare('SELECT email, wants, url, source, created_at, updated_at FROM early_access ORDER BY created_at').all();
const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
// This is a data export (CSV on stdout), not a log.
const out = (line) => process.stdout.write(`${line}
`);
out('email,wants,url,source,created_at,updated_at');
for (const r of rows) out([r.email, r.wants, r.url, r.source, r.created_at, r.updated_at].map(cell).join(','));
console.error(`${rows.length} people on the early-access list.`);
