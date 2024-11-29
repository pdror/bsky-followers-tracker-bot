import axios from 'axios';
import {Follower} from '../models/followerModel.js';
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