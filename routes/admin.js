const express = require('express')

const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Admin')
const admin = require('../controllers/admin')
const { isUndefined, isNotValidString, isNotValidInteger } = require('../utils/validators');
const appError = require('../utils/appError')
const auth = require('../middlewares/auth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})
const isCoach = require('../middlewares/isCoach')

//新增教練課程
router.post('/coaches/courses',auth, isCoach ,admin.postCourses)
//編輯教練課程
router.put('/coaches/courses/:courseId',auth, isCoach, admin.putCoachCourseDetail)
//使用者變更為教練
router.post('/coaches/:userId', admin.postCoach)

//取得教練自己的課程列表
router.get('/coaches/courses',auth,isCoach,admin.getCoachCourses)
//取得教練自己的課程詳細資料
router.get('/coaches/courses/:courseId',auth,isCoach,admin.getCoachCourseDetail)
//變更教練資料
router.put('/coaches',auth, isCoach, admin.putCoachProfile)

//取得教練自己的詳細資料
router.get('/coaches',auth, isCoach, admin.getCoachProfile)
//取得教練自己的月營收資料
router.get('/coaches/revenue',auth, isCoach, admin.getMonthRevenue)
module.exports = router