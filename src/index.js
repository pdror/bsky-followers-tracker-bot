import connectDB from "./db/database.js";
import { initBot } from "./bot/bot.js";
import dotenv from 'dotenv';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})

app.get('/', (req, res) => {
    res.send('Bot running');
});

export const initializeBot = async () => {
    try {
        dotenv.config();
        await connectDB();
        await initBot();
    } catch (err) {
        console.error(`Error initializing bot: ${err.message}`);
        console.log(err);
    }
};

initializeBot();