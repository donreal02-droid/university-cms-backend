const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = ['uploads/notes', 'uploads/assignments', 'uploads/submissions', 'uploads/profiles'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    if (file.fieldname === 'profile') {
      uploadPath += 'profiles/';
    } else if (file.fieldname === 'note') {
      uploadPath += 'notes/';
    } else if (file.fieldname === 'assignment') {
      uploadPath += 'assignments/';
    } else if (file.fieldname === 'submission') {
      uploadPath += 'submissions/';
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Create a clean filename with user ID and timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `profile-${req.user?._id || 'user'}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|ppt|pptx|txt|jpg|jpeg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, PPT, PPTX, TXT, and image files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload;