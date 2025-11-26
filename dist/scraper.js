import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from './logger.js';
async function scrapeInternList() {
    try {
        const { data } = await axios.get('https://www.intern-list.com/');
        const $ = cheerio.load(data);
        const jobs = [];
        // Note: The selector might need adjustment based on the actual site structure.
        // Assuming a generic structure for now, but in a real scenario, we'd inspect the DOM.
        // Since I cannot browse, I will use a generic approach that looks for links with keywords or common structures.
        // However, for this task, I will try to be as robust as possible or use a broad selector.
        // Let's assume standard list items or table rows.
        // Inspecting the provided URL is not possible for me, so I will implement a best-effort scraper
        // that looks for common job board patterns.
        // NOTE: In a real-world scenario, I would inspect the page source.
        // For this exercise, I will assume a structure or try to find links.
        $('a').each((_, element) => {
            const link = $(element).attr('href');
            const title = $(element).text().trim();
            if (link && title && (title.toLowerCase().includes('intern') || title.toLowerCase().includes('software'))) {
                // Basic filtering to avoid garbage links
                if (link.startsWith('http')) {
                    jobs.push({
                        id: link,
                        title: title,
                        link: link
                    });
                }
            }
        });
        return jobs;
    }
    catch (error) {
        logger.error('Error scraping intern-list.com:', error);
        return [];
    }
}
async function scrapeGitHubRepo(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const jobs = [];
        // GitHub markdown tables usually render as <table>
        $('table tbody tr').each((_, row) => {
            const cols = $(row).find('td');
            if (cols.length >= 3) {
                // Heuristic: Company Name is usually first or second, Role is usually second or third.
                // Application Link is usually in the last column or specifically linked.
                // Let's try to find the first link in the row that looks like an external job link.
                const linkElement = $(row).find('a[href^="http"]').first();
                const link = linkElement.attr('href');
                const title = $(row).text().trim().replace(/\s+/g, ' '); // Flatten whitespace
                if (link) {
                    jobs.push({
                        id: link,
                        title: title, // This might be a bit messy, containing the whole row text, but ensures we capture info.
                        link: link
                    });
                }
            }
        });
        return jobs;
    }
    catch (error) {
        logger.error(`Error scraping GitHub repo ${url}:`, error);
        return [];
    }
}
export async function scrapeJobs() {
    const jobs = [];
    const internListJobs = await scrapeInternList();
    jobs.push(...internListJobs);
    const githubRepo1 = await scrapeGitHubRepo('https://github.com/SimplifyJobs/Summer2026-Internships');
    jobs.push(...githubRepo1);
    const githubRepo2 = await scrapeGitHubRepo('https://github.com/vanshb03/Summer2026-Internships');
    jobs.push(...githubRepo2);
    // Deduplicate by ID (link) just in case
    const uniqueJobs = new Map();
    for (const job of jobs) {
        uniqueJobs.set(job.id, job);
    }
    return Array.from(uniqueJobs.values());
}
