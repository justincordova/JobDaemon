import Database from 'better-sqlite3';
import { Job } from './types.js';

const db = new Database('jobs.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    title TEXT,
    company TEXT,
    location TEXT,
    date TEXT,
    salary TEXT,
    workModel TEXT,
    source TEXT,
    link TEXT
  )
`);

/**
 * Checks if a job with the given ID already exists in the database.
 * @param id The unique identifier for the job.
 * @returns True if the job exists, false otherwise.
 */
export function hasJob(id: string): boolean {
  const stmt = db.prepare('SELECT 1 FROM jobs WHERE id = ?');
  return stmt.get(id) !== undefined;
}

/**
 * Saves a job to the database.
 * Uses INSERT OR IGNORE to prevent duplicate entries.
 * @param job The job object to save.
 */
export function saveJob(job: Job): void {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO jobs (id, title, company, location, date, salary, workModel, source, link)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(job.id, job.title, job.company, job.location, job.date, job.salary, job.workModel, job.source, job.link);
}
