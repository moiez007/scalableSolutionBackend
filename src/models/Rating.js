const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    imageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    }
  },
  {
    timestamps: true
  }
);

ratingSchema.index({ imageId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);
