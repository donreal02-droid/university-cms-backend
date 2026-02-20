import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Department from './models/Department.js';

dotenv.config();

const createTestUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if department exists, if not create one
    let dept = await Department.findOne({ code: 'CS' });
    if (!dept) {
      dept = await Department.create({
        name: 'Computer Science',
        code: 'CS',
        description: 'Computer Science Department'
      });
      console.log('✅ Created department:', dept.name);
    }

    // Delete existing user if any
    await User.deleteOne({ email: 'teacher@university.edu' });
    console.log('✅ Removed existing user');

    // Create new user
    const user = await User.create({
      name: 'Test Teacher',
      email: 'teacher@university.edu',
      password: 'password123',
      role: 'teacher',
      department: dept._id
    });

    console.log('✅ User created successfully!');
    console.log('📧 Email:', user.email);
    console.log('🔑 Password: password123');
    console.log('🆔 User ID:', user._id);

    // Verify password works
    const verifyUser = await User.findOne({ email: 'teacher@university.edu' }).select('+password');
    const isMatch = await verifyUser.comparePassword('password123');
    console.log('🔐 Password verification:', isMatch ? '✅ Works' : '❌ Failed');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createTestUser();