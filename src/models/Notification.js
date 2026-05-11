const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['like', 'comment'],
    index: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  relatedImageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image'
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Index for better query performance
notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });

// Static methods for creating notifications
notificationSchema.statics.createLikeNotification = async function (imageId, likerId, imageOwnerId) {
  // Don't create notification if user likes their own image
  if (likerId.toString() === imageOwnerId.toString()) {
    return null;
  }

  return this.create({
    recipientId: imageOwnerId,
    senderId: likerId,
    type: 'like',
    message: 'Someone liked your photo',
    relatedImageId: imageId
  });
};

notificationSchema.statics.createCommentNotification = async function (imageId, commenterId, imageOwnerId, commentText) {
  // Don't create notification if user comments on their own image
  if (commenterId.toString() === imageOwnerId.toString()) {
    return null;
  }

  return this.create({
    recipientId: imageOwnerId,
    senderId: commenterId,
    type: 'comment',
    message: `Someone commented: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
    relatedImageId: imageId
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
