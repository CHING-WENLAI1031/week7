const express = require('express')
const { IsNull } = require('typeorm')

const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Course')
const appError = require('../utils/appError')
const auth = require('../middlewares/auth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})

//取得課程列表
async function getAllCourses(req,res,next){
    try {
        const courses = await dataSource.getRepository('Course').find({
          select: {
            id: true,
            name: true,
            description: true,
            start_at: true,
            end_at: true,
            max_participants: true,
            User: {
              name: true
            },
            Skill: {
              name: true
            }
          },
          relations: {
            User: true,
            Skill: true
          }
        })
        res.status(200).json({
          status: 'success',
          data: courses.map((course) => {
            return {
              id: course.id,
              name: course.name,
              description: course.description,
              start_at: course.start_at,
              end_at: course.end_at,
              max_participants: course.max_participants,
              coach_name: course.User.name,
              skill_name: course.Skill.name
            }
          })
        })
      } catch (error) {
        logger.error(error)
        next(error)
      }
}
//報名課程
async function postCourseBooking(req,res,next){
    try {
        const { id } = req.user
        const { courseId } = req.params
        const courseRepo = dataSource.getRepository('Course')
        const course = await courseRepo.findOne({
          where: {
            id: courseId
          }
        })
        if (!course) {
          next(appError(400, config.get('errorMessage').ID_ERROR))
          return
        }
        const creditPurchaseRepo = dataSource.getRepository('CreditPurchase')
        const courseBookingRepo = dataSource.getRepository('CourseBooking')
        const userCourseBooking = await courseBookingRepo.findOne({
          where: {
            user_id: id,
            course_id: courseId
          }
        })
        if (userCourseBooking) {
          next(appError(400, config.get('errorMessage').ALREADY_REGISTERED))
          return
        }
        const userCredit = await creditPurchaseRepo.sum('purchased_credits', {
          user_id: id
        })
        const userUsedCredit = await courseBookingRepo.count({
          where: {
            user_id: id,
            cancelledAt: IsNull()
          }
        })
        const courseBookingCount = await courseBookingRepo.count({
          where: {
            course_id: courseId,
            cancelledAt: IsNull()
          }
        })
        if (userUsedCredit >= userCredit) {
          next(appError(400, config.get('errorMessage').NO_CREDITS))
          return
        } else if (courseBookingCount >= course.max_participants) {
          next(appError(400, config.get('errorMessage').MAX_PARTICIPANTS_REACHED))
          return
        }
        const newCourseBooking = await courseBookingRepo.create({
          user_id: id,
          course_id: courseId
        })
        await courseBookingRepo.save(newCourseBooking)
        res.status(201).json({
          status: 'success',
          data: null
        })
      } catch (error) {
        logger.error(error)
        next(error)
      } 
}
//取消課程
async function deleteCourseBooking(req,res,next){
    try {
        const { id } = req.user
        const { courseId } = req.params
        const courseBookingRepo = dataSource.getRepository('CourseBooking')
        const userCourseBooking = await courseBookingRepo.findOne({
          where: {
            user_id: id,
            course_id: courseId,
            cancelledAt: IsNull()
          }
        })
        if (!userCourseBooking) {
          next(appError(400,config.get('errorMessage').ID_ERROR))
          return
        }
        const updateResult = await courseBookingRepo.update(
          {
            user_id: id,
            course_id: courseId,
            cancelledAt: IsNull()
          },
          {
            cancelledAt: new Date().toISOString()
          }
        )
        if (updateResult.affected === 0) {
          next(appError(400,config.get('errorMessage').CANCEL_FAILED))
          return
        }
        res.status(200).json({
          status: 'success',
          data: null
        })
      } catch (error) {
        logger.error(error)
        next(error)
      }
}

module.exports = {getAllCourses,postCourseBooking,deleteCourseBooking}