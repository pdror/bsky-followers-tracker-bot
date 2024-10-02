import { User } from '../models/userModel.js';
import { saveFollowers, fetchFollowers, fetchHandles } from "../services/followerService.js";
import { removeUnfollowers, saveFollowersInBuckets } from '../services/service.js';
import { compareFollowers } from '../utils/compareFollowers.js';
import { printUnfollowers } from '../utils/printUnfollowers.js';
import { differenceInDays, startOfDay } from 'date-fns';
import { MAX_DAYS } from "../utils/constants.js";
import {getTranslation} from "../i18n/i18n.js";

export const test = async (userDid, userHandle, accessJwt) => {
    const user = await User.findOne({ did: userDid}).populate('buckets');
    console.log(user);
    
    
    const storedFollowers = user.buckets.flatMap(bucket => bucket.followers);
    console.log(storedFollowers.length);
    console.log(storedFollowers[0]);
};

export const handleFollowerReportRequest = async (userDid, userHandle, userLang, accessJwt) => {
    try {
        let reply = "";

        // Gets the user from the database
        const user = await User.findOne({ did: userDid}).populate('buckets');
        if(!user) {
            // Gets the followers from the API
            const currentFollowers = await fetchFollowers(userHandle, accessJwt);

            if(!currentFollowers || currentFollowers.length === 0) {
                reply += getTranslation('noFollowers', userLang);
                return reply;
            }

            await saveFollowersInBuckets(userDid, currentFollowers);
            reply += getTranslation('newMonitoring', userLang, { handle: userHandle, count: currentFollowers.length });
            return reply;
        }
        
        if(!canUpdateReport(user.last_checked)) {
            const daysLeft = MAX_DAYS - differenceInDays(startOfDay(new Date()), startOfDay(user.last_checked));
            reply += getTranslation('updateLimit', userLang, { days: MAX_DAYS, daysLeft: daysLeft });
            return reply;
        }

        // Gets the followers from the API
        const currentFollowers = await fetchFollowers(userHandle, accessJwt);

        if(!currentFollowers || currentFollowers.length === 0) {
            reply += getTranslation('noFollowers', userLang);
            return reply;
        }

        // Passo 3: Comparar seguidores armazenados e os seguidores atuais
        const storedFollowers = user.buckets.flatMap(bucket => bucket.followers);  // Todos os DIDs dos seguidores armazenados
        const updatedFollowers = currentFollowers.map(f => f.did);  // Todos os DIDs dos seguidores atuais

        const { unfollowed, newFollowers } = compareFollowers(updatedFollowers, storedFollowers);

        // Removes the unfollowers from the user followers collection
        if(unfollowed.length > 0) {
            const handles = await fetchHandles(unfollowed, accessJwt);
            reply += printUnfollowers(unfollowed.length, handles);
            await removeUnfollowers(userDid, unfollowed);
        } else {
            reply += getTranslation('noUnfollowers', userLang);
        }

        if(newFollowers.length > 0) {
            await saveFollowersInBuckets(userDid, newFollowers);
        }

        return reply;
    } catch (err) {
        console.error(`Erro ao gerar o relatório de seguidores: ${err.message}`);
    }
};

/**
 * Determines if the report can be updated based on the last checked date.
 *
 * @param {Date} last_checked - The date when the report was last checked.
 * @returns {boolean} - Returns true if the report can be updated, otherwise false.
 */
const canUpdateReport = (last_checked) => {
    if(!last_checked) return true;
    const today = startOfDay(new Date());
    const lastCheckedDay = startOfDay(last_checked);
    return differenceInDays(today, lastCheckedDay) >= MAX_DAYS;
};