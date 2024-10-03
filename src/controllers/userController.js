import { User } from "../models/userModel.js";
import {getTranslation} from "../i18n/i18n.js";

const supportedLanguages = ['en', 'pt'];
const languageNames = ['english', 'portuguese'];

export const saveUser = async (did, handle) => {
    try {
        const newUser = new User({
            did,
            handle,
            last_checked: new Date()
        })

        await newUser.save();
        console.log(`User ${handle} saved successfully`);
    } catch(err) {
        console.error(`Error saving user: ${err}`);
        throw err;
    }
};

export const findUser = async (userDid) => {
    try {
        return await User.findOne({did: userDid}).populate('buckets');
    } catch(err) {
        console.error(`Error finding user: ${err}`);
        throw err;
    }
}

export const configureLanguage = async(user, langCode) => {
    try {
        if(!supportedLanguages.includes(langCode)) {
            user.configs.language = 'en';
        }
        user.configs.language = langCode;
        await user.save();

        return getTranslation('languageUpdated', langCode, { langCode })
    } catch (err) {
        console.error(`Error configuring language: ${err.message}`);
    }
}