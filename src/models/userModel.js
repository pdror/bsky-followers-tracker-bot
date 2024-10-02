import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    did: {
        type: String,
        required: true,
        unique: true
    },
    last_checked: {
        type: Date,
        default: Date.now
    },
    configs: {
        language: {
            type: String,
            default: 'en'
        },
        automaticReports: {
            type: Boolean,
            default: false
        }
    },
    buckets: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FollowerBucket'
    }]
});

userSchema.methods.updateConfigs = function(newConfigs) {
    this.configs = {...this.configs, ...newConfigs};
    return this.save();
}

userSchema.methods.getUser = function(did) {
    return this.model('User').findOne({ did: did }).populate('buckets');
}

export const User = mongoose.model('User', userSchema);