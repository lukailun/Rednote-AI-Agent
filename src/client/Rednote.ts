import { Browser, DEFAULT_INTERCEPT_RESOLUTION_PRIORITY, ElementHandle } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
import { Server } from "proxy-chain";
import logger from "../config/logger";
import { loadCookies, RednoteCookiesExist, saveCookies } from "../utils";
import { runAgent } from "../Agent";
import { getRednoteCommentSchema } from "../Agent/schema";

puppeteer.use(StealthPlugin());
puppeteer.use(
    AdblockerPlugin({
        interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY,
    })
);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const XIAOHONGSHU_URL = "https://www.xiaohongshu.com/";

async function runRednote() {
    const server = new Server({ port: 8000 });
    await server.listen();
    const proxyUrl = `http://localhost:8000`;
    const browser = await puppeteer.launch({
        headless: false,
        args: [`--proxy-server=${proxyUrl}`],
    });

    const page = await browser.newPage();
    await page.goto(XIAOHONGSHU_URL, { waitUntil: 'networkidle2' });

    const cookiesPath = "./cookies/Rednotecookies.json";

    const checkCookies = await RednoteCookiesExist();
    logger.info(`Checking cookies existence: ${checkCookies}`);

    if (checkCookies) {
        const cookies = await loadCookies(cookiesPath);
        await browser.setCookie(...cookies);
        logger.info('Cookies loaded and set on the page.');

        const isLoggedIn = false; 
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

    await page.goto(XIAOHONGSHU_URL);

    while (true) {
         await interactWithPosts(page);
         logger.info("Iteration complete, waiting 30 seconds before refreshing...");
         await delay(30000);
         try {
             await page.reload({ waitUntil: "networkidle2" });
         } catch (e) {
             logger.warn("Error reloading page, continuing iteration: " + e);
         }
    }
}

const loginWithQRCode = async (page: any, browser: Browser) => {
    try {
        logger.info("Waiting for QR code to appear...");
        await page.waitForSelector('.qrcode-img', { timeout: 10000 });
        
        logger.info("Please scan the QR code to login...");
        
        try {
            // Wait up to 5 minutes for login
            await page.waitForSelector('.reds-avatar', { timeout: 5 * 60000 });
            logger.info("Login successful!");
            
            const cookies = await browser.cookies();
            await saveCookies("./cookies/RednoteCookies.json", cookies);
        } catch (error) {
            logger.error("Login timeout. Please try again.");
            await browser.close();
            return;
        }
    } catch (error) {
        logger.error("Error during QR code login:", error);
    }
}

async function interactWithPosts(page: any) {
    let postIndex = 0;
    const maxPosts = 50;

    while (postIndex <= maxPosts) {
        try {
            const postSelector = `section.note-item[data-index="${postIndex}"]`;

            if (!(await page.$(postSelector))) {
                console.log("No more posts found. Ending iteration...");
                return;
            }

            await page.click(postSelector);
            await page.waitForSelector('.interaction-container');
            await page.waitForSelector('#detail-title');
            await page.waitForSelector('#detail-desc');
            
            const titleElement: ElementHandle<HTMLElement> | null = await page.$('#detail-title');
            const contentElement: ElementHandle<HTMLElement> | null = await page.$('#detail-desc');
            
            let title = "";
            let content = "";
            let mediaUrls: { type: 'image' | 'video', url: string }[] = [];
            
            if (titleElement) {
                title = await titleElement.evaluate((el: HTMLElement) => el.innerText);
                console.log(`Title for post ${postIndex}: ${title}`);
            }
            
            if (contentElement) {
                content = await contentElement.evaluate((el: HTMLElement) => {
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
                console.log(`Content for post ${postIndex}: ${content}`);
            }

            const imageElements = await page.$$('.note-slider-img');
            for (const imgElement of imageElements) {
                const imgSrc = await imgElement.evaluate((el: HTMLImageElement) => el.src);
                if (imgSrc) {
                    mediaUrls.push({ type: 'image', url: imgSrc });
                }
                console.log(`Found image for post ${postIndex}: ${imgSrc}`);
            }

            const videoElements = await page.$$('video');
            for (const videoElement of videoElements) {
                const videoSrc = await videoElement.evaluate((el: HTMLVideoElement) => el.src);
                if (videoSrc) {
                    mediaUrls.push({ type: 'video', url: videoSrc });
                }
                console.log(`Found video for post ${postIndex}: ${videoSrc}`);
            }

            console.log(`Found ${mediaUrls.length} media items for post ${postIndex}`);

            if (!title && !content) {
                console.log(`No title or content found for post ${postIndex}.`);
            }

            await page.waitForSelector('#content-textarea', { timeout: 5000 });
            const commentBoxSelector = '#content-textarea';
            const commentBox = await page.$(commentBoxSelector);
            if (commentBox) {
                await commentBox.click();
                console.log(`Commenting on post ${postIndex}...`);
                const mediaDescription = mediaUrls.map(media => 
                    `${media.type === 'video' ? 'Video' : 'Image'}: ${media.url}`
                ).join('\n');
                const prompt = `Craft a thoughtful, engaging, and mature reply to the following post: "${title}\n${content}". The post contains the following media: ${mediaDescription}. Ensure the reply is relevant, insightful, and adds value to the conversation. It should reflect empathy and professionalism, and avoid sounding too casual or superficial. Also it should be 300 characters or less.`;
                const schema = getRednoteCommentSchema();
                const result = await runAgent(schema, prompt);
                const comment = result[0]?.comment;
                await commentBox.type(comment);

                await delay(5000);
                const sendButton = await page.$('.btn.submit:not([disabled])');
                if (sendButton) {
                    console.log(`Posting comment on post ${postIndex}...`);
                    await sendButton.click();
                    console.log(`Comment posted on post ${postIndex}: ${comment}.`);
                } else {
                    console.log("Send button not found or disabled.");
                }
            } else {
                console.log("Comment box not found.");
            }

            await delay(3000);
            const closeButton = await page.$('.close-circle');
            if (closeButton) {
                await closeButton.click();
                console.log(`Closed post ${postIndex}.`);
            } else {
                console.log("Close button not found.");
            }

            const waitTime = Math.floor(Math.random() * 5000) + 5000;
            console.log(`Waiting ${waitTime / 1000} seconds before moving to the next post...`);
            await delay(waitTime);

            postIndex++;
        } catch (error) {
            console.error(`Error interacting with post ${postIndex}:`, error);
            break;
        }
    }
}

export { runRednote };
