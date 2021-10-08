## Features
Our free GIF Scroll Animation actor is an automation tool to let you capture any scrolling web page as a GIF. 

All content on the full page will be recorded, just as if you were scrolling the page yourself and recording it. But because it's automated, the pace of scrolling will be smooth.

It can be tricky to get a good recording of animations that appear when scrolling down a page. You might not scroll smoothly and the final result could look jerky or awkward. This GIF maker will automate the process, so that you just give it a URL and it will capture a wonderfully smooth animated recording of the page scrolling.

## Why use it? 
If you want to showcase your website (or any website) or share it somewhere online, you might prefer to capture a scrolling GIF. That lets you avoid problems with browser support and you embed the GIF anywhere you like, such as on social media or in comments.

The tool can also be used to visually check pages and make sure that the user experience is good. It can let you see what the page will look like to a real person scrolling down the page and highlight problems with the layout or design. The GIF maker would be especially useful if you have to do this regularly for a lot of pages, so that you can avoid manually going to each page and interacting with it in a browser.

## How it works
It's very simple to use. You give the actor a URL, it visits the web page and takes screenshots. The screenshots are then used as frames and turned into a GIF.

There are several settings you can change if you want to change the frame rate, wait before scrolling, compress the GIF, change the viewport, and a bunch of other customizable options. Or you can just give it a URL and go with the default settings.

## Tutorial
Here's a [quick step-by-step guide](https://blog.apify.com/how-to-make-a-scrolling-gif-of-a-web-page/) to teach you how to make an animated scrolling GIF of any web page using GIF Scroll Animation. There's also a one-second history of the GIF and some awesome reaction GIFs to blow your mind...

## Output
### Example
Scrolling GIF for www.franshalsmuseum.nl:  

![Frans Hals Museam gif](./src/gif-examples/www.franshalsmuseum.nl-scroll_lossy-comp.gif)

### Storage
The GIF files are stored in the Apify key-value store. The original GIF will always be saved. Additional GIFs might also be stored if you customize the compression method. You can also find links to the GIFs in the Dataset.

## Input parameters
| Field    | Type   | Required | Default | Description |
| -------- | ------ | -------- | ------- | ----------- |
| url      | string | Yes      |         | Website URL |
| frameRate | integer | No | 7 | Number of frames per second (fps). |
| scrollDown | boolean | Yes |  | When true, the actor will scroll down the page and capture it to create the GIF. |
| scrollPercentage | integer | No | 10 | Amount to scroll down determined as a percentage of the viewport height. (%) |
| recordingTimeBeforeAction | integer | No | 1 | Amount of time to capture the screen before doing any action like scrolling down or clicking. (ms) | 
| clickSelector | integer | No |  | Used to click an element and record it. |
| recordingTimeAfterClick | integer | No | Amount of time to record the screen after clicking an element with the click selector. | 
| waitToLoadPage | integer | No | 0 | Set time to wait at the beginning so that page is fully loaded (ms). |  
| cookieWindowSelector | string | No | | CSS selector to remove cookie pop-up window if one is present. |
| slowDownAnimations | boolean | No | false |When selected, slows down animations on the page so they can be properly captured. |
| lossyCompression | boolean | No | true | Lossy LZW compression of GIF using Giflossy. |
| loslessCompression | boolean | No | false | Lossless compression of GIF using Gifsicle. |
| viewportWidth | integer | No | 1366 | Inner width of browser window (pixels) |  
| viewportHeight | integer | No | 768 | Inner height of browser window (pixels) |

### Input example
```json
{
  "url": "https://www.franshalsmuseum.nl/en/",
    "frameRate": 7,
    "scrollDown": true,
    "recordingTimeBeforeAction": 1500,
    "cookieWindowSelector": ".cookiebar"
}
```
