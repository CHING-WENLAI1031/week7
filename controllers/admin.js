const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const express = require('express')

const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('AdminController')
const { isUndefined, isNotValidString, isNotValidInteger,validateFields } = require('../utils/validators');
const appError = require('../utils/appError')
const monthMap = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12
}


//新增教練課程
async function postCourses(req,res,next){
    try {
        const {
          user_id: userId, skill_id: skillId, name, description, start_at: startAt, end_at: endAt,
          max_participants: maxParticipants, meeting_url: meetingUrl
        } = req.body
        const validationError = validateFields({userId, skillId, name, description, startAt, endAt,meetingUrl})
        if (validationError) {
          return next(appError(400, validationError))
        }
        if (isUndefined(maxParticipants) || isNotValidInteger(maxParticipants) || !meetingUrl.startsWith('https')) {
          logger.warn('欄位未填寫正確')
          next(appError(400, config.get('errorMessage').FIELD_NOT_CORRECT))
          return 
        }
        const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/
        if(!datePattern.test(startAt)||!datePattern.test(endAt)){
          next(appError(400,config.get('errorMessage').DATEFORM_ERROR))
          return
        }
        
        const userRepository = dataSource.getRepository('User')
        const existingUser = await userRepository.findOne({
          select: ['id', 'name', 'role'],
          where: { id: userId }
        })
        if (!existingUser) {
          logger.warn('使用者不存在')
          next(appError(400,config.get('errorMessage').USER_NOT_FOUND))
          return
        } else if (existingUser.role !== 'COACH') {
          logger.warn('使用者尚未成為教練')
          next(appError(400,config.get('errorMessage').USER_ISNOT_COACH))
          return
        }
        const courseRepo = dataSource.getRepository('Course')
        const newCourse = courseRepo.create({
          user_id: userId,
          skill_id: skillId,
          name,
          description,
          start_at: startAt,
          end_at: endAt,
          max_participants: maxParticipants,
          meeting_url: meetingUrl
        })
        const savedCourse = await courseRepo.save(newCourse)
        const course = await courseRepo.findOne({
          where: { id: savedCourse.id }
        })
        res.status(201).json({
          status: 'success',
          data: {
            course
          }
        })
        } catch (error) {
        logger.error(error)
        next(error) 
        }
}
//編輯教練課程
async function putCoachCourseDetail(req,res,next){
    try {
        const { courseId } = req.params
        const {
          skill_id: skillId, name, description, start_at: startAt, end_at: endAt,
          max_participants: maxParticipants, meeting_url: meetingUrl
        } = req.body
        const validationError = validateFields({courseId, skillId, name, description, startAt, endAt,meetingUrl})
        if (validationError) {
          return next(appError(400, validationError))
        }
        if (
          isUndefined(maxParticipants) || isNotValidInteger(maxParticipants) || !meetingUrl.startsWith('https')) {
          logger.warn('欄位未填寫正確')
          next(appError(400, config.get('errorMessage').FIELD_NOT_CORRECT))
          return
        }
        const courseRepo = dataSource.getRepository('Course')
        const existingCourse = await courseRepo.findOneBy({
          id: courseId 
        })
        if (!existingCourse) {
          logger.warn('課程不存在')
          next(appError(400, config.get('errorMessage').COURSE_NOT_FOUND))
          return
        }
        const updateCourse = await courseRepo.update({
          id: courseId
        }, {
          skill_id: skillId,
          name,
          description,
          start_at: startAt,
          end_at: endAt,
          max_participants: maxParticipants,
          meeting_url: meetingUrl
        })
        if (updateCourse.affected === 0) {
          logger.warn('更新課程失敗')
          next(appError(400, config.get('errorMessage').UPDATE_COURSE_FAILED))
          return
        }
        const savedCourse = await courseRepo.findOneBy({
          id: courseId 
        })
        res.status(200).json({
          status: 'success',
          data: {
            course: savedCourse
          }
        })
        } catch (error) {
        logger.error(error)
        next(error)
        }
}
//使用者變更為教練
async function postCoach(req,res,next){
    try {
        const { userId } = req.params
        const { experience_years: experienceYears, description, profile_image_url: profileImageUrl = null } = req.body
        
        const validationError = validateFields({ description, meetingUrl})
        if (validationError) {
          return next(appError(400, validationError))
        }
        if (isUndefined(experienceYears) || isNotValidInteger(experienceYears)) {
          logger.warn('欄位未填寫正確')
          next(appError(400,config.get('errorMessage').FIELD_NOT_CORRECT))
          return
        }
        if (profileImageUrl && !isNotValidString(profileImageUrl) && !profileImageUrl.startsWith('https')) {
          logger.warn('大頭貼網址錯誤')
          next(appError(400, config.get('errorMessage').PROFILE_URL_ERROR))
          return
        }
        const userRepository = dataSource.getRepository('User')
        const existingUser = await userRepository.findOne({
          select: {id:true, name:true, role:true},
          where: { id: userId }
        })
        if (!existingUser) {
          logger.warn('使用者不存在')
          next(appError(400, config.get('errorMessage').USER_NOT_FOUND))
          return
        } else if (existingUser.role === 'COACH') {
          logger.warn('使用者已經是教練')
          next(appError(409, config.get('errorMessage').USER_ALREADY_COACH))
          return
        }
        const coachRepo = dataSource.getRepository('Coach')
        const newCoach = coachRepo.create({
          user_id: userId,
          experience_years: experienceYears,
          description,
          profile_image_url: profileImageUrl
        })

        //week6助教回饋新增：
        await dataSource.transaction(async transactionalEntityManager => { 
            await transactionalEntityManager.update('User', { id: userId }, { role: 'COACH' }) 
            if (updatedUser.affected === 0) {
                logger.warn('更新使用者失敗')
                next(appError(400,config.get('errorMessage').UPDATE_USERPROFILE_ERROR))
                return
            }
            await transactionalEntityManager.save('Coach', newCoach) 
        })
        const savedUser = await userRepository.findOne({
          select: ['name', 'role'],
          where: { id: userId }
        })
        res.status(201).json({
          status: 'success',
          data: {
            user: savedUser,
            coach: savedCoach
          }
        })
        } catch (error) {
        logger.error(error)
        next(error)
        }
}

//取得教練自己的課程列表 參考老師做法
async function getCoachCourses(req,res,next){
    try{
        const { id } = req.user
        const courseRepo = dataSource.getRepository('Course')
        const courses = await courseRepo.find({
          select:["id","name","start_at","end_at","max_participants"],
          where: {user_id:id}
        })
        const courseIds = courses.map((course) => course.id)
        const coursesParticipant = await dataSource.getRepository('CourseBooking')
                                  .createQueryBuilder('course_booking')
                                  .select('course_id')
                                  .addSelect('COUNT(course_id)','count')
                                  .where('course_id IN (:...courseIds)',{courseIds})
                                  .andWhere('cancelled_at is null')
                                  .groupBy('course_id')
                                  .getRawMany()
        const now = new Date()
    
        res.status(200).json({
          status: 'success',
          data: courses.map((course)=>{
              const startAt = new Date(course.start_at)
              const endAt = new Date(course.end_at)
              let status = "尚未開始"
              if(startAt<now){
                status='進行中'
                if(endAt < now){
                  status = '已結束'
                }
              }
              const courseParticipant = coursesParticipant.find((courseParticipant)=>courseParticipant.courseId==course.id)
              return{
                  id:course.id,
                  name:course.name,
                  status,
                  start_at:course.start_at,
                  end_at: course.end_at,
                  max_participants:course.max_participants,
                  participants : courseParticipant ? courseParticipant.count:0
                  }
          })  
        })
      }catch(error){
        logger.error(error)
        next(error)
      }  
}
//取得教練自己的課程詳細資料
async function getCoachCourseDetail(req,res,next){
    try{
        const { courseId } = req.params
        const courseRepo = dataSource.getRepository('Course')
        const course = await courseRepo.findOne({
          select:{
            id:true,
            name:true,
            description:true,
            start_at:true,
            end_at:true,
            max_participants:true,
            meeting_url:true,
            Skill :{
              name:true
            },
          },
          where: {
            id:courseId
          },
          relations:{
            Skill:true
          }
        })
       
        res.status(200).json({
          status: 'success',
          data: {
              id: course.id,
              name: course.name,
              description: course.description,
              start_at: course.start_at,
              end_at: course.end_at,
              max_participants: course.max_participants,
              skill_name: course.Skill.name,
              meeting_url: course.meeting_url
    
          }
        })
      }catch(error){
        logger.error(error)
        next(error)
      }
}
//變更教練個人資料 參考老師做法
async function putCoachProfile(req,res,next){
    try {
        const { id } = req.user
        const { experience_years: experienceYears, description, profile_image_url: profileImageUrl= null,skill_ids:skillIds } = req.body
        const validationError = validateFields({ description, profileImageUrl})
        if (validationError) {
          return next(appError(400, validationError))
        }
        
        if (
          isUndefined( experienceYears) || isNotValidInteger( experienceYears) ||
          !profileImageUrl.startsWith('https')||
          isUndefined(skillIds) || !Array.isArray(skillIds)) {
          logger.warn('欄位未填寫正確')
          next(appError(400, config.get('errorMessage').FIELD_NOT_CORRECT))
          return
        }
        if(skillIds.length === 0 ||skillIds.every(skill => isUndefined(skill)||isNotValidString(skill))){
            logger.warn('欄位未填寫正確')
            next(appError(400, config.get('errorMessage').FIELD_NOT_CORRECT))
            return
        }

        const coachRepo = dataSource.getRepository('Coach')
        const coach = await coachRepo.findOne({
            select: ['id'],
            where: { user_id: id }
        })
        
        await coachRepo.update({
            id: coach.id
          }, {
            experience_years: experienceYears,
            description,
            profile_image_url: profileImageUrl
          })
        const coachLinkSkillRepo = dataSource.getRepository('CoachLinkSkill')
        const newCoachLinkSkill = skillIds.map(skill => ({
            coach_id: coach.id,
            skill_id: skill
        }))
        await coachLinkSkillRepo.delete({ coach_id: coach.id })
        const insert = await coachLinkSkillRepo.insert(newCoachLinkSkill)
        logger.info(`newCoachLinkSkill: ${JSON.stringify(newCoachLinkSkill, null, 1)}`)
        logger.info(`insert: ${JSON.stringify(insert, null, 1)}`)
        const result = await coachRepo.find({
            select:{
                id:true,
                experience_years:true,
                description:true,
                profile_image_url:true,
                CoachLinkSkill:{
                    skill_id:true
                }

            },
            where:{id:coach.id},
            relations:{
                CoachLinkSkill:true
            }
        })
        logger.info(`result: ${JSON.stringify(result, null, 1)}`)
        res.status(200).json({
          status: 'success',
          data: { //why??
            id: result[0].id,
            experience_years: result[0].experience_years,
            description: result[0].description,
            profile_image_url: result[0].profile_image_url,
            skill_ids: result[0].CoachLinkSkill.map(skill => skill.skill_id)
          }
        })
        } catch (error) {
        logger.error(error)
        next(error)
        }
}
//取得教練自己的詳細資料
async function getCoachProfile(req,res,next){
    try {
        const { id } = req.user
        const coachRepo = dataSource.getRepository('Coach')
        /*const coach = await coachRepo.findOne({
            select: ['id'],
            where: { user_id: id }
          })*/
        const data = await coachRepo.findOne({
            select:{
                id:true,
                experience_years:true,
                description:true,
                profile_image_url:true,
                CoachLinkSkill:{
                    skill_id:true
                }
            },
           where :{
                user_id: id
           },
           relations:{
            CoachLinkSkill:true
           }
        })
        
       
        res.status(200).json({
          status: 'success',
          data:{
            id: data.id,
            experience_years: data.experience_years,
            description: data.description,
            profile_image_url: data.profile_image_url,
            skill_ids: data.CoachLinkSkill.length > 0 ? data.CoachLinkSkill.map(skill => skill.skill_id) : data.CoachLinkSkill
          }
        })
        } catch (error) {
        logger.error(error)
        next(error)
        }
}

//取得教練月營收資料 參考老師做法
async function getMonthRevenue(req,res,next){
    const {id} =req.user
    const {month} = req.query

    if (isUndefined(month) || !Object.prototype.hasOwnProperty.call(monthMap, month)) {
        logger.warn('欄位未填寫正確')
        next(appError(400, config.get('errorMessage').FIELD_NOT_CORRECT))
        return
    }
    const courseRepo = dataSource.getRepository('Course')
    const courses = await courseRepo.find({
      select:["id"],
      where: {user_id:id}
    })
    const courseIds = courses.map(course=>course.id)
    if (courseIds.length === 0) {
        res.status(200).json({
          status: 'success',
          data: {
            total: {
              revenue: 0,
              participants: 0,
              course_count: 0
            }
          }
        })
        return
      }
    const year = new Date().getFullYear()
    const calculateStartAt = dayjs(`${year}-${month}-01`).startOf('month').toISOString()
    const calculateEndAt = dayjs(`${year}-${month}-01`).endOf('month').toISOString()
    const courseBookingRepo = dataSource.getRepository('CourseBooking')
    // 計算當月預約總數
    const courseCount = await courseBookingRepo.createQueryBuilder('course_booking')
    .select('COUNT(*)', 'count')
    .where('course_id IN (:...ids)', { ids: courseIds })
    .andWhere('cancelled_at IS NULL')
    .andWhere('created_at >= :startDate', { startDate: calculateStartAt })
    .andWhere('created_at <= :endDate', { endDate: calculateEndAt })
    .getRawOne()
    //參與課程獨立人數
    const participants = await courseBookingRepo.createQueryBuilder('course_booking')
    .select('COUNT(DISTINCT(user_id))', 'count')
    .where('course_id IN (:...ids)', { ids: courseIds })
    .andWhere('cancelled_at IS NULL')
    .andWhere('created_at >= :startDate', { startDate: calculateStartAt })
    .andWhere('created_at <= :endDate', { endDate: calculateEndAt })
    .getRawOne()
    const totalCreditPackage = await dataSource.getRepository('CreditPackage').createQueryBuilder('credit_package')
    .select('SUM(credit_amount)', 'total_credit_amount')
    .addSelect('SUM(price)', 'total_price')
    .getRawOne()
    const perCreditPrice = totalCreditPackage.total_price / totalCreditPackage.total_credit_amount
    const totalRevenue = courseCount.count * perCreditPrice
    res.status(200).json({
          status: 'success',
          data: {
            total: {
              revenue: totalRevenue,
              participants: participants.count,
              course_count: courseCount.count
            }
          }
    })
}

module.exports = {postCoach,
                  putCoachCourseDetail,
                  postCourses,
                  getCoachCourses,
                  getCoachCourseDetail,
                  putCoachProfile,
                  getCoachProfile,
                  getMonthRevenue}
