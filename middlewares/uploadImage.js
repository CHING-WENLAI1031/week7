const multer = require('multer')
const path = require('path')
const appError = require('../utils/appError');

const MAX_FILE_SIZE = 2*1024*1024 //2MB
const ALLOWED_FILE_TYPES = ['.jpg','.jpeg','.png']; // 格式支援 jpg、jpeg、png

const upload = multer({
  // 限制最大檔案容量
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  // 限制上傳圖片檔案類型
  fileFilter(req, file, cb) {
    // path.extname() 取得副檔名
    const ext = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_FILE_TYPES.includes(ext)) {
      // return cb(new Error(`檔案格式錯誤，僅限上傳 ${ALLOWED_FILE_TYPES.join(", ")} 格式。`));
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE'));
    }
    cb(null, true);
  },
}).any();

module.exports = (req, res, next) => {
  // multer 本身是 middleware, 將錯誤統一給 next() 處理
  upload(req, res, (err) => {
    if (err) {
        if (err instanceof multer.MulterError) {
            switch (err.code) {
              case 'LIMIT_FILE_SIZE':
                return next(appError(400, '檔案大小超過 2MB 限制'));
              case 'LIMIT_UNEXPECTED_FILE':
                // return next(appError(400, err.message); 
                return next(appError(400, `檔案格式錯誤，僅限上傳  ${ALLOWED_FILE_TYPES.join(", ")} 格式`)); 
              default:
                return next(appError(500, '上傳檔案時發生錯誤'));
            }
          }
          return next(appError(500, err.message || '上傳檔案時發生錯誤'));
    }
    next();
  });
};