import {getTranslation} from "../i18n/i18n.js";

export const printUnfollowers = (unfollowersCount, handles, userLang) => {
    let reply = getTranslation('unfollowersMessage', userLang, { unfollowersCount });
    handles.forEach(handle => {
        reply += `👉 @${handle.handle}\n`;
    })

    if(unfollowersCount !== handles.length) {
        reply += getTranslation('accountsNotFound', userLang, { notFoundCount: unfollowersCount - handles.length });
    }

    return reply.trim();
}