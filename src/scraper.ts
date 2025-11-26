import axios from 'axios';
import * as cheerio from 'cheerio';
import { Job } from './types.js';
import { logger } from './logger.js';

async function scrapeInternList(): Promise<Job[]> {
  try {
    const { data } = await axios.get('https://www.intern-list.com/');
    const $ = cheerio.load(data);
    const jobs: Job[] = [];

    // The data is in a script tag as a JSON object.
    const scriptTag = $('script[data-airtable-renderer-id="shrOTtndhc6HSgnYb"]').html();
    if (scriptTag) {
        const jsonData = JSON.parse(scriptTag);
        const tableData = jsonData.tableData;
        if(tableData && tableData.rows) {
            for(const row of tableData.rows) {
                const cells = row.cells;
                const company = cells[0]?.text;
                const title = cells[1]?.text;
                const location = cells[2]?.text;
                const date = cells[3]?.text;
                const salary = cells[4]?.text;
                const link = cells[5]?.url;
                if (company && title && link) {
                    jobs.push({
                        id: link,
                        title,
                        company,
                        location,
                        date,
                        salary,
                        link,
                    });
                }
            }
        }
    }
    return jobs;
  } catch (error) {
    logger.error('Error scraping intern-list.com:', error);
    return [];
  }
}

async function scrapeGitHubRepo(url: string): Promise<Job[]> {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const jobs: Job[] = [];

    $('table tbody tr').each((_, row) => {
      const cols = $(row).find('td');
      if (cols.length >= 3) {
        const linkElement = $(row).find('a[href^="http"]').first();
        const link = linkElement.attr('href');
        
        if (link) {
          const company = $(cols[0]).text().trim();
          const title = $(cols[1]).text().trim();
          const location = $(cols[2]).text().trim();
          const date = $(cols[4]).text().trim();


           jobs.push({
            id: link,
            title: title,
            company: company,
            location: location,
            date: date,
            link: link
          });
        }
      }
    });

    return jobs;
  } catch (error) {
    logger.error(`Error scraping GitHub repo ${url}:`, error);
    return [];
  }
}

export async function scrapeJobs(): Promise<Job[]> {
  const jobs: Job[] = [];

  const internListJobs = await scrapeInternList();
  jobs.push(...internListJobs);

  const githubRepo1 = await scrapeGitHubRepo('https://github.com/SimplifyJobs/Summer2026-Internships');
  jobs.push(...githubRepo1);

  const githubRepo2 = await scrapeGitHubRepo('https://github.com/vanshb03/Summer2026-Internships');
  jobs.push(...githubRepo2);

  // Deduplicate by ID (link)
  const uniqueJobs = new Map<string, Job>();
  for (const job of jobs) {
      if (job.link) {
        uniqueJobs.set(job.link, job);
      }
  }

  return Array.from(uniqueJobs.values());
}