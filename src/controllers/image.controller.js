const mongoose = require('mongoose');
const Image = require('../models/Image');
const Comment = require('../models/Comment');
const Rating = require('../models/Rating');
const Notification = require('../models/Notification');
const { uploadImage } = require('../services/image.service');
const { getCachedValue, setCachedValue, clearByPattern } = require('../services/cache.service');
const buildPagination = require('../utils/pagination');

function normalizePeople(people) {
  if (!people) {
    return [];
  }

  if (Array.isArray(people)) {
    return people.map((name) => String(name).trim()).filter(Boolean);
  }

  return String(people)
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

async function upload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const uploadResult = await uploadImage(req.file.buffer, req.file.originalname);

    const image = await Image.create({
      title: req.body.title,
      caption: req.body.caption,
      location: req.body.location,
      people: normalizePeople(req.body.people),
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      creatorId: req.user._id
    });

    // Populate creatorId for the response
    await image.populate('creatorId', 'username email role');

    await clearByPattern('images:*');
    await clearByPattern('search:*');

    return res.status(201).json({
      message: 'Image uploaded successfully',
      image
    });
  } catch (error) {
    return next(error);
  }
}

async function listImages(req, res, next) {
  try {
    const { page, limit } = req.query;
    const { creatorId } = req.query;
    const pagination = buildPagination(page, limit);

    const cacheKey = `images:${pagination.page}:${pagination.limit}:${creatorId || 'all'}`;
    const cachedPayload = await getCachedValue(cacheKey);

    if (cachedPayload) {
      return res.status(200).json(cachedPayload);
    }

    const filter = {};
    if (creatorId) {
      if (!mongoose.isValidObjectId(creatorId)) {
        return res.status(400).json({ message: 'Invalid creator id' });
      }

      filter.creatorId = creatorId;
    }

    const [images, total] = await Promise.all([
      Image.find(filter)
        .populate('creatorId', 'username email role')
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Image.countDocuments(filter)
    ]);

    const payload = {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      data: images
    };

    await setCachedValue(cacheKey, payload, 90);

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
}

async function getImageById(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid image id' });
    }

    const image = await Image.findById(id).populate('creatorId', 'username email role');

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const [comments, ratings] = await Promise.all([
      Comment.find({ imageId: id })
        .populate('userId', 'username')
        .sort({ createdAt: -1 })
        .limit(20),
      Rating.find({ imageId: id }).populate('userId', 'username')
    ]);

    return res.status(200).json({
      ...image.toObject(),
      comments,
      ratings
    });
  } catch (error) {
    return next(error);
  }
}

async function addComment(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid image id' });
    }

    const image = await Image.findById(id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const comment = await Comment.create({
      imageId: id,
      userId: req.user._id,
      text: req.body.text
    });

    image.commentCount += 1;
    await image.save();

    await clearByPattern('images:*');
    await clearByPattern('search:*');

    // Create notification for image owner
    await Notification.createCommentNotification(
      image._id,
      req.user._id,
      image.creatorId,
      req.body.text
    );

    const populatedComment = await Comment.findById(comment._id).populate('userId', 'username');

    return res.status(201).json({
      message: 'Comment added successfully',
      comment: populatedComment
    });
  } catch (error) {
    return next(error);
  }
}

async function addRating(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid image id' });
    }

    const image = await Image.findById(id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const { rating } = req.body;

    await Rating.findOneAndUpdate(
      { imageId: id, userId: req.user._id },
      { rating },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const stats = await Rating.aggregate([
      { $match: { imageId: image._id } },
      {
        $group: {
          _id: '$imageId',
          averageRating: { $avg: '$rating' },
          ratingCount: { $sum: 1 }
        }
      }
    ]);

    image.averageRating = stats[0]?.averageRating || 0;
    image.ratingCount = stats[0]?.ratingCount || 0;
    await image.save();

    await clearByPattern('images:*');
    await clearByPattern('search:*');

    // Create notification for image owner (only on first rating)
    if (rating.isNew) {
      await Notification.createLikeNotification(
        image._id,
        req.user._id,
        image.creatorId
      );
    }

    return res.status(200).json({
      message: 'Rating submitted successfully',
      averageRating: Number(image.averageRating.toFixed(1)),
      ratingCount: image.ratingCount
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You have already rated this image' });
    }

    return next(error);
  }
}

async function searchImages(req, res, next) {
  try {
    const searchQuery = String(req.query.q || '').trim();

    if (!searchQuery) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const cacheKey = `search:${searchQuery.toLowerCase()}`;
    const cachedPayload = await getCachedValue(cacheKey);

    if (cachedPayload) {
      return res.status(200).json(cachedPayload);
    }

    const images = await Image.find({
      $or: [
        { title: { $regex: searchQuery, $options: 'i' } },
        { caption: { $regex: searchQuery, $options: 'i' } }
      ]
    })
      .populate('creatorId', 'username email role')
      .sort({ createdAt: -1 })
      .limit(20);

    const payload = {
      query: searchQuery,
      count: images.length,
      data: images
    };

    await setCachedValue(cacheKey, payload, 120);

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  upload,
  listImages,
  getImageById,
  addComment,
  addRating,
  searchImages
};
