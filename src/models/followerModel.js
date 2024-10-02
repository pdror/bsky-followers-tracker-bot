import mongoose from "mongoose";

const followerSchema = new mongoose.Schema({
    userDid: {
        type: String,
        required: true
    },
    followerDid: {
        type: String,
        required: true
    },
    handle: {
        type: String,
        required: true
    }
});

export const Follower = mongoose.model('Follower', followerSchema);