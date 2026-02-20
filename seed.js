const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/university_management');
    
    // Clear existing users
    await User.deleteMany({});
    
    // Create admin
    await User.create({
      name: 'Admin User',
      email: 'admin@university.com',
      password: 'admin123',
      role: 'admin',
      isActive: true
    });
    
    // Create teacher
    await User.create({
      name: 'Teacher User',
      email: 'teacher@university.com',
      password: 'teacher123',
      role: 'teacher',
      isActive: true
    });
    
    // Create student
    await User.create({
      name: 'Student User',
      email: 'student@university.com',
      password: 'student123',
      role: 'student',
      enrollmentNumber: 'ENR001',
      semester: 3,
      isActive: true
    });
    
    console.log('✅ Test users created successfully!');
    console.log('Admin: admin@university.com / admin123');
    console.log('Teacher: teacher@university.com / teacher123');
    console.log('Student: student@university.com / student123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

seedDatabase();