const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');

// Simple auth middleware (same behavior as in indexRoutes)
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) return res.redirect('/login');
  next();
}

// List + search stories
router.get('/', requireAuth, blogController.listStories);

// New story
router.get('/new', requireAuth, blogController.showNewForm);
router.post('/', requireAuth, blogController.createStory);

// Single story view
router.get('/:id', requireAuth, blogController.showStory);

// Edit + update + delete (author only enforced in controller)
router.get('/:id/edit', requireAuth, blogController.showEditForm);
router.post('/:id/edit', requireAuth, blogController.updateStory);
router.post('/:id/delete', requireAuth, blogController.deleteStory);

// Likes + saves
router.post('/:id/like', requireAuth, blogController.toggleLike);
router.post('/:id/save', requireAuth, blogController.toggleSave);

// Comments
router.post('/:id/comments', requireAuth, blogController.addComment);
router.post('/:storyId/comments/:commentId/like', requireAuth, blogController.toggleCommentLike);
router.post('/:storyId/comments/:commentId/edit', requireAuth, blogController.updateComment);
router.post('/:storyId/comments/:commentId/delete', requireAuth, blogController.deleteComment);

module.exports = router;
