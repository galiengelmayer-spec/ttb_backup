import { Platform } from 'react-native';
import { supabase } from './supabase';
import { fetchAllRows } from './fetchAll';
import { todayString } from './dates';

// Every table worth restoring from, with a stable sort column so
// fetchAllRows' range-based pagination can't skip or duplicate rows.
const TABLES = [
  { name: 'clients', order: 'id' },
  { name: 'attendances', order: 'date' },
  { name: 'purchases', order: 'purchased_at' },
  { name: 'client_absences', order: 'from_date' },
  { name: 'requests', order: 'date' },
  { name: 'settings', order: 'key' },
];

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function tableToCsv(rows) {
  if (!rows.length) return '(no rows)';
  const columns = Object.keys(rows[0]);
  const lines = [columns.join(',')];
  rows.forEach(row => lines.push(columns.map(col => csvEscape(row[col])).join(',')));
  return lines.join('\n');
}

// One combined CSV, sectioned by table, for the kebab menu's "download
// backup" button — a single file is the simplest thing to hand off from
// there. The daily automated backup (scripts/backup-daily.mjs) writes each
// table to its own file instead, which restores more cleanly.
export async function buildBackupCsv() {
  const sections = [];
  for (const { name, order } of TABLES) {
    const rows = await fetchAllRows(() => supabase.from(name).select('*').order(order, { ascending: true }));
    sections.push(`# ${name}`, tableToCsv(rows), '');
  }
  return sections.join('\n');
}

export async function downloadBackupCsv() {
  const csv = await buildBackupCsv();
  const filename = `ttb-backup-${todayString()}.csv`;

  if (Platform.OS === 'web') {
    // Excel doesn't sniff UTF-8 without a BOM — without it, Hebrew columns
    // render as mojibake since Excel falls back to assuming Windows-1252.
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // Native has no file-system/share library in this project yet — fall back
  // to the OS share sheet so the data is still reachable on a phone.
  const { Share } = await import('react-native');
  await Share.share({ title: filename, message: csv });
}
