const express = require('express')

const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Upload')
const auth = require('../middlewares/auth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})


// firebase
const firebaseAdmin = require('firebase-admin')
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(config.get('secret.firebase.serviceAccount')),
  storageBucket: config.get('secret.firebase.storageBucket')
})
const bucket = firebaseAdmin.storage().bucket()

//檔案上傳
const formidable = require('formidable')
const appError = require('../utils/appError')
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_FILE_TYPES = {
  'image/jpeg': true,
  'image/png': true
}

const router = express.Router()
async function postUploadImage (req, res, next) {
    try {
      if(req.files){
        return next(appError(400,"欄位未填寫正確"))
      }
      const form = formidable.formidable({
        multiple: false,
        maxFileSize: MAX_FILE_SIZE,
        filter: ({ mimetype }) => {
          return !!ALLOWED_FILE_TYPES[mimetype]
        }
      })
      const [fields, files] = await form.parse(req)
  
      logger.info('files')
      logger.info(files)
      logger.info('fields')
      logger.info(fields)
      //取第一個檔案
      const filePath = files.file[0].filepath
      const remoteFilePath = `images/${new Date().toISOString()}-${files.file[0].originalFilename}`
      await bucket.upload(filePath, { destination: remoteFilePath })
      const options = {
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000
      }
      const [imageUrl] = await bucket.file(remoteFilePath).getSignedUrl(options)
      logger.info(imageUrl)
      res.status(200).json({
        status: 'success',
        data: {
          image_url: imageUrl
        }
      })
    } catch (error) {
      logger.error(error)
      next(error)
    }
  }

async function getAllImages (req, res, next) {
    // 取得檔案列表
    const [files] = await bucket.getFiles({ prefix: 'images/' })
    // const imageList = files.map(file => file.name)
    
    // 設定檔案的存取權限
    //2500 -12-31
    const config = {
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000
    };
  
    // 取得圖片名稱與下載連結
    const imageList = await Promise.all(
      files.map(async file => ({
        name: file.name,
        url: (await file.getSignedUrl(config))[0],
      }))
    );
      
    res.status(200).json({
      status: 'success',
      data: {
        image_list: imageList
      }
    })
  }
module.exports = {
    postUploadImage,getAllImages
}