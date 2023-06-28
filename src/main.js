import { Actor, log } from 'apify';
import { PuppeteerCrawler } from 'crawlee';
import GifEncoder from 'gif-encoder';

import {
    record,
    scrollDownProcess,
    getGifBuffer,
    compressGif,
    saveGif,
    slowDownAnimationsFn,
} from './helper.js';

const wait = async (time) => {
    log.info(`Wait for ${time} ms`);
    return new Promise((resolve) => setTimeout(resolve, time));
};

Actor.main(async () => {
    const {
        url,
        viewportHeight = 768,
        viewportWidth = 1366,
        slowDownAnimations,
        waitToLoadPage,
        cookieWindowSelector,
        frameRate,
        recordingTimeBeforeAction,
        scrollDown = true,
        scrollPercentage,
        clickSelector,
        recordingTimeAfterClick,
        lossyCompression,
        loslessCompression,
        proxyOptions,
    } = await Actor.getInput();

    const proxyConfiguration = await Actor.createProxyConfiguration(proxyOptions);

    let gifUrl;
    let errorMessage;

    // We do just single request but wrap in crawler for error retries
    const crawler = new PuppeteerCrawler({
        proxyConfiguration,
        requestHandlerTimeoutSecs: 300,
        navigationTimeoutSecs: 90,
        preNavigationHooks: [
            async ({ page }, gotoOptions) => {
                await page.setViewport({
                    width: viewportWidth,
                    height: viewportHeight,
                });

                if (slowDownAnimations) {
                    slowDownAnimationsFn(page);
                }

                gotoOptions.waitUntil = 'networkidle2';
            },
        ],
        requestHandler: async ({ page }) => {
            await Actor.setStatusMessage('Page loaded, starting gif recording');
            log.info(`Setting page viewport to ${viewportWidth}x${viewportHeight}`);

            if (waitToLoadPage) {
                await wait(waitToLoadPage);
            }

            // remove cookie window if specified
            if (cookieWindowSelector) {
                try {
                    await page.waitForSelector(cookieWindowSelector);

                    log.info('Removing cookie pop-up window');
                    await page.$eval(cookieWindowSelector, (el) => el.remove());
                } catch (err) {
                    log.warning('Could not remove cookie banner. Selector for cookie pop-up window is likely incorrect. '
                        + `Continuing with it present.`);
                }
            }

            // set-up gif encoder
            const chunks = [];
            const gif = new GifEncoder(viewportWidth, viewportHeight);

            gif.setFrameRate(frameRate);
            gif.setRepeat(0); // loop indefinitely
            gif.on('data', (chunk) => chunks.push(chunk));
            gif.writeHeader();

            // add first frame multiple times so there is some delay before gif starts visually scrolling
            await record(page, gif, recordingTimeBeforeAction, frameRate);

            // start scrolling down and take screenshots
            if (scrollDown) {
                await scrollDownProcess({ page, gif, viewportHeight, scrollPercentage });
            }

            // click element and record the action
            if (clickSelector) {
                try {
                    await page.waitForSelector(clickSelector);
                    log.info(`Clicking element with selector ${clickSelector}`);
                    await page.click(clickSelector);
                } catch (err) {
                    log.warning('Could not click on click button, click selector is likely incorrect. Continuing without click.');
                }

                await record(page, gif, recordingTimeAfterClick, frameRate);
            }

            gif.finish();
            const gifBuffer = await getGifBuffer(gif, chunks);

            const urlObj = new URL(validUrl);
            const siteName = urlObj.hostname;
            const baseFileName = `${siteName}-scroll`;

            // Save to dataset so there is higher chance the user will find it

            const toPushDataset = {
                gifUrlOriginal: undefined,
                gifUrlLossy: undefined,
                gifUrlLosless: undefined,
            };
            const kvStore = await Actor.openKeyValueStore();

            const filenameOrig = `${baseFileName}_original`;
            await saveGif(filenameOrig, gifBuffer);
            toPushDataset.gifUrlOriginal = kvStore.getPublicUrl(filenameOrig);
            gifUrl = toPushDataset.gifUrlOriginal;

            if (lossyCompression) {
                const lossyBuffer = await compressGif(gifBuffer, 'lossy');
                log.info('Lossy compression finished');
                const filenameLossy = `${baseFileName}_lossy-comp`;
                await saveGif(filenameLossy, lossyBuffer);
                toPushDataset.gifUrlLossy = kvStore.getPublicUrl(filenameLossy);
            }

            if (loslessCompression) {
                const loslessBuffer = await compressGif(gifBuffer, 'losless');
                log.info('Losless compression finished');
                const filenameLosless = `${baseFileName}_losless-comp`;
                await saveGif(filenameLosless, loslessBuffer);
                toPushDataset.gifUrlLosless = kvStore.getPublicUrl(filenameLosless);
            }

            await Actor.pushData(toPushDataset);
        },
        failedRequestHandler: async ({ request }) => {
            // Print last error message as status code if complete fail happens
            errorMessage = request.errorMessages[request.errorMessages.length - 1];
        },
    });

    // check in case if input url doesn't have 'https://' part
    const validUrl = url.includes('http') ? url : `https://${url}`;
    await Actor.setStatusMessage(`Opening page: ${validUrl}`);
    const initRequest = { url: validUrl };

    await crawler.run([initRequest]);

    if (gifUrl) {
        await Actor.exit(`Gif created successfully. Gif URL: ${gifUrl}. Open dataset results for more details.`);
    } else {
        await Actor.fail(`Could not create GIF because of error: ${errorMessage}`);
    }
});
