const express = require('express');
const router = express.Router();
const {
  createDepartment,
  getDepartments,
  getPublicDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');

// Public route - NO authentication required
router.get('/public', getPublicDepartments);

// Protected routes - require authentication
router.use(protect);

router.route('/')
  .get(getDepartments)
  .post(authorize('admin'), createDepartment);

router.route('/:id')
  .get(getDepartmentById)  // Fixed: removed '/public'
  .put(authorize('admin'), updateDepartment)
  .delete(authorize('admin'), deleteDepartment);

module.exports = router;