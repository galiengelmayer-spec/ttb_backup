// Daily DB backup: dumps every table to its own CSV under backups/YYYY-MM-DD/,
// then commits and pushes that folder to GitHub so backups live in version
// control. Meant to be run once a day via a scheduled task (see
// scripts/install-daily-backup-task.ps1).
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ttb = createClient(
  'https://busvgzfykkpwapfayqfy.supabase.co',
  'sb_publishable_mFdJ0jFbo66HCvJbNfLAjw_CV-ppABb'
);

const TABLES = [
  { name: 'clients', order: 'id' },
  { name: 'attendances', order: 'date' },
  { name: 'purchases', order: 'purchased_at' },
  { name: 'client_absences', order: 'from_date' },
  { name: 'requests', order: 'date' },
  { name: 'settings', order: 'key' },
];

// Mirrors lib/fetchAll.js — PostgREST caps unpaginated queries at 1000 rows.
async function fetchAllRows(table, order, pageSize = 1000) {
  let rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await ttb.from(table).select('*').order(order, { ascending: true }).range(from, from + pageSize - 1);
    if (error) {
      console.error(`Fetch error on ${table}:`, error.message);
      break;
    }
    rows = rows.concat(data ?? []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function tableToCsv(rows) {
  if (!rows.length) return '';
  const columns = Object.keys(rows[0]);
  const lines = [columns.join(',')];
  rows.forEach(row => lines.push(columns.map(col => csvEscape(row[col])).join(',')));
  return lines.join('\n');
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const today = new Date().toISOString().slice(0, 10);
const outDir = join(projectRoot, 'backups', today);
mkdirSync(outDir, { recursive: true });

for (const { name, order } of TABLES) {
  const rows = await fetchAllRows(name, order);
  writeFileSync(join(outDir, `${name}.csv`), tableToCsv(rows), 'utf-8');
  console.log(`${name}: ${rows.length} rows`);
}

try {
  execSync(`git add "backups/${today}"`, { cwd: projectRoot, stdio: 'inherit' });
  execSync(`git commit -m "Daily backup ${today}"`, { cwd: projectRoot, stdio: 'inherit' });
  execSync('git push', { cwd: projectRoot, stdio: 'inherit' });
  console.log('Backup committed and pushed.');
} catch (e) {
  console.warn('Backup files were written locally, but git commit/push failed:', e.message);
}
