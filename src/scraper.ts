import puppeteer from 'puppeteer';
import { logger } from './logger.js';
import { Job } from './types.js';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * Checks if a job date string matches today's date.
 * @param dateStr The date string to check (YYYY-MM-DD).
 * @returns True if the date matches today, false otherwise.
 */
function isJobFresh(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

  // Check for InternList format (YYYY-MM-DD)
  if (dateStr === todayStr) {
    return true;
  }

  // Check for GitHub format (e.g., "0d", "14h", "now")
  // We want to allow "0d", anything with "h" (hours), "m" (minutes), or "now"
  // const lowerDate = dateStr.toLowerCase();
  // if (lowerDate.includes('0d') || 
  //     lowerDate.includes('h') || 
  //     lowerDate.includes('m') || 
  //     lowerDate.includes('now') ||
  //     lowerDate.includes('today')) {
  //   return true;
  // }

  return false;
}

/**
 * Scrapes jobs from InternList by downloading and parsing the CSV export.
 * 1. Navigates to the InternList page.
 * 2. Clicks the "Download CSV" button.
 * 3. Downloads the file to .cache/downloads.
 * 4. Parses the CSV, cleaning data and filtering for valid jobs.
 * @returns A list of Job objects found in the CSV.
 */
export async function scrapeInternList(): Promise<Job[]> {
  const jobs: Job[] = [];
  let browser;
  try {
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    };

    logger.info(`Launching puppeteer with options: ${JSON.stringify(launchOptions)}`);
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Set global timeout
    page.setDefaultNavigationTimeout(600000); // 10 minutes

    await page.goto('https://www.intern-list.com/?k=swe', { 
      waitUntil: 'domcontentloaded',
    });

    const iframeSelector = 'iframe[src*="airtable.com/embed"]';
    await page.waitForSelector(iframeSelector);
    const frameElement = await page.$(iframeSelector);
    const frame = await frameElement?.contentFrame();
    
    if (frame) {
      frame.on('console', (msg: any) => logger.info(`PAGE LOG: ${msg.text()}`));
    }

    if (!frame) {
      logger.error('Could not retrieve iframe from InternList.');
      return [];
    }

    // Configure download behavior
    const downloadPath = path.resolve(process.cwd(), '.cache', 'downloads');
    if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
    }
    
    // @ts-ignore - setDownloadBehavior is not in the type definition but works
    const client = await page.target().createCDPSession();
    await client.send('Browser.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath,
        eventsEnabled: true // Optional, but good for debugging
    });

    // Find and click the Download CSV button
    logger.info('Looking for Download CSV button...');
    const downloadButtonXPath = '//div[text()="Download CSV"]';
    await frame.waitForSelector(`xpath/${downloadButtonXPath}`);
    const downloadButton = await frame.$(`xpath/${downloadButtonXPath}`);
    
    if (downloadButton) {
        logger.info('Clicking Download CSV button...');
        
        // Try clicking with evaluate first
        await frame.evaluate((el) => (el as HTMLElement).click(), downloadButton);
        
        // Wait for download to start
        logger.info('Waiting for download...');
        let downloadedFile: string | null = null;
        
        // Retry click if no file appears after 5 seconds
        for (let attempt = 0; attempt < 3; attempt++) {
            for (let i = 0; i < 10; i++) { // Wait 10 seconds per attempt
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (fs.existsSync(downloadPath)) {
                    const files = fs.readdirSync(downloadPath);
                    const csvFile = files.find(f => f.endsWith('.csv') && !f.endsWith('.crdownload'));
                    if (csvFile) {
                        downloadedFile = path.join(downloadPath, csvFile);
                        break;
                    }
                }
            }
            if (downloadedFile) break;
            
            logger.warn(`Download not started after attempt ${attempt + 1}. Retrying click...`);
            await downloadButton.click(); // Fallback to standard click
        }

        if (downloadedFile) {
            logger.info(`File downloaded: ${downloadedFile}`);
            
            // Read and parse CSV
            let fileContent = fs.readFileSync(downloadedFile, 'utf-8');
            // Remove BOM if present
            fileContent = fileContent.replace(/^\uFEFF/, '');
            
            const records = parse(fileContent, {
                columns: true,
                skip_empty_lines: true
            });

            logger.info(`Parsed ${records.length} records from CSV.`);

            for (const record of records as any[]) {
                // Map CSV fields to Job object
                // CSV Format: Position Title, Date, Apply, Work Model, Location, Company, ...
                
                let dateStr = new Date().toISOString().split('T')[0]; // Default to today
                if (record['Date']) {
                    const rawDate = record['Date'];
                    if (rawDate.includes('/')) {
                        try {
                            const [month, day, year] = rawDate.split('/');
                            // Assuming year is 2 digits (e.g. 25), add 2000
                            const fullYear = year.length === 2 ? '20' + year : year;
                            dateStr = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                        } catch (e) {
                            logger.warn(`Failed to parse date: ${rawDate}`);
                        }
                    } else if (rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        dateStr = rawDate;
                    } else {
                         logger.warn(`Unknown date format: ${rawDate}`);
                    }
                }

                const title = record['Position Title'] || record['Position'] || 'Unknown Title';
                const company = record['Company'] || 'Unknown Company';
                
                if (title === 'Unknown Title') {
                     logger.warn(`Missing title for record: ${JSON.stringify(record)}`);
                }

                // Clean link: remove any text after the first whitespace
                let link = record['Apply'] || '';
                if (link) {
                    link = link.split(/\s+/)[0];
                }

                const job: Job = {
                    id: link || (company + title), 
                    title: title,
                    company: company,
                    location: record['Location'] || 'Unknown Location',
                    link: link,
                    date: dateStr,
                    salary: record['Salary'] || 'N/A',
                    workModel: record['Work Model'] || 'N/A',
                    source: 'InternList'
                };
                
                // Add to jobs list if valid and fresh
                if (job.title !== 'Unknown Title' && job.company !== 'Unknown Company') {
                    // Filter by date (only today's jobs)
                    const todayStr = new Date().toISOString().split('T')[0];
                    if (job.date === todayStr) {
                        jobs.push(job);
                    }
                }
            }

            // Cleanup
            fs.unlinkSync(downloadedFile);
            logger.info('Cleaned up downloaded file.');
        } else {
            logger.error('Download timed out or file not found.');
        }
    } else {
        logger.error('Download CSV button not found.');
    }

  } catch (error) {
    logger.error('Error scraping intern-list.com:', error);
  } finally {
      if (browser) await browser.close();
  }
  return jobs.reverse();
}

async function scrapeGitHubRepo(url: string): Promise<Job[]> {
  let browser;
  try {
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    };

    logger.info(`Launching puppeteer with options: ${JSON.stringify(launchOptions)}`);
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Set global timeout
    page.setDefaultNavigationTimeout(600000); // 10 minutes

    // Optimize: Block images, fonts, styles - DISABLED
    // await page.setRequestInterception(true);
    // page.on('request', (req) => {
    //   if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
    //     req.abort();
    //   } else {
    //     req.continue();
    //   }
    // });

    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
    });

    const extractedJobs = await page.evaluate(() => {
        const jobs: any[] = [];
        const rows = document.querySelectorAll('table tbody tr');
        
        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length >= 3) {
                const linkElement = row.querySelector('a[href^="http"]');
                const link = linkElement?.getAttribute('href');

                if (link) {
                    const company = cols[0]?.textContent?.trim() || '';
                    const title = cols[1]?.textContent?.trim() || '';
                    const location = cols[2]?.textContent?.trim() || '';
                    const date = cols[4]?.textContent?.trim() || '';

                    jobs.push({
                        id: link,
                        title,
                        company,
                        location,
                        date,
                        source: 'GitHub',
                        link
                    });
                }
            }
        });
        return jobs;
    });

    const jobs: Job[] = [];
    for (const job of extractedJobs) {
        if (isJobFresh(job.date)) {
            jobs.push(job);
        }
    }
    return jobs;

  } catch (error) {
    logger.error(`Error scraping GitHub repo ${url}:`, error);
    return [];
  } finally {
      if (browser) await browser.close();
  }
}

/**
 * Main scraping function that aggregates jobs from all sources.
 * Currently only scrapes InternList.
 * @returns A combined list of unique Job objects.
 */
export async function scrapeJobs(): Promise<Job[]> {
  const jobs: Job[] = [];

  const internListJobs = await scrapeInternList();
  jobs.push(...internListJobs);

  /*
  const githubRepo1 = await scrapeGitHubRepo('https://github.com/SimplifyJobs/Summer2026-Internships');
  jobs.push(...githubRepo1);

  const githubRepo2 = await scrapeGitHubRepo('https://github.com/vanshb03/Summer2026-Internships');
  jobs.push(...githubRepo2);
  */

  // Deduplicate by ID (link)
  const uniqueJobs = new Map<string, Job>();
  for (const job of jobs) {
      if (job.link) {
        uniqueJobs.set(job.link, job);
      }
  }

  return Array.from(uniqueJobs.values());
}