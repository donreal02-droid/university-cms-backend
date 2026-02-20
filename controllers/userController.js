const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const role = req.query.role;
    const department = req.query.department;

    let query = {};
    if (role) query.role = role;
    if (department) query.department = department;

    const users = await User.find(query)
      .select('-password')
      .populate('department', 'name code')
      .skip(skip)
      .limit(limit)
      .sort('-createdAt');

    const total = await User.countDocuments(query);

    res.json({
      users,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('department', 'name code');

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    console.log('🔵 UPDATE REQUEST RECEIVED');
    console.log('🔵 User ID:', req.params.id);
    console.log('🔵 Request body:', req.body);
    
    const user = await User.findById(req.params.id);

    if (user) {
      console.log('🔵 User found:', user.email);
      console.log('🔵 Current profileImage:', user.profileImage);
      console.log('🔵 New profileImage from request:', req.body.profileImage);

      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.role = req.body.role || user.role;
      user.department = req.body.department || user.department;
      user.semester = req.body.semester || user.semester;
      user.phone = req.body.phone || user.phone;
      user.address = req.body.address || user.address;
      user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;
      
      // Explicitly set profileImage - don't use || operator which might skip empty strings
      if (req.body.profileImage !== undefined) {
        user.profileImage = req.body.profileImage;
        console.log('🔵 Setting profileImage to:', user.profileImage);
      }

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();
      console.log('🔵 User saved successfully');
      console.log('🔵 Saved profileImage:', updatedUser.profileImage);

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        department: updatedUser.department,
        semester: updatedUser.semester,
        isActive: updatedUser.isActive,
        profileImage: updatedUser.profileImage
      });
    } else {
      console.log('🔴 User not found');
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('🔴 Error in updateUser:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      await user.deleteOne();
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser
};