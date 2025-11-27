import 'dotenv/config';
import { sendEmailSummary } from '../email_notifier.js';
import { Job } from '../types.js';
import { logger } from '../logger.js';

async function main() {
    logger.info('Starting email test...');

    const mockJobs: Job[] = [
        {
            id: 'https://example.com/job1',
            title: 'Test Software Engineer Intern',
            company: 'Tech Corp',
            location: 'Remote',
            date: '2025-11-26',
            salary: '$50/hr',
            workModel: 'Remote',
            source: 'InternList',
            link: 'https://example.com/job1'
        },
        {
            id: 'https://example.com/job2',
            title: 'Test Backend Intern',
            company: 'Startup Inc',
            location: 'New York, NY',
            date: '2025-11-26',
            salary: '$40/hr',
            workModel: 'Hybrid',
            source: 'InternList',
            link: 'https://example.com/job2'
        }
    ];

    await sendEmailSummary(mockJobs);
    logger.info('Email test completed.');
}

main();
