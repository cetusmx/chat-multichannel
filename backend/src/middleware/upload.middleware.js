const multer = require('multer');

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// Validate file type (only PDF and CSV)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf', 'text/csv', 'application/csv', 'application/vnd.ms-excel'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and CSV are allowed.'), false);
  }
};

// Create upload instance with 5MB limit
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});

module.exports = upload;
