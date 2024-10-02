import {User} from "../models/userModel.js";

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