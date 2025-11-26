import Database from 'better-sqlite3';
const db = new Database('jobs.db');
// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    title TEXT,
    link TEXT
  )
`);
export function hasJob(id) {
    const stmt = db.prepare('SELECT 1 FROM jobs WHERE id = ?');
    return stmt.get(id) !== undefined;
}
export function saveJob(job) {
    const stmt = db.prepare('INSERT INTO jobs (id, title, link) VALUES (?, ?, ?)');
    stmt.run(job.id, job.title, job.link);
}
