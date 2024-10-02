import connectDB from "./db/database.js";
import { initBot } from "./bot/bot.js";
import dotenv from 'dotenv';

export const initializeBot = async () => {
    try {
        dotenv.config();
        await connectDB();
        await initBot();
    } catch (err) {
        console.error(`Error initializing bot: ${err.message}`);
    }
};

initializeBot();