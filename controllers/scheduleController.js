const User = require('../models/User');
const Subject = require('../models/Subject');

// @desc    Get student schedule
// @route   GET /api/schedule/student
// @access  Private/Student
const getStudentSchedule = async (req, res) => {
  try {
    const student = await User.findById(req.user._id).populate('department');

    if (!student.department) {
      return res.json([]); // Return empty array if no department
    }

    // Get subjects for student's department and semester
    const subjects = await Subject.find({
      department: student.department._id,
      semester: student.semester
    }).populate('teacher', 'name');

    // This is a placeholder - in a real app, you'd have a Schedule model
    // For now, generate a sample schedule based on subjects
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = [
      { start: '09:00', end: '10:30' },
      { start: '11:00', end: '12:30' },
      { start: '14:00', end: '15:30' }
    ];
    
    const rooms = ['LH-101', 'LH-203', 'Lab-3', 'LH-105', 'LH-208', 'LH-112'];

    const schedule = [];
    
    subjects.forEach((subject, index) => {
      // Assign each subject to a random day and time slot
      const dayIndex = index % days.length;
      const timeIndex = Math.floor(index / days.length) % timeSlots.length;
      
      schedule.push({
        subject: subject.name,
        teacher: subject.teacher?.name || 'TBA',
        room: rooms[index % rooms.length],
        day: days[dayIndex],
        startTime: timeSlots[timeIndex].start,
        endTime: timeSlots[timeIndex].end
      });
    });

    // Sort by day and time
    const dayOrder = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    schedule.sort((a, b) => {
      if (dayOrder[a.day] !== dayOrder[b.day]) {
        return dayOrder[a.day] - dayOrder[b.day];
      }
      return a.startTime.localeCompare(b.startTime);
    });

    res.json(schedule);
  } catch (error) {
    console.error('Get student schedule error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getStudentSchedule
};