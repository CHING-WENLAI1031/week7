const express = require('express')
const bcrypt = require('bcrypt')

const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Users')
const users = require('../controllers/user')
const appError = require('../utils/appError')
const { isUndefined, isNotValidString, isNotValidInteger } = require('../utils/validators');
const generateJWT = require('../utils/generateJWT')
const auth = require('../middlewares/auth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})
const saltRounds = process.env.SALT_ROUNDS || 10

//註冊使用者
router.post('/signup',users.signUp)
//使用者登入
router.post('/login', users.login)
//取得個人資料
router.get('/profile', auth, users.getProfile)
//編輯個人資料
router.put('/profile', auth, users.putProfile)
//變更密碼
router.put('/password',auth,users.putPassword)
//取得使用者已購買的方案列表
router.get('/credit-package',auth,users.getCreditPackage)
//取得使用者已預約的課程列表
router.get('/courses',auth,users.getCourseBooking)



module.exports = router