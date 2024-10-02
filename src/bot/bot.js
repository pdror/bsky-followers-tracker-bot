import {Bot, EventStrategy} from "@skyware/bot";
import {findUser} from "../controllers/userController.js";
import dotenv from 'dotenv';
import {getTranslation, getUserLanguageByUser} from "../i18n/i18n.js";
import {handleFollowerReportRequest, test} from "../controllers/followerController.js";
import {initializeBot} from "../index.js";

export const initBot = async () => {
    dotenv.config();

    const bot = new Bot({
        emitChatEvents: true,
        eventEmitterOptions: { strategy: EventStrategy.Polling, pollingInterval: 30 }
    });

    const session = await bot.login({
        identifier: process.env.BSKY_IDENTIFIER,
        password: process.env.BSKY_PASSWORD
    });

    console.log(`Bot logged in with session for ${session.handle}`);

    bot.on("open", async (open) => {
        console.log(`Bot connected succesfully`);
    });

    bot.on("error", async (error) => {
        console.log(`Error connecting to bot: ${error.message}`);

        setTimeout(() => {
            console.log("Trying to reconnect...");
            initializeBot();
        }, 10000);
    });

    bot.on("mention", async (mention) => {
        const author = mention.author;
        const user = await findUser(author.did);
        const userLang = getUserLanguageByUser(user, mention.langs);
        console.log(`Reply received from ${author.displayName}: ${mention.text}`);
        if(mention.text.includes('unfollowers')) {
            await mention.reply({text: getTranslation('dmPromise', userLang, { displayName: author.displayName })});
            let reply;
            try {
                reply = await handleFollowerReportRequest(author.did, author.handle, userLang, session.accessJwt);
                await author.sendMessage({ text : reply });
                return;
            } catch(err) {
                console.error(`Erro ao gerar relatório: ${err.message}`);
                await author.sendMessage({ text: getTranslation('error', userLang) });
            }
        }
    });

    bot.on("message", async (message) => {
        console.log(`Message received from ${message.senderDid}: ${message.text}`);

        const conversation = await message.getConversation();
        const author = await message.getSender();
        const user = await findUser(author.did);
        const userLang = getUserLanguageByUser(user, 'en');
        let reply;
        switch (true) {
            case message.text.includes('unfollowers'):
                try {
                    reply = await handleFollowerReportRequest(author.did, author.handle, session.accessJwt);
                    console.log(reply);
                    await conversation.sendMessage({ text: reply });
                    return;
                } catch (err) {
                    console.error(`Erro ao gerar relatório: ${err.message}`);
                    const text = getTranslation('error', userLang);
                    await conversation.sendMessage({ text: text });
                }
                break;
            case message.text.includes('config lang'):
                await test();
                break;
        }
    });
};