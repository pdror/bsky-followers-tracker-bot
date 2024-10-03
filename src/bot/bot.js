import {Bot, EventStrategy} from "@skyware/bot";
import {configureLanguage, findUser} from "../controllers/userController.js";
import dotenv from 'dotenv';
import {getTranslation, getUserLanguageByUser} from "../i18n/i18n.js";
import {handleFollowerReportRequest, test} from "../controllers/followerController.js";
import {initializeBot} from "../index.js";

const langConfigRegex = /^config\s+lang\s+(\w+)$/i;

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
        const normalizedText = mention.text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();

        switch(true) {
            case normalizedText.includes('report') || normalizedText.includes('relatorio'):
                await mention.reply({text: getTranslation('dmPromise', userLang, { displayName: author.displayName })});
                let reply;
                try {
                    reply = await handleFollowerReportRequest(author.did, author.handle, userLang, session.accessJwt);
                    await author.sendMessage({ text : reply });
                    break;
                } catch(err) {
                    console.error(`Erro ao gerar relatório: ${err.message}`);
                    await author.sendMessage({ text: getTranslation('error', userLang) });
                    break;
                }
            case langConfigRegex.test(normalizedText):
                try {
                    await mention.reply({text: getTranslation('dmPromise', userLang, {displayName: author.displayName})});
                    const [, langCode] = normalizedText.match(langConfigRegex);
                    reply = await configureLanguage(user, langCode);
                    await mention.reply({text: reply});
                    break;
                } catch (err) {
                    console.error(`Error configuring language: ${err.message}`);
                    await author.sendMessage({ text: getTranslation('error', userLang) });
                    break;
                }
            case normalizedText.includes('help') || normalizedText.includes('ajuda'):
                try {
                    await mention.reply({text: getTranslation('dmPromise', userLang, {displayName: author.displayName})});
                    const reply = getTranslation('help', userLang);
                    await author.sendMessage({text: reply});
                    break;
                } catch (err) {
                    console.error(`Error sending help: ${err.message}`);
                    await author.sendMessage({ text: getTranslation('error', userLang) });
                    break;
                }
        }

        if(normalizedText.includes('unfollowers')) {
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
        const normalizedText = message.text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();

        let reply;
        switch (true) {
            case normalizedText.includes('report') || normalizedText.includes('relatorio'):
                try {
                    reply = await handleFollowerReportRequest(author.did, author.handle, userLang, session.accessJwt);
                    console.log(`Replying to ${author.displayName}: ${reply}`);
                    await conversation.sendMessage({ text: reply });
                    return;
                } catch (err) {
                    console.error(`Erro ao gerar relatório: ${err.message}`);
                    const text = getTranslation('error', userLang);
                    await conversation.sendMessage({ text: text });
                }
                break;
            case langConfigRegex.test(normalizedText):
                try {
                    const [, langCode] = normalizedText.match(langConfigRegex);
                    reply = await configureLanguage(user, langCode);
                    await conversation.sendMessage({text: reply});
                    console.log(`Replying to ${author.displayName}: ${reply}`);
                    break;
                } catch(err) {
                    console.error(`Error configuring language: ${err.message}`);
                    reply = getTranslation('error', userLang);
                    await conversation.sendMessage({text: reply});
                    console.log(`Replying to ${author.displayName}: ${reply}`);
                    break;
                }
            case normalizedText.includes('help') || normalizedText.includes('ajuda'):
                reply = getTranslation('help', userLang);
                await conversation.sendMessage({ text: reply });
                console.log(`Replying to ${author.displayName}: ${reply}`);
                break;
        }
    });
};