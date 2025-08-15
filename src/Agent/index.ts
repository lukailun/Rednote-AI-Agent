import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../config/logger";
import { geminiApiKey } from "../secret";
import { handleError } from "../utils";
import { RednoteCommentSchema } from "./schema";
import fs from "fs";
import path from "path";
import * as readlineSync from "readline-sync";
import { runRednote } from "../client/Rednote";

export async function runAgent(schema: RednoteCommentSchema, prompt: string): Promise<any> {
    if (!geminiApiKey) {
        logger.error("No Gemini API key available.");
        return "No API key available.";
    }
    const generationConfig = {
        responseMimeType: "application/json",
        responseSchema: schema,
    };

    const googleAI = new GoogleGenerativeAI(geminiApiKey);
    const model = googleAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig,
    });

    try {
        const result = await model.generateContent(prompt);

        if (!result || !result.response) {
            logger.info("No response received from the AI model. || Service Unavailable");
            return "Service unavailable!";
        }

        const responseText = result.response.text();
        const data = JSON.parse(responseText);

        return data;
    } catch (error) {
        await handleError(error, schema, prompt, runAgent);
    }
}

export function chooseCharacter(): any {
    const charactersDir = (() => {
        const buildPath = path.join(__dirname, "characters");
        if (fs.existsSync(buildPath)) {
            return buildPath;
        } else {
            // Fallback to source directory
            return path.join(process.cwd(), "src", "Agent", "characters");
        }
    })();
    const files = fs.readdirSync(charactersDir);
    const jsonFiles = files.filter(file => file.endsWith(".json"));
    if (jsonFiles.length === 0) {
        throw new Error("No character JSON files found");
    }
    console.log("Select a character:");
    jsonFiles.forEach((file, index) => {
        console.log(`${index + 1}: ${file}`);
    });
    const answer = readlineSync.question("Enter the number of your choice: ");
    const selection = parseInt(answer);
    if (isNaN(selection) || selection < 1 || selection > jsonFiles.length) {
        throw new Error("Invalid selection");
    }
    const chosenFile = path.join(charactersDir, jsonFiles[selection - 1]);
    const data = fs.readFileSync(chosenFile, "utf8");
    const characterConfig = JSON.parse(data);
    return characterConfig;
}

export interface UserActions {
    like: boolean;
    collect: boolean;
    chat: boolean;
}

export function getUserActions(): UserActions {
    try {
        console.log("=== 选择要执行的操作 ===");
        console.log("1. 点赞");
        console.log("2. 收藏");
        console.log("3. 评论");
        console.log("输入数字（按回车仅浏览），用逗号分隔（例如：1,2,3）：");
        
        const answer = readlineSync.question("你的选择：");
        const choices = answer.split(',').map(s => s.trim());
        
        const actions: UserActions = {
            like: false,
            collect: false,
            chat: false
        };
        
        choices.forEach(choice => {
            switch(choice) {
                case '1':
                    actions.like = true;
                    break;
                case '2':
                    actions.collect = true;
                    break;
                case '3':
                    actions.chat = true;
                    break;
                default:
                    console.log(`无效选择: ${choice}，已忽略...`);
            }
        });
        
        if (!actions.like && !actions.collect && !actions.chat) {
            console.log("未选择任何操作 - 将仅浏览，不进行任何交互");
        }
        
        console.log("\n已选择的操作：");
        if (actions.like) console.log("✓ 点赞");
        if (actions.collect) console.log("✓ 收藏");
        if (actions.chat) console.log("✓ 评论");
        
        return actions;
    } catch (error) {
        console.error("获取用户操作时出错:", error);
        process.exit(1);
    }
}

export function getSearchKeyword(): string {
    try {
        const searchText = readlineSync.question("\n输入搜索关键词（按回车跳过搜索）：");
        const searchKeyword = searchText.trim();
        return searchKeyword;
    } catch (error) {
        console.error("输入搜索关键词时出错:", error);
        process.exit(1);
    }
}

export async function startRednoteAgent(): Promise<void> {
    try {
        const userActions = getUserActions();
        const searchKeyword = getSearchKeyword();
        await runRednote(searchKeyword, userActions);
    } catch (error) {
        console.error("启动小红书代理时出错:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    (() => {
        startRednoteAgent();
    })();
}
