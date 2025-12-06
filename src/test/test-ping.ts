import 'dotenv/config';
import { notify, sendPing } from '../notifier.js';
import { Job } from '../types.js';
import { logger } from '../logger.js';

/**
 * @deprecated This test is for the obsolete Discord notifier.
 * Use test-email.ts instead for email notification testing.
 */
async function main() {
    logger.info('Starting ping + notification test...');

    // 1. Send Ping
    logger.info('Sending ping...');
    await sendPing();

    // 2. Send Notification (should NOT have @everyone)
    const mockJob: Job = {
        id: 'https://example.com/job-ping-test',
        title: 'Ping Test Engineer',
        company: 'Ping Corp',
        location: 'Remote',
        date: '2025-11-26',
        salary: '$100/hr',
        workModel: 'Remote',
        source: 'InternList',
        link: 'https://example.com/job-ping-test'
    };

    logger.info('Sending job notification...');
    await notify(mockJob, true);

    logger.info('Test completed. Check Discord for 1 ping and 1 message.');
}

main();
