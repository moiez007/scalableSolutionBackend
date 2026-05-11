const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    location: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ''
    },
    people: {
      type: [String],
      default: []
    },
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    averageRating: {
      type: Number,
      default: 0
    },
    ratingCount: {
      type: Number,
      default: 0
    },
    commentCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

imageSchema.index({ title: 'text', caption: 'text' });
imageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Image', imageSchema);
