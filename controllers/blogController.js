const Story = require('../models/Story');
const BlogComment = require('../models/BlogComment');
const User = require('../models/User');

function getUserId(req) {
  return req.session && req.session.userId ? req.session.userId : null;
}

exports.listStories = async (req, res) => {
  try {
    const userId = getUserId(req);
    const q = String(req.query.q || '').trim();

    const filter = {};
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { title: re },
        { urduText: re },
        { englishSummary: re },
        { tags: re }
      ];
    }

    const stories = await Story.find(filter)
      .populate('author', 'username avatarUrl')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const enhanced = stories.map((s) => {
      const idStr = String(userId || '');
      const liked = Array.isArray(s.likes) && s.likes.some((u) => String(u) === idStr);
      const saved = Array.isArray(s.savedBy) && s.savedBy.some((u) => String(u) === idStr);
      const isAuthor = idStr && String(s.author?._id || s.author) === idStr;
      return { ...s, liked, saved, isAuthor };
    });

    res.render('blog-index', {
      user: userId ? await User.findById(userId) : null,
      stories: enhanced,
      q
    });
  } catch (error) {
    console.error('Error loading blog list:', error);
    res.status(500).send('Error loading stories');
  }
};

exports.showNewForm = async (req, res) => {
  try {
    const user = await User.findById(getUserId(req));
    res.render('blog-form', { user, story: null, action: 'create' });
  } catch (error) {
    res.status(500).send('Error loading form');
  }
};

exports.createStory = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { title, urduText, englishSummary, tags } = req.body;

    const story = new Story({
      title: (title || '').toString().trim(),
      urduText: (urduText || '').toString().trim(),
      englishSummary: (englishSummary || '').toString().trim() || undefined,
      tags: (tags || '')
        .toString()
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      author: userId
    });

    await story.save();
    res.redirect(`/blog/${story._id}`);
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).send('Error creating story');
  }
};

exports.showStory = async (req, res) => {
  try {
    const userId = getUserId(req);
    const story = await Story.findById(req.params.id)
      .populate('author', 'username avatarUrl')
      .lean();
    if (!story) return res.redirect('/blog');

    const rawComments = await BlogComment.find({ story: story._id })
      .populate('author', 'username avatarUrl')
      .sort({ createdAt: 1 })
      .lean();

    const idStr = String(userId || '');

    // Enrich comments with ownership/like metadata and build a simple reply tree (one level)
    const byId = new Map();
    (rawComments || []).forEach((c) => {
      const cId = String(c._id);
      const authorId = c.author && c.author._id ? String(c.author._id) : String(c.author || '');
      const likes = Array.isArray(c.likes) ? c.likes : [];
      const likedByUser = likes.some((u) => String(u) === idStr);

      byId.set(cId, {
        ...c,
        isOwner: authorId && authorId === idStr,
        liked: likedByUser,
        likesCount: likes.length,
        replies: []
      });
    });

    const roots = [];
    byId.forEach((c) => {
      if (c.parentComment) {
        const parent = byId.get(String(c.parentComment));
        if (parent) parent.replies.push(c);
        else roots.push(c);
      } else {
        roots.push(c);
      }
    });

    const liked = Array.isArray(story.likes) && story.likes.some((u) => String(u) === idStr);
    const saved = Array.isArray(story.savedBy) && story.savedBy.some((u) => String(u) === idStr);
    const isAuthor = idStr && String(story.author?._id || story.author) === idStr;

    const user = userId ? await User.findById(userId) : null;

    res.render('blog-show', {
      user,
      story: { ...story, liked, saved, isAuthor },
      comments: roots
    });
  } catch (error) {
    console.error('Error loading story:', error);
    res.status(500).send('Error loading story');
  }
};

exports.showEditForm = async (req, res) => {
  try {
    const userId = getUserId(req);
    const story = await Story.findById(req.params.id).lean();
    if (!story) return res.redirect('/blog');
    if (String(story.author) !== String(userId)) {
      return res.status(403).send('Only the author can edit this story');
    }

    const user = await User.findById(userId);
    res.render('blog-form', { user, story, action: 'edit' });
  } catch (error) {
    res.status(500).send('Error loading edit form');
  }
};

exports.updateStory = async (req, res) => {
  try {
    const userId = getUserId(req);
    const story = await Story.findById(req.params.id);
    if (!story) return res.redirect('/blog');
    if (String(story.author) !== String(userId)) {
      return res.status(403).send('Only the author can edit this story');
    }

    const { title, urduText, englishSummary, tags } = req.body;
    story.title = (title || '').toString().trim();
    story.urduText = (urduText || '').toString().trim();
    story.englishSummary = (englishSummary || '').toString().trim() || undefined;
    story.tags = (tags || '')
      .toString()
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    await story.save();
    res.redirect(`/blog/${story._id}`);
  } catch (error) {
    console.error('Error updating story:', error);
    res.status(500).send('Error updating story');
  }
};

exports.deleteStory = async (req, res) => {
  try {
    const userId = getUserId(req);
    const story = await Story.findById(req.params.id);
    if (!story) return res.redirect('/blog');
    if (String(story.author) !== String(userId)) {
      return res.status(403).send('Only the author can delete this story');
    }

    await BlogComment.deleteMany({ story: story._id });
    await story.deleteOne();
    res.redirect('/blog');
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).send('Error deleting story');
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const userId = getUserId(req);
    const story = await Story.findById(req.params.id);
    if (!story) return res.redirect('/blog');

    const idStr = String(userId);
    const hasLiked = story.likes.some((u) => String(u) === idStr);
    if (hasLiked) {
      story.likes = story.likes.filter((u) => String(u) !== idStr);
    } else {
      story.likes.push(userId);
    }

    await story.save();
    res.redirect('back');
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).send('Error updating like');
  }
};

exports.toggleSave = async (req, res) => {
  try {
    const userId = getUserId(req);
    const story = await Story.findById(req.params.id);
    if (!story) return res.redirect('/blog');

    const idStr = String(userId);
    const hasSaved = story.savedBy.some((u) => String(u) === idStr);
    if (hasSaved) {
      story.savedBy = story.savedBy.filter((u) => String(u) !== idStr);
    } else {
      story.savedBy.push(userId);
    }

    await story.save();
    res.redirect('back');
  } catch (error) {
    console.error('Error toggling save:', error);
    res.status(500).send('Error updating saved stories');
  }
};

exports.addComment = async (req, res) => {
  try {
    const userId = getUserId(req);
    const story = await Story.findById(req.params.id);
    if (!story) return res.redirect('/blog');

    const text = (req.body.text || '').toString().trim();
    const parentId = (req.body.parentId || '').toString().trim();
    if (!text) return res.redirect(`/blog/${story._id}#comments`);

    let parentComment = null;
    if (parentId) {
      const parent = await BlogComment.findOne({ _id: parentId, story: story._id });
      if (parent) parentComment = parent._id;
    }

    await BlogComment.create({
      story: story._id,
      author: userId,
      text,
      parentComment: parentComment || null
    });

    res.redirect(`/blog/${story._id}#comments`);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).send('Error adding comment');
  }
};

exports.toggleCommentLike = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { storyId, commentId } = req.params;
    if (!userId) return res.redirect('/login');

    const comment = await BlogComment.findOne({ _id: commentId, story: storyId });
    if (!comment) return res.redirect(`/blog/${storyId}#comments`);

    const idStr = String(userId);
    const likes = Array.isArray(comment.likes) ? comment.likes.map((u) => String(u)) : [];
    const hasLiked = likes.includes(idStr);

    if (hasLiked) {
      comment.likes = comment.likes.filter((u) => String(u) !== idStr);
    } else {
      comment.likes.push(userId);
    }

    await comment.save();
    res.redirect(`/blog/${storyId}#comments`);
  } catch (error) {
    console.error('Error toggling comment like:', error);
    res.status(500).send('Error updating comment like');
  }
};

exports.updateComment = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { storyId, commentId } = req.params;
    const text = (req.body.text || '').toString().trim();

    if (!text) return res.redirect(`/blog/${storyId}#comments`);

    const comment = await BlogComment.findOne({ _id: commentId, story: storyId });
    if (!comment) return res.redirect(`/blog/${storyId}#comments`);
    if (String(comment.author) !== String(userId)) {
      return res.status(403).send('Only the author can edit this comment');
    }

    comment.text = text;
    await comment.save();

    res.redirect(`/blog/${storyId}#comments`);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).send('Error updating comment');
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { storyId, commentId } = req.params;

    const comment = await BlogComment.findOne({ _id: commentId, story: storyId });
    if (!comment) return res.redirect(`/blog/${storyId}#comments`);
    if (String(comment.author) !== String(userId)) {
      return res.status(403).send('Only the author can delete this comment');
    }

    // Delete this comment and any direct replies
    await BlogComment.deleteMany({
      $or: [
        { _id: comment._id },
        { parentComment: comment._id }
      ]
    });

    res.redirect(`/blog/${storyId}#comments`);
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).send('Error deleting comment');
  }
};
