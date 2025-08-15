import { Browser, DEFAULT_INTERCEPT_RESOLUTION_PRIORITY, Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
import { Server } from "proxy-chain";
import logger from "../config/logger";
import { loadCookies, RednoteCookiesExist, saveCookies } from "../utils";
import { runAgent } from "../Agent";
import { getRednoteCommentSchema } from "../Agent/schema";
import { generateCommentPrompt } from "../config/prompts";

puppeteer.use(StealthPlugin());
puppeteer.use(
    AdblockerPlugin({
        interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY,
    })
);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const XIAOHONGSHU_URL = "https://www.xiaohongshu.com/";
const COOKIES_PATH = "./cookies/RednoteCookies.json";

async function runRednote(searchKeyword: string, userActions: { like: boolean; collect: boolean; chat: boolean }) {
    const server = new Server({ port: 8001 });
    await server.listen();
    const proxyUrl = `http://localhost:8001`;
    const browser = await puppeteer.launch({
        headless: false,
        args: [`--proxy-server=${proxyUrl}`],
    });

    const page = await browser.newPage();
    await page.goto(XIAOHONGSHU_URL, { waitUntil: 'networkidle2' });

    const checkCookies = await RednoteCookiesExist();
    logger.info(`Checking cookies existence: ${checkCookies}`);

    if (checkCookies) {
        const cookies = await loadCookies(COOKIES_PATH);
        await browser.setCookie(...cookies);
        logger.info('Cookies loaded and set on the page.');

        await page.reload({ waitUntil: 'networkidle2' });
        
        const isLoggedIn = await page.$('.reds-avatar') !== null;
        if (isLoggedIn) {
            logger.info("Login verified with cookies.");
        } else {
            logger.warn("Cookies invalid or expired. Logging in again...");
            await loginWithQRCode(page, browser);
        }
    } else {
        await loginWithQRCode(page, browser);
    }

    await page.screenshot({ path: "logged_in.png" });

    if (searchKeyword) {
        logger.info(`Using search keyword: "${searchKeyword}"`);
        await searchForPosts(page, searchKeyword);
    }

    while (true) {
         await interactWithPosts(page, userActions);
         logger.info("Iteration complete, waiting 10 seconds before refreshing...");
         await delay(10000);
         try {
             await page.reload({ waitUntil: "networkidle2" });
         } catch (e) {
             logger.warn("Error reloading page, continuing iteration: " + e);
         }
    }
}

const loginWithQRCode = async (page: Page, browser: Browser) => {
    try {
        logger.info("Waiting for QR code to appear...");
        await page.waitForSelector('.qrcode-img', { timeout: 10000 });
        
        logger.info("Please scan the QR code to login...");
        
        try {
            // Wait up to 5 minutes for login
            await page.waitForSelector('.reds-avatar', { timeout: 5 * 60000 });
            logger.info("Login successful!");
            
            const cookies = await browser.cookies();
            await saveCookies(COOKIES_PATH, cookies);
        } catch (error) {
            logger.error("Login timeout. Please try again.");
            await browser.close();
            return;
        }
    } catch (error) {
        logger.error("Error during QR code login:", error);
    }
}

const searchForPosts = async (page: Page, searchKeyword: string) => {
    try {
        logger.info(`Searching for posts with keyword: "${searchKeyword}"...`);
        await page.waitForSelector('.search-input, #search-input', { timeout: 5000 });
        const searchSelectors = ['.search-input', '#search-input'];
        
        let searchInput = null;
        for (const selector of searchSelectors) {
            try {
                searchInput = await page.$(selector);
                if (searchInput) {
                    logger.info(`Found search input with selector: ${selector}`);
                    break;
                }
            } catch (error) {
                continue;
            }
        }
        
        if (!searchInput) {
            logger.warn("Could not find search input, proceeding without search");
            return;
        }
        
        await searchInput.click();
        await delay(1000);
        await searchInput.type(searchKeyword);
        await delay(1000);
        
        await page.keyboard.press('Enter');
        logger.info(`Search initiated for '${searchKeyword}' posts`);
        await delay(1000);
        
        const resultSelectors = ['.search-layout'];
        
        let resultsLoaded = false;
        for (const selector of resultSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 3000 });
                resultsLoaded = true;
                logger.info(`Search results loaded with selector: ${selector}`);
                break;
            } catch (error) {
                continue;
            }
        }
        if (!resultsLoaded) {
            logger.warn("Search results may not have loaded properly");
        }
        logger.info(`Search for '${searchKeyword}' posts completed`);
        
    } catch (error) {
        logger.error("Error during search for posts:", error);
    }
}

const interactWithPosts = async (page: Page, userActions: { like: boolean; collect: boolean; chat: boolean }) => {
    let postIndex = 0;
    const maxPosts = 50;

    while (postIndex <= maxPosts) {
        try {
            const postSelector = `section.note-item[data-index="${postIndex}"]`;

            if (!(await page.$(postSelector))) {
                logger.info("No more posts found. Ending iteration...");
                return;
            }

            await page.click(postSelector);
            await page.waitForSelector('.interaction-container');
            
            await delay(2000);
            
            let title = "";
            let content = "";
            let mediaUrls: { type: 'image' | 'video', url: string }[] = [];
            
            const titleSelectors = ['#detail-title', '.title', '.note-content .title'];
            for (const selector of titleSelectors) {
                try {
                    const titleElement = await page.$(selector);
                    if (titleElement) {
                        title = await titleElement.evaluate((el: Element) => (el as HTMLElement).innerText.trim());
                        if (title) break;
                    }
                } catch (error) {
                    continue;
                }
            }
            
            const contentSelectors = ['#detail-desc .note-text', '.desc .note-text', '.note-content .desc .note-text', '#detail-desc'];
            let retryCount = 0;
            const maxRetries = 3;
            
            while (!content && retryCount < maxRetries) {
                for (const selector of contentSelectors) {
                    try {
                        const contentElement = await page.$(selector);
                        if (contentElement) {
                            content = await contentElement.evaluate((el: Element) => {
                                const processNode = (node: Node): string => {
                                    if (node.nodeType === Node.TEXT_NODE) {
                                        return node.textContent?.trim() || '';
                                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                                        const element = node as HTMLElement;
                                        if (element.classList.contains('tag')) {
                                            return element.textContent?.trim() || '';
                                        }
                                        return Array.from(element.childNodes)
                                            .map(child => processNode(child))
                                            .filter(text => text && text.trim() !== '')
                                            .join(' ');
                                    }
                                    return '';
                                };

                                return Array.from(el.childNodes)
                                    .map(node => processNode(node))
                                    .filter(text => text && text.trim() !== '')
                                    .join(' ');
                            });
                            
                            if (content && content.trim()) {
                                break;
                            }
                        }
                    } catch (error) {
                        continue;
                    }
                }
                
                if (!content && retryCount < maxRetries - 1) {
                    await delay(1000);
                }
                retryCount++;
            }
       
            const imageElements = await page.$$('.note-slider-img');
            for (const imgElement of imageElements) {
                const imgSrc = await imgElement.evaluate((el: Element) => (el as HTMLImageElement).src);
                if (imgSrc) {
                    mediaUrls.push({ type: 'image', url: imgSrc });
                }
            }

            const videoElements = await page.$$('video');
            for (const videoElement of videoElements) {
                const videoSrc = await videoElement.evaluate((el: Element) => (el as HTMLVideoElement).src);
                if (videoSrc) {
                    mediaUrls.push({ type: 'video', url: videoSrc });
                }
            }

            logger.info(`\n=== Post ${postIndex} Information ===`);
            logger.info(`Title: ${title || 'No title'}`);
            logger.info(`Content: ${content || 'No content'}`);
            logger.info(`Media URLs: ${mediaUrls.length} items`);
            mediaUrls.forEach((media, index) => {
                logger.info(`  ${index + 1}. ${media.type}: ${media.url}`);
            });
            logger.info(`=== End Post ${postIndex} ===\n`);

            await delay(1000);
            
            if (userActions.like) {
                try {
                    await page.waitForSelector('.interaction-container .like-wrapper', { timeout: 5000 });
                    const likeButton = await page.$('.interaction-container .like-wrapper');
                    if (likeButton) {
                        const isLiked = await likeButton.evaluate((el: Element) => {
                            const iconElement = (el as HTMLElement).querySelector('use');
                            return iconElement && iconElement.getAttribute('xlink:href') === '#liked';
                        });
                        
                        if (!isLiked) {
                            await likeButton.click();
                            logger.info(`Liked post ${postIndex}`);
                            await delay(1000);
                        } else {
                            logger.info(`Post ${postIndex} already liked`);
                        }
                    }
                } catch (error) {
                    logger.warn(`Failed to like post ${postIndex}:`, error);
                }
            }

            if (userActions.collect) {
                try {
                    await page.waitForSelector('.interaction-container .collect-wrapper', { timeout: 5000 });
                    const collectButton = await page.$('.interaction-container .collect-wrapper');
                    if (collectButton) {
                        const isCollected = await collectButton.evaluate((el: Element) => {
                            const iconElement = (el as HTMLElement).querySelector('use');
                            return iconElement && iconElement.getAttribute('xlink:href') === '#collected';
                        });
                        
                        if (!isCollected) {
                            await collectButton.click();
                            logger.info(`Collected post ${postIndex}`);
                            await delay(1000);
                        } else {
                            logger.info(`Post ${postIndex} already collected`);
                        }
                    }
                } catch (error) {
                    logger.warn(`Failed to favorite post ${postIndex}:`, error);
                }
            }

            if (userActions.chat) {
                try {
                    await page.waitForSelector('.interaction-container #content-textarea', { timeout: 5000 });
                    const commentBoxSelector = '.interaction-container #content-textarea';
                    const commentBox = await page.$(commentBoxSelector);
                    if (commentBox) {
                        await commentBox.click();
                        const mediaDescription = mediaUrls.map(media => 
                            `${media.type === 'video' ? 'Video' : 'Image'}: ${media.url}`
                        ).join('\n');
                        const prompt = generateCommentPrompt(title, content, mediaDescription);
                        logger.info(`Prompt: ${prompt}`);
                        const schema = getRednoteCommentSchema();
                        const result = await runAgent(schema, prompt);
                        const comment = result[0]?.comment;
                        await commentBox.type(comment);

                        await delay(3000);
                        const sendButton = await page.$('.btn.submit:not([disabled])');
                        if (sendButton) {
                            await sendButton.click();
                            logger.info(`Comment posted on post ${postIndex}: ${comment}.`);
                        }
                    }
                } catch (error) {
                    logger.warn(`Failed to comment on post ${postIndex}:`, error);
                }
            }

            await delay(3000);
            const closeButton = await page.$('.close-circle');
            if (closeButton) {
                await closeButton.click();
            } 

            const waitTime = Math.floor(Math.random() * 5000) + 5000;
            await delay(waitTime);

            postIndex++;
        } catch (error) {
            logger.error(`Error interacting with post ${postIndex}:`, error);
            break;
        }
    }
}

export { runRednote };
