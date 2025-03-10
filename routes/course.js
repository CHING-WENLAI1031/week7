const express = require('express')
const { IsNull } = require('typeorm')

const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Course')
const course = require('../controllers/course')
const appError = require('../utils/appError')
const auth = require('../middlewares/auth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})

//取得課程列表
router.get('/', course.getAllCourses)
//報名課程
router.post('/:courseId', auth, course.postCourseBooking)
//取消課程
router.delete('/:courseId', auth, course.deleteCourseBooking)

module.exports = router