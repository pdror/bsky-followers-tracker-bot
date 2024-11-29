import { User } from '../models/userModel.js';
import { FollowerBucket } from '../models/followerBucektModel.js';
import { BUCKET_SIZE } from '../utils/constants.js';

/**
 * Salva os seguidores em "baldes" para um determinado usuário.
 * @param {string} did - O did único do usuário.
 * @param {Array} followers - O array de seguidores a ser salvo.
 * @returns {Promise<void>} - A promise that resolves when the followers are saved.
 */
export const saveFollowersInBuckets = async (did, followers) => {
    try {
        // Obtém o usuário na base de dados
        let user = await User.findOne({ did });
        if(!user) {
            user = new User({ did, buckets: [] });
        }

        // Obtém seu último balde
        let lastBucket;
        if(user.buckets.length > 0) {
            lastBucket = await FollowerBucket.findById(user.buckets[user.buckets.length - 1]);
        }

        // Divide os seguidores entre os baldes
        let remainingFollowers = [...followers];
        let bucketIndex = user.buckets.length;

        while(remainingFollowers.length > 0) {
            let followersToSave;
            if(lastBucket && lastBucket.followers.length < BUCKET_SIZE) {
                const spaceLeft = BUCKET_SIZE - lastBucket.followers.length;
                followersToSave = remainingFollowers.splice(0, spaceLeft);
                lastBucket.followers.push(...followersToSave);
                await lastBucket.save();
            } else {
                followersToSave = remainingFollowers.splice(0, BUCKET_SIZE);
                const newBucket = new FollowerBucket({
                    userDid: did,
                    bucketIndex,
                    followers: followersToSave.map(follower => follower.did)
                })
                await newBucket.save();

                user.buckets.push(newBucket._id);
                bucketIndex++;
            }
        }

        user.last_checked = new Date();
        await user.save();
        console.log(`Saved ${followers.length} followers for ${did}: ${followers.map(f => f.did)}`);
    } catch (err) {
        console.error(`Error saving followers for ${did}: ${err}`);
    }
};

/**
 * Remove aqueles que deixaram de seguir o usuário da sua coleção de seguidores.
 * @param {String} userDid - Did do usuário.
 * @param {Array} currentFollowers - Lista de seguidores atuais do usuário.
 */
export const removeUnfollowers = async (userDid, currentFollowers) => {
    try {
        // Finds the user in the database
        const user = await User.findOne({ did: userDid }).populate('buckets');
        if(!user) {
            console.error(`User ${userDid} not found`);
            return;
        }

        // Converts the current followers into a set for faster lookup
        const currentFollowersSet = new Set(currentFollowers);

        for(const bucket of user.buckets) {
            const updatedFollowers = bucket.followers.filter(follower => !currentFollowersSet.has(follower));
            if(updatedFollowers.length !== bucket.followers.length) {
                await FollowerBucket.findByIdAndUpdate(bucket._id, {
                    $set: { followers: updatedFollowers }
                });
            }
        }

        const removedCount = currentFollowers.length;

        console.log(`Removed ${removedCount} unfollowers for ${userDid}`);
    } catch (err) {
        console.error(`Error removing unfollowers for ${userDid}: ${err}`);
    }
};