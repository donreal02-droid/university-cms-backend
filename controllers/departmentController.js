const Department = require('../models/Department');
const User = require('../models/User');
const Subject = require('../models/Subject');

// @desc    Create department
// @route   POST /api/departments
// @access  Private/Admin
const createDepartment = async (req, res) => {
  try {
    console.log('Received department data:', req.body); // Debug log
    
    const { name, code, faculty, duration, description, headOfDepartment } = req.body;

    // Validation
    if (!name || !code || !faculty) {
      console.log('Missing required fields');
      return res.status(400).json({ 
        message: 'Missing required fields: name, code, and faculty are required' 
      });
    }

    // Check if department exists
    const departmentExists = await Department.findOne({ 
      $or: [{ name }, { code: code.toUpperCase() }] 
    });

    if (departmentExists) {
      return res.status(400).json({ message: 'Department with this name or code already exists' });
    }

    // Prepare department data
    const departmentData = {
      name,
      code: code.toUpperCase(),
      faculty,
      duration: duration || 4,
      description: description || '',
      semesters: Array.from({ length: 8 }, (_, i) => ({
        number: i + 1,
        subjects: []
      }))
    };

    // Only add headOfDepartment if it's a valid ObjectId
    if (headOfDepartment && headOfDepartment !== '' && headOfDepartment !== 'null' && headOfDepartment !== 'undefined') {
      // Check if the teacher exists
      const teacherExists = await User.findById(headOfDepartment);
      if (teacherExists) {
        departmentData.headOfDepartment = headOfDepartment;
      }
    }

    console.log('Creating department with data:', departmentData);

    const department = await Department.create(departmentData);
    console.log('Department created successfully:', department);
    
    res.status(201).json(department);
  } catch (error) {
    console.error('🔥 Create department error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Check for validation errors
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({ 
        message: 'Validation error', 
        errors 
      });
    }
    
    // Check for duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Duplicate key error: Department with this name or code already exists' 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
const getDepartments = async (req, res) => {
  try {
    console.log('Fetching departments...');
    
    const departments = await Department.find({ isActive: true })
      .populate('headOfDepartment', 'name email')
      .populate('semesters.subjects', 'name code credits');

    console.log(`Found ${departments.length} departments`);
    
    // Get counts for each department
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        const studentCount = await User.countDocuments({ 
          department: dept._id, 
          role: 'student' 
        });
        const teacherCount = await User.countDocuments({ 
          department: dept._id, 
          role: 'teacher' 
        });
        
        return {
          ...dept.toObject(),
          totalStudents: studentCount,
          totalTeachers: teacherCount
        };
      })
    );

    res.json(departmentsWithCounts);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all departments (public version for registration)
// @route   GET /api/departments/public
// @access  Public
const getPublicDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .select('name code _id') // Only select needed fields
      .limit(20); // Limit results

    res.json(departments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get department by ID
// @route   GET /api/departments/:id
// @access  Private
const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('headOfDepartment', 'name email')
      .populate('semesters.subjects', 'name code credits teacher');

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Get student count
    const studentCount = await User.countDocuments({ 
      department: department._id, 
      role: 'student',
      isActive: true 
    });

    // Get teacher count
    const teacherCount = await User.countDocuments({ 
      department: department._id, 
      role: 'teacher',
      isActive: true 
    });

    const departmentData = department.toObject();
    departmentData.totalStudents = studentCount;
    departmentData.totalTeachers = teacherCount;

    res.json(departmentData);
  } catch (error) {
    console.error('Get department by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private/Admin
const updateDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (department) {
      department.name = req.body.name || department.name;
      department.code = req.body.code || department.code;
      department.faculty = req.body.faculty || department.faculty;
      department.duration = req.body.duration || department.duration;
      department.description = req.body.description || department.description;
      
      // Handle headOfDepartment update carefully
      if (req.body.headOfDepartment && req.body.headOfDepartment !== '') {
        department.headOfDepartment = req.body.headOfDepartment;
      } else {
        department.headOfDepartment = null; // Remove if empty
      }
      
      department.isActive = req.body.isActive !== undefined ? req.body.isActive : department.isActive;

      const updatedDepartment = await department.save();
      res.json(updatedDepartment);
    } else {
      res.status(404).json({ message: 'Department not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private/Admin
const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (department) {
      // Check if department has any active users or subjects
      const hasUsers = await User.exists({ department: department._id, isActive: true });
      const hasSubjects = await Subject.exists({ department: department._id, isActive: true });

      if (hasUsers || hasSubjects) {
        return res.status(400).json({ 
          message: 'Cannot delete department with active users or subjects. Deactivate it instead.' 
        });
      }

      await department.deleteOne();
      res.json({ message: 'Department removed' });
    } else {
      res.status(404).json({ message: 'Department not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  getPublicDepartments,
  getDepartmentById,  // ✅ ADDED THIS
  updateDepartment,
  deleteDepartment
};