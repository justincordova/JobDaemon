import puppeteer from 'puppeteer';
import { Job } from './types.js';
import { logger } from './logger.js';

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
    page.setDefaultNavigationTimeout(60000);

    // Optimize: Block images, fonts, styles
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto('https://www.intern-list.com/?k=swe', { 
      waitUntil: 'domcontentloaded',
    });

    const iframeSelector = 'iframe[src*="airtable.com/embed"]';
    await page.waitForSelector(iframeSelector);
    const frameElement = await page.$(iframeSelector);
    const frame = await frameElement?.contentFrame();

    if (!frame) {
      logger.error('Could not retrieve iframe from InternList.');
      return [];
    }

    // Wait for content to load inside the iframe
    await frame.waitForSelector('div.dataLeftPane');

    // Click inside the iframe to ensure focus
    await frame.click('div.dataLeftPane');

    const extractedJobs = await frame.evaluate(async () => {
        const jobs: any[] = [];
        const seenIds = new Set<string>();
        
        const scrollableElement = document.querySelector('.antiscroll-inner');
        if (!scrollableElement) {
            console.log('Scrollable element .antiscroll-inner not found');
            return [];
        }

        let previousScrollTop = -1;
        let currentScrollTop = scrollableElement.scrollTop;
        let attempts = 0;
        const maxAttempts = 20; // Allow more attempts for PageDown

        // We will use a loop that scrapes, then we return control to Node to press PageDown, 
        // but since we are inside evaluate, we can't press keys.
        // So we need to restructure: 
        // 1. Loop in Node.js
        // 2. Inside loop: scrape visible, then press PageDown
        
        return []; // Signal to Node to handle the loop
    });

    // New approach: Loop in Node.js
    const allJobs: Job[] = [];
    const seenIds = new Set<string>();
    let noNewJobsAttempts = 0;

    for (let i = 0; i < 30; i++) { // Max 30 pages
        // Scrape visible jobs
        const visibleJobs = await frame.evaluate(() => {
            const jobs: any[] = [];
            const leftPaneRows = document.querySelectorAll('div.dataLeftPane div.dataRow.leftPane');
            const rightPaneRows = document.querySelectorAll('div.dataRightPane div.dataRow.rightPane');
            const rightRowsArray = Array.from(rightPaneRows);

            leftPaneRows.forEach((leftRow) => {
                const rowId = leftRow.getAttribute('data-rowid');
                if (!rowId) return;

                const rightRow = rightRowsArray.find(r => r.getAttribute('data-rowid') === rowId);

                if (rightRow) {
                    const titleElement = leftRow.querySelector('div[data-columnid="fldiDLYrIz09i4roI"]');
                    const companyElement = rightRow.querySelector('div[data-columnid="fldpdL6kzApwtHAAq"]');
                    const locationElement = rightRow.querySelector('div[data-columnid="fldmj1wFCKqkrEtE8"]');
                    const dateElement = rightRow.querySelector('div[data-columnid="fldgimpUNM7z3F3LZ"]');
                    const salaryElement = rightRow.querySelector('div[data-columnid="fldrSZk70CyLKVajj"]');
                    const workModelElement = rightRow.querySelector('div[data-columnid="fldNYDIFh6DbqMuQ3"]');
                    const linkElement = rightRow.querySelector('div[data-columnid="fldyiaxKyYILOF7wH"] a');

                    const title = titleElement?.textContent?.trim() || '';
                    const company = companyElement?.textContent?.trim() || '';
                    const location = locationElement?.textContent?.trim() || '';
                    const date = dateElement?.textContent?.trim() || '';
                    const salary = salaryElement?.textContent?.trim() || '';
                    const workModel = workModelElement?.textContent?.trim() || '';
                    let link = linkElement?.getAttribute('href') || '';

                    // Clean link
                    if (link) {
                        try {
                            const urlObj = new URL(link);
                            urlObj.searchParams.delete('utm_campaign');
                            urlObj.searchParams.delete('utm_source');
                            link = urlObj.toString();
                        } catch (e) {
                            // Keep original link if parsing fails
                        }
                    }

                    if (company && title && link) {
                        jobs.push({
                            id: link,
                            title,
                            company,
                            location,
                            date,
                            salary,
                            workModel,
                            source: 'InternList',
                            link
                        });
                    }
                }
            });
            return jobs;
        });

        let newJobsFound = 0;
        for (const job of visibleJobs) {
            if (!seenIds.has(job.id)) {
                seenIds.add(job.id);
                allJobs.push(job);
                newJobsFound++;
            }
        }

        // Check if we are scrolling
        await frame.evaluate(() => {
            const el = document.querySelector('.antiscroll-inner');
            return el ? el.scrollTop : -1;
        });

        if (newJobsFound === 0) {
            noNewJobsAttempts++;
            if (noNewJobsAttempts >= 5) {
                break; 
            }
        } else {
            noNewJobsAttempts = 0;
        }

        // Scroll down using evaluate
        await frame.evaluate(() => {
            const el = document.querySelector('.antiscroll-inner');
            if (el) {
                el.scrollBy(0, 500); // Scroll by 500px
            }
        });
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for load
    }



    for (const job of allJobs) {
        if (isJobFresh(job.date)) {
            jobs.push(job);
        }
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
    page.setDefaultNavigationTimeout(60000);

    // Optimize: Block images, fonts, styles
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

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