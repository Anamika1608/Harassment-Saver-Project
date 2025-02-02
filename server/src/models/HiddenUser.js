const mongoose = require('mongoose');

const hiddenUserSchema = new mongoose.Schema({
    userId: { type: String },
    name: { type: String, required: true },
    profileUrl: { type: String, required: true },
    hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    platform: { type: String, default: 'unknown' },
    reason: String,
    status: {
        type: String,
        enum: ['active', 'archived', 'pending_review'],
        default: 'active'
    },
    statistics: {
        totalMessagesHidden: { type: Number, default: 0 },
        messageTypes: {
            text: { type: Number, default: 0 },
            media: { type: Number, default: 0 },
            voice: { type: Number, default: 0 }
        },
        lastMessageHidden: Date,
        firstMessageHidden: Date,
        lastReviewDate: Date
    },
    metadata: {
        lastKnownActivity: Date,
        associatedPlatforms: [String],
        profileHistory: [{
            profileUrl: String,
            updatedAt: Date
        }]
    },
    randomProfileImage: String,
    isHarasser: { type: Boolean, default: false },
    totalHideCount: { type: Number, default: 0 }
}, { 
    timestamps: true,
    index: [
        { name: 1, profileUrl: 1, hiddenBy: 1 },
        { platform: 1 },
        { isHarasser: 1 }
    ]
});

hiddenUserSchema.pre('save', function(next) {
    if (!this.randomProfileImage) {
        const randomNumber = Math.floor(Math.random() * 50);
        this.randomProfileImage = `https://avatar.iran.liara.run/public/?${randomNumber}`;
    }
    next();
});

const HiddenUser = mongoose.model('HiddenUser', hiddenUserSchema);

module.exports = {
    HiddenUser
  };