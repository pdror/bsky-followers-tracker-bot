import { User } from '../models/userModel.js';
import { FollowerBucket } from '../models/followerBucektModel.js';
import { BUCKET_SIZE } from '../utils/constants.js';

/**
 * Saves followers in buckets for a given user.
 * @param {string} did - The user's unique identifier.
 * @param {Array} followers - The array of followers to be saved.
 * @returns {Promise<void>} - A promise that resolves when the followers are saved.
 */
export const saveFollowersInBuckets = async (did, followers) => {
    console.log(`Saving ${followers.length} new followers for ${did}`);
    try {
        // Finds the user in the database
        let user = await User.findOne({ did });
        if(!user) {
            user = new User({ did, buckets: [] });
        }

        // Gets the last bucket
        let lastBucket;
        if(user.buckets.length > 0) {
            lastBucket = await FollowerBucket.findById(user.buckets[user.buckets.length - 1]);
        }

        // Splits the followers into buckets
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
        console.log(`Saved ${followers.length} followers for ${did}`);
    } catch (err) {
        console.error(`Error saving followers for ${did}: ${err}`);
    }
};

/**
 * Remove the unfollowers from the user followers collection.
 * @param {String} userDid - User's did.
 * @param {Array} currentFollowers - List of actual dids of the user followers.
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

        // for(let bucket in user.buckets) {
        //     const followersBucket = await FollowerBucket.findOne({ id : bucket._id });
        //     const followers = followersBucket.followers.filter(did => currentFollowersSet.has(did));
        //     console.log(followersBucket);
        //     console.log(followers);

        //     if(followers.length > 0) {
        //         await followersBucket.save();
        //     } else {
        //         FollowerBucket.deleteOne({ _id: bucket._id });
        //     }
        // }

        // // Removes the unfollowers from the buckets
        // let updatedBuckets = user.buckets.flatMap(bucket => {
        //     console.log(bucket.followers);
        //     return bucket.followers.filter(did => currentFollowersSet.has(did))
        // });

        // console.log(updatedBuckets);

        // // Removes empty buckets
        // updatedBuckets = updatedBuckets.filter(bucket => bucket.length > 0);

        // // Updates the user buckets and save it
        // user.followers = updatedBuckets;
        // await user.save();

        console.log(`Removed ${removedCount} unfollowers for ${userDid}`);
    } catch (err) {
        console.error(`Error removing unfollowers for ${userDid}: ${err}`);
    }
};