//import { saveFollowers } from '../db/followerModel.js';
//import { checkIfFirstTime, saveUser } from '../db/userModel.js';
import axios from 'axios';
import {saveUser} from '../controllers/userController.js';
import {Follower} from '../models/followerModel.js';
import {User} from '../models/userModel.js';
import ReinitializationRequiredError from "../errors/ReinitializationRequiredError.js";

export const fetchHandles = async (actors, accessJwt) => {
    console.log(`Fetching ${actors.length} handles`);
    const url = 'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles';
    const headers = {
        'Authorization': `Bearer ${accessJwt}`
    };

    let allHandles = [];

    let params = { actors };

    try {
        const response = await axios.get(url, { headers: headers, params: params });

        const profilesData = response.data;

        const handlesList = profilesData.profiles.map(profile => ({
            handle: profile.handle,
        }));

        allHandles = allHandles.concat(handlesList);
        console.log(accessJwt);
    } catch (err) {
        console.error(`Error fetching handles: ${err.response?.status} - ${err.response?.data}`);
    }

    return allHandles;
};

export const getUserFollowers = async (userDid) => {
    const user = await User.findOne({ did: userDid }).populate('buckets');
    return user.buckets.flatMap(bucket => bucket.followers);
}

export const handleMessage = async (message, accessJwt) => {
    const conversation = await message.getConversation();
    const author = await message.getSender();
    if(message.text.includes('check_unfollowers')) {
        try {
                const currentFollowers = await fetchFollowers(author.handle, accessJwt);
                await saveUser(author.did, author.handle);
                await saveFollowers(author.did, currentFollowers);
                await conversation.sendMessage({ text : `Olá @${author.displayName}, estou monitorando seus seguidores a partir de agora. Você tem atualmente ${currentFollowers.length} seguidores.` });
                return;

        } catch(err) {
            console.error(`Erro ao gerar relatório: ${err.message}`);
            await conversation.sendMessage({ text: `Desculpe, estou passando por alguns problemas no momento` });
        }
    }
};

export const handleMention = async (event, accessJwt) => {
    // if(text.includes('check_unfollowers')) {        
    //     try {
    //         const isFirstTime = await checkIfFirstTime(author.handle);

    //         if(isFirstTime) {
    //             const currentFollowers = await fetchFollowers(author.handle, accessJwt);
    //             await saveUser(author.did, author.handle);
    //             await saveFollowers(author.did, currentFollowers);
    //             await event.reply({ text : `Olá @${author.displayName}, estou monitorando seus seguidores a partir de agora` });
    //             return;
    //         }

    //         const unfollowed = await getUnfollowers();
    //         const activeFollowers = await getActiveFollowers();

    //         let replyMessage = `Olá @${author.displayName}, aqui está o seu relatório:\n`;

    //         if(unfollowed.length > 0) {
    //             replyMessage += `Você perdeu ${unfollowed.length} seguidores:\n`;
    //         } else {
    //             replyMessage += `Você não perdeu seguidores recentemente.\n`;
    //         }

    //         replyMessage += `Você tem ${activeFollowers.length} seguidores ativos.`;

    //         await event.reply(id, replyMessage);
    //     } catch(err) {
    //         console.error(`Erro ao gerar relatório: ${err.message}`);
    //         await event.reply(id, `Desculpe, estou passando por alguns problemas no momento`);
    //     }
    // }
};

export const fetchProfile = async (actor, accessJwt) => {
    console.log(`Fetching profile for ${actor}`);
    try {
        const url = 'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile';
        const params = {actor: actor};
        const response = await axios.get(url, {params: params});
        return response.data;
    } catch(err) {
        console.error(`Error fetching handle: ${err.response?.status} - ${err.response?.data}`);
    }
}

export const fetchFollowers = async (actor, accessJwt) => {
    console.log(`Fetching followers for ${actor}`);
    const url = 'https://public.api.bsky.app/xrpc/app.bsky.graph.getFollowers';
    
    let allFollowers = [];
    let cursor = null;
    const limit = 100;
    
    while(true) {
        let params = { 'actor': actor, 'limit': limit };

        if (cursor) {
            params['cursor'] = cursor;
        }
            
        try {
            const response = await axios.get(url, { params: params });

            // Acessando os headers de rate-limit
            const rateLimit = response.headers['ratelimit-limit'];
            const remaining = response.headers['ratelimit-remaining'];
            const resetTime = response.headers['ratelimit-reset'];

            console.log(`Rate Limit: ${rateLimit} | Requests Remaining: ${remaining} | Reset Time: ${new Date(resetTime * 1000).toLocaleDateString()}`);

            const followersData = response.data;

            const followersList = followersData.followers.map(follower => ({
                did: follower.did,
                handle: follower.handle,
            }));

            allFollowers = allFollowers.concat(followersList);

            console.log(`Got ${followersList.length} followers for ${actor}.`);

            cursor = followersData.cursor;
            if (!cursor) break;
        } catch (err) {
            console.error(`Error fetching followers: ${err.response?.status} - ${err.response?.data}`);
            throw new ReinitializationRequiredError('Received 400 status, bot reinitialization required');
        }
    }

    return allFollowers;
}

export const saveFollowers = async (did, followers) => {
    const followerDocuments = followers.map(follower => ({
        userDid: did,
        followerDid: follower.did,
        handle: follower.handle
    }));

    await Follower.insertMany(followerDocuments);
    console.log(`Saved ${followers.length} followers for ${did}`);
    return followers.length;
}

// async function getUnfollowers(handle) {
//     return new Promise((resolve, reject) => {
//         const query = `
//             SELECT follower_handle 
//             FROM followers 
//             WHERE user_id = (SELECT id FROM usuarios WHERE handle = ?)
//             AND is_active = 0 
//             AND unfollowed_at IS NOT NULL
//         `;

//         db.all(query, [handle], (err, rows) => {
//             if(err) {
//                 return reject(err);
//             }

//             const lostFollowers = rows.map(row => row.follower_handle);
//             resolve(lostFollowers);
//         })
//     });
// }

// async function getActiveFollowers(handle) {
//     return new Promise((resolve, reject) => {
//         const query = `
//             SELECT follower_handle 
//             FROM followers 
//             WHERE user_id = (SELECT id FROM usuarios WHERE handle = ?)
//             AND is_active = 1
//         `;

//         db.all(query, [handle], (err, rows) => {
//             if(err) {
//                 return reject(err);
//             }

//             const activeFollowers = rows.map(row => row.follower_handle);
//             resolve(activeFollowers);
//         })
//     });
// }