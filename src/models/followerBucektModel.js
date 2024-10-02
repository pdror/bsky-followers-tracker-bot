import mongoose from 'mongoose';

const followerBucketSchema = new mongoose.Schema({
    userDid: {
        type: String,
        required: true
    },
    bucketIndex: {
        type: Number,
        required: true
    },
    followers: [{
        type: String
    }]
});

export const FollowerBucket = mongoose.model('FollowerBucket', followerBucketSchema);