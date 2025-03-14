import express from 'express';

const router = express.Router();

// Placeholder route - will implement actual story functionality later
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Story routes are working',
    data: []
  });
});

export default router;