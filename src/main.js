const Apify = require('apify');
const GifEncoder = require('gif-encoder');

const {
    record,
    scrollDownProcess,
    getGifBuffer,
    compressGif,
    saveGif,
    slowDownAnimationsFn,
} = require('./helper');

const { log } = Apify.utils;

const wait = async (time) => {
    log.info(`Wait for ${time} ms`);
    return new Promise((resolve) => setTimeout(resolve, time));
};

Apify.main(async () => {
    const {
        url,
        viewportHeight = 768,
        viewportWidth = 1366,
        slowDownAnimations,
        waitToLoadPage,
        cookieWindowSelector,
        frameRate,
        recordingTimeBeforeAction,
        scrollDown,
        scrollPercentage,
        clickSelector,
        recordingTimeAfterClick,
        lossyCompression,
        loslessCompression,
    } = await Apify.getInput();

    const browser = await Apify.launchPuppeteer({ launchOptions: { timeout: 90000 } });
    const page = await browser.newPage();

    log.info(`Setting page viewport to ${viewportWidth}x${viewportHeight}`);
    await page.setViewport({
        width: viewportWidth,
        height: viewportHeight,
    });

    if (slowDownAnimations) {
        slowDownAnimationsFn(page);
    }

    log.info(`Opening page: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

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
            log.info('Selector for cookie pop-up window is likely incorrect');
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
            log.info('Click selector is likely incorrect');
        }

        await record(page, gif, recordingTimeAfterClick, frameRate);
    }

    browser.close();

    gif.finish();
    const gifBuffer = await getGifBuffer(gif, chunks);

    const siteName = url.match(/(\w+\.)?[\w-]+\.\w+/g);
    const baseFileName = `${siteName}-scroll`;

    // Save to dataset so there is higher chance the user will find it

    const toPushDataset = {
        gifUrlOriginal: undefined,
        gifUrlLossy: undefined,
        gifUrlLosless: undefined,
    };
    const kvStore = await Apify.openKeyValueStore();

    try {
        const filenameOrig = `${baseFileName}_original`;
        await saveGif(filenameOrig, gifBuffer);
        toPushDataset.gifUrlOriginal = kvStore.getPublicUrl(filenameOrig);

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
    } catch (error) {
        log.error(error);
    }

    await Apify.pushData(toPushDataset);

    log.info('Actor finished');
});
