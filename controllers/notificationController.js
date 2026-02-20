const Notification = require('../models/Notification');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const query = { recipient: req.user._id };
    
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user._id, 
      read: false 
    });

    res.json({
      notifications,
      total,
      unreadCount,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { 
        read: true, 
        readAt: new Date() 
      }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create notification (internal use)
const createNotification = async (recipientId, type, title, message, link = null, data = {}) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      link,
      data
    });
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};

// @desc    Create assignment notification
const notifyAssignmentCreated = async (assignment) => {
  try {
    // Find all students in the subject's department and semester
    const students = await User.find({
      role: 'student',
      department: assignment.subject.department,
      semester: assignment.subject.semester
    });

    const notifications = [];
    for (const student of students) {
      const notification = await createNotification(
        student._id,
        'assignment',
        'New Assignment',
        `New assignment: ${assignment.title} is due on ${new Date(assignment.deadline).toLocaleDateString()}`,
        `/student/assignments/${assignment._id}`,
        { assignmentId: assignment._id }
      );
      if (notification) notifications.push(notification);
    }
    return notifications;
  } catch (error) {
    console.error('Notify assignment created error:', error);
    return [];
  }
};

// @desc    Create quiz notification
const notifyQuizAvailable = async (quiz) => {
  try {
    const students = await User.find({
      role: 'student',
      department: quiz.subject.department,
      semester: quiz.subject.semester
    });

    const notifications = [];
    for (const student of students) {
      const notification = await createNotification(
        student._id,
        'quiz',
        'New Quiz Available',
        `Quiz: ${quiz.title} is now available. Duration: ${quiz.duration} minutes`,
        `/student/quiz/${quiz._id}`,
        { quizId: quiz._id }
      );
      if (notification) notifications.push(notification);
    }
    return notifications;
  } catch (error) {
    console.error('Notify quiz available error:', error);
    return [];
  }
};

// @desc    Create grade notification
const notifyGradePublished = async (submission) => {
  try {
    const notification = await createNotification(
      submission.student,
      'grade',
      'Assignment Graded',
      `Your assignment "${submission.assignment.title}" has been graded. Score: ${submission.marks}/${submission.assignment.maxMarks}`,
      `/student/assignments/${submission.assignment._id}`,
      { submissionId: submission._id, assignmentId: submission.assignment._id }
    );
    return notification;
  } catch (error) {
    console.error('Notify grade published error:', error);
    return null;
  }
};

// @desc    Create submission notification for teacher
const notifySubmissionReceived = async (submission) => {
  try {
    const notification = await createNotification(
      submission.assignment.teacher,
      'submission',
      'New Submission',
      `${submission.student.name} has submitted "${submission.assignment.title}"`,
      `/teacher/submissions/${submission._id}`,
      { submissionId: submission._id, assignmentId: submission.assignment._id }
    );
    return notification;
  } catch (error) {
    console.error('Notify submission received error:', error);
    return null;
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  notifyAssignmentCreated,
  notifyQuizAvailable,
  notifyGradePublished,
  notifySubmissionReceived
};