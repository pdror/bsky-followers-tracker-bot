import {User} from '../models/userModel.js';
import {fetchFollowers, fetchHandles, fetchProfile} from "../services/followerService.js";
import {removeUnfollowers, saveFollowersInBuckets} from '../services/service.js';
import {compareFollowers} from '../utils/compareFollowers.js';
import {printUnfollowers} from '../utils/printUnfollowers.js';
import {differenceInDays, startOfDay} from 'date-fns';
import {MAX_DAYS} from "../utils/constants.js";
import {getTranslation} from "../i18n/i18n.js";

export const generateReportForSpecificUser = async (userHandle, accessJwt) => {
    try {
        console.log(`Gerando relatório para o usuário ${userHandle}...`);
        const userProfile = await fetchProfile(userHandle, accessJwt);
        const user = await User.findOne({ did: userProfile.did }).populate('buckets');

        if (!user) {
            console.log("Nenhum usuário encontrado na base de dados.");
            return;
        }

        const userLang = user.configs.language || 'en'; // Idioma padrão 'en' se não tiver idioma no user

        return await handleFollowerReportRequest(userProfile.did, userHandle, userLang, accessJwt);
    } catch(err) {
        console.error(`Erro ao gerar o relatório para o usuário ${user.did}: ${err.message}`);
    }
}

export const generateReportsForAllUsers = async (accessJwt) => {
    try {
        // Busca todos os usuários na base de dados
        const users = await User.find().populate('buckets');

        if (users.length === 0) {
            console.log("Nenhum usuário encontrado na base de dados.");
            return [];
        }

        let reportArray = [];

        // Percorre todos os usuários para gerar seus respectivos relatórios
        for (const user of users) {
            try {
                // Extrai as informações necessárias para o relatório
                const userDid = user.did;
                const userProfile = await fetchProfile(userDid, accessJwt)
                const userHandle = userProfile.handle;
                const userLang = user.configs.language || 'en'; // Idioma padrão 'en' se não tiver idioma no user

                // Chama o metodo existente para gerar o relatório do usuário
                const report = await handleFollowerReportRequest(userDid, userHandle, userLang, accessJwt);

                // Acumula o relatório deste usuário
                reportArray.push({ profile: userProfile, report: report });

            } catch (err) {
                console.error(`Erro ao gerar o relatório para o usuário ${user.did}: ${err.message}`);
                // Continue para o próximo usuário mesmo se der erro neste
                reportArray.push({ profile: userProfile, report: `Erro ao gerar o relatório para ${userHandle}` });
            }
        }

        // Ao final, retorna ou faz algo com o relatório completo
        return reportArray;

    } catch (err) {
        console.error(`Erro ao gerar relatórios para todos os usuários: ${err.message}`);
        throw err;
    }
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
        console.log(newFollowers);

        // Removes the unfollowers from the user followers collection
        if(unfollowed.length > 0) {
            const handles = await fetchHandles(unfollowed, accessJwt);
            reply += printUnfollowers(unfollowed.length, handles);
            console.log(unfollowed);
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
        throw err;
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