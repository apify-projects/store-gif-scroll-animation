import { Actor, log } from 'apify';
import { PNG } from 'pngjs';

import imagemin from 'imagemin';
import imageminGiflossy from 'imagemin-giflossy';
import imageminGifsicle from 'imagemin-gifsicle';

const takeScreenshot = async (page) => {
    log.info('Taking screenshot');

    const screenshotBuffer = await page.screenshot({
        type: 'png',
    });

    return screenshotBuffer;
};

const parsePngBuffer = (buffer) => {
    const png = new PNG();
    return new Promise((resolve, reject) => {
        png.parse(buffer, (error, data) => {
            if (data) {
                resolve(data);
            } else {
                reject(error);
            }
        });
    });
};

const gifAddFrame = async (screenshotBuffer, gif) => {
    const png = await parsePngBuffer(screenshotBuffer);
    const pixels = png.data;

    log.debug('Adding frame to gif');
    gif.addFrame(pixels);
};

export const record = async (page, gif, recordingTime, frameRate) => {
    const frames = (recordingTime / 1000) * frameRate;

    for (let itt = 0; itt < frames; itt++) {
        const screenshotBuffer = await takeScreenshot(page);
        await gifAddFrame(screenshotBuffer, gif);
    }
};

export const getScrollParameters = async ({ page, viewportHeight, scrollPercentage }) => {
    // get page height to determine when we scrolled to the bottom
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight); // initially used body element height via .boundingbox() but this is not always equal to document height
    const scrollTop = await page.evaluate(() => document.documentElement.scrollTop);

    const initialPosition = viewportHeight + scrollTop;
    const scrollByAmount = Math.round(viewportHeight * scrollPercentage / 100);

    return {
        pageHeight,
        initialPosition,
        scrollByAmount,
    };
};

export const scrollDownProcess = async ({ page, gif, viewportHeight, scrollPercentage }) => {
    const { pageHeight, initialPosition, scrollByAmount } = await getScrollParameters({ page, viewportHeight, scrollPercentage });
    let scrolledUntil = initialPosition;

    while (pageHeight > scrolledUntil) {
        const screenshotBuffer = await takeScreenshot(page);

        gifAddFrame(screenshotBuffer, gif);

        log.info(`Scrolling down by ${scrollByAmount} pixels`);
        await page.evaluate((scrollByAmount) => {
            window.scrollBy(0, scrollByAmount);
        }, scrollByAmount);

        scrolledUntil += scrollByAmount;
    }
};

export const getGifBuffer = (gif, chunks) => {
    return new Promise((resolve, reject) => {
        gif.on('end', () => resolve(Buffer.concat(chunks)));
        gif.on('error', (error) => reject(error));
    });
};

const selectPlugin = (compressionType) => {
    switch (compressionType) {
        case 'lossy':
            return [
                imageminGiflossy({
                    lossy: 80,
                    optimizationLevel: 3,
                }),
            ];
        case 'losless':
            return [
                imageminGifsicle({
                    optimizationLevel: 3,
                }),
            ];
        default:
            throw new Error('Unknown compression type');
    }
};

export const compressGif = async (gifBuffer, compressionType) => {
    log.info('Compressing gif');
    const compressedBuffer = await imagemin.buffer(gifBuffer, {
        plugins: selectPlugin(compressionType),
    });
    return compressedBuffer;
};

export const saveGif = async (fileName, buffer) => {
    log.info(`Saving ${fileName} to key-value store`);
    const keyValueStore = await Actor.openKeyValueStore();
    const gifSaved = await keyValueStore.setValue(fileName, buffer, {
        contentType: 'image/gif',
    });
    return gifSaved;
};

export const slowDownAnimationsFn = async (page) => {
    log.info('Slowing down animations');

    const session = await page.target().createCDPSession();

    return await Promise.all([
        session.send('Animation.enable'),
        session.send('Animation.setPlaybackRate', {
            playbackRate: 0.1,
        }),
    ]);
};
