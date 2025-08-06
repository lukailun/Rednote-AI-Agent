import { promises as fs } from "fs";
import path from "path";
import logger from "../config/logger";

export async function RednoteCookiesExist(): Promise<boolean> {
    try {
        const cookiesPath = "./cookies/RednoteCookies.json";
        await fs.access(cookiesPath);

        const cookiesData = await fs.readFile(cookiesPath, "utf-8");
        const cookies = JSON.parse(cookiesData);

        const primaryCookie = cookies.find((cookie: { name: string }) => cookie.name === 'web_session');
        const fallbackCookie = cookies.find((cookie: { name: string }) => cookie.name === 'websectiga');

        const currentTimestamp = Math.floor(Date.now() / 1000);

        if (primaryCookie && primaryCookie.expires > currentTimestamp) {
            return true;
        }

        if (fallbackCookie && fallbackCookie.expires > currentTimestamp) {
            return true;
        }

        return false;
    } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === 'ENOENT') {
            logger.warn("Cookies file does not exist.");
            return false;
        } else {
            logger.error("Error checking cookies:", error);
            return false;
        }
    }
}



export async function saveCookies(cookiesPath: string, cookies: any[]): Promise<void> {
    try {
        const dir = path.dirname(cookiesPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
        logger.info("Cookies saved successfully.");
    } catch (error) {
        logger.error("Error saving cookies:", error);
        throw new Error("Failed to save cookies.");
    }
}

export async function loadCookies(cookiesPath: string): Promise<any[]> {
    try {
        await fs.access(cookiesPath);

        const cookiesData = await fs.readFile(cookiesPath, "utf-8");
        const cookies = JSON.parse(cookiesData);
        return cookies;
    } catch (error) {
        logger.error("Cookies file does not exist or cannot be read.", error);
        return [];
    }
}

export async function handleError(error: unknown, schema: any, prompt: string, runAgent: (schema: any, prompt: string) => Promise<string>): Promise<string> {
    if (error instanceof Error) {
        if (error.message.includes("503 Service Unavailable")) {
            logger.error("Service is temporarily unavailable. Retrying...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            return runAgent(schema, prompt);
        } else {
            logger.error(`Error generating training prompt: ${error.message}`);
            return `An error occurred: ${error.message}`;
        }
    } else {
        logger.error("An unknown error occurred:", error);
        return "An unknown error occurred.";
    }
}


export function setup_HandleError(error: unknown, context: string): void {
    if (error instanceof Error) {
        if (error.message.includes("net::ERR_ABORTED")) {
            logger.error(`ABORTION error occurred in ${context}: ${error.message}`);
        } else {
            logger.error(`Error in ${context}: ${error.message}`);
        }
    } else {
        logger.error(`An unknown error occurred in ${context}: ${error}`);
    }
}









/// Function to save scraped data to scrapedData.json
export const saveScrapedData = async function (link: string, content: string): Promise<void> {
    const scrapedDataPath = path.join(__dirname, '../data/scrapedData.json');
    const scrapedDataDir = path.dirname(scrapedDataPath);
    const scrapedData = {
        link,
        content,
    };

    try {
        // Ensure the directory exists
        await fs.mkdir(scrapedDataDir, { recursive: true });

        // Check if the file exists
        await fs.access(scrapedDataPath);
        // Read the existing data
        const data = await fs.readFile(scrapedDataPath, 'utf-8');
        const json = JSON.parse(data);
        // Append the new scraped data
        json.push(scrapedData);
        // Write the updated data back to the file
        await fs.writeFile(scrapedDataPath, JSON.stringify(json, null, 2));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            // File does not exist, create it with the new scraped data
            await fs.writeFile(scrapedDataPath, JSON.stringify([scrapedData], null, 2));
        } else {
            logger.error('Error saving scraped data:', error);
            throw error;
        }
    }
};
