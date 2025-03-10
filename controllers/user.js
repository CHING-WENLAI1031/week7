const express = require('express')
const bcrypt = require('bcrypt')

const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Users')
const appError = require('../utils/appError')
const { isUndefined, isNotValidString, isNotValidInteger , isNotValidPassword ,isNotValidEmail,validateFields} = require('../utils/validators');
const generateJWT = require('../utils/generateJWT')
const auth = require('../middlewares/auth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})
const saltRounds = process.env.SALT_ROUNDS || 10


//註冊使用者
async function signUp(req,res,next){
    try {
        const { name, email, password } = req.body
        const validationError = validateFields({ name,email,password})
        if (validationError){
          return next(appError(400, validationError))
        }
        if (isNotValidPassword(password)) {
          logger.warn('建立使用者錯誤: 密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字')
          next(appError(400,config.get('errorMessage').PASSWORD_ERROR))
          return
        }
        if (isNotValidEmail(email)) {
          logger.warn('輸入信箱格式錯誤')
          next(appError(400,config.get('errorMessage').EMAILFORM_ERROR))
          return
        }
        const userRepository = dataSource.getRepository('User')
        const existingUser = await userRepository.findOne({
          where: { email }
        })
    
        if (existingUser) {
          logger.warn('建立使用者錯誤: Email 已被使用')
          next(appError(409,config.get('errorMessage').EMAIL_IS_USED))
          return
        }
        //const salt = await bcrypt.genSalt(10)
        const hashPassword = await bcrypt.hash(password, saltRounds)
        const newUser = userRepository.create({
          name,
          email,
          role: 'USER',
          password: hashPassword
        })
    
        const savedUser = await userRepository.save(newUser)
        logger.info('新建立的使用者ID:', savedUser.id)
    
        res.status(201).json({
          status: 'success',
          data: {
            user: {
              id: savedUser.id,
              name: savedUser.name
            }
          }
        })
      } catch (error) {
        logger.error('建立使用者錯誤:', error)
        next(error)
      }

}
//使用者登入
async function login(req,res,next){
    try {
        const passwordPattern = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,16}/
        const { email, password } = req.body
        const validationError = validateFields({ email,password})
        if (validationError){
          return next(appError(400, validationError))
        }
        if (isNotValidPassword(password)) {
          logger.warn('密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字')
          next(appError(400,config.get('errorMessage').PASSWORD_ERROR))
          return
        }
        const userRepository = dataSource.getRepository('User')
        const existingUser = await userRepository.findOne({
          select: ['id', 'name', 'password'],
          where: { email }
        })
    
        if (!existingUser) {
          next(appError(400,config.get('errorMessage').USER_NOT_FOUND))
          return
        }
        logger.info(`使用者資料: ${JSON.stringify(existingUser)}`)
        const isMatch = await bcrypt.compare(password, existingUser.password)
        if (!isMatch) {
          next(appError(400,config.get('errorMessage').USER_NOT_FOUND))
          return
        }
        const token = await generateJWT({
          id: existingUser.id
        }, config.get('secret.jwtSecret'), {
          expiresIn: `${config.get('secret.jwtExpiresDay')}`
        })
    
        res.status(201).json({
          status: 'success',
          data: {
            token,
            user: {
              name: existingUser.name
            }
          }
        })
      } catch (error) {
        logger.error('登入錯誤:', error)
        next(error)
      }
}
//取得個人資料
async function getProfile(req,res,next){
    try {
        const { id } = req.user
        const userRepository = dataSource.getRepository('User')
        const user = await userRepository.findOne({
          select: ['name', 'email'],
          where: { id }
        })
        res.status(200).json({
          status: 'success',
          data: {
            user
          }
        })
      } catch (error) {
        logger.error('取得使用者資料錯誤:', error)
        next(error)
      }
}
//編輯個人資料
async function putProfile(req,res,next){
    try {
        const { id } = req.user
        const { name } = req.body
        const validationError = validateFields({name})
        if (validationError){
          return next(appError(400, validationError))
        }
        const userRepository = dataSource.getRepository('User')
        const user = await userRepository.findOne({
          select: ['name'],
          where: {
            id
          }
        })
        if (user.name === name) {
          next(appError(400,config.get('errorMessage').USERNAME_NOT_CHANGE))
          return
        }
        const updatedResult = await userRepository.update({
          id,
          name: user.name
        }, {
          name
        })
        if (updatedResult.affected === 0) {
          next(appError(400,config.get('errorMessage').UPDATE_USERPROFILE_ERROR))
          return
        }
        const result = await userRepository.findOne({
          select: ['name'],
          where: {
            id
          }
        })
        res.status(200).json({
          status: 'success',
          data: {
            user: result
          }
        })
      } catch (error) {
        logger.error('取得使用者資料錯誤:', error)
        next(error)
      }
}
//變更密碼
async function putPassword(req, res, next) {
  const { id } = req.user
  const { password, new_password, confirm_new_password } = req.body
  const validationError = validateFields({password, new_password, confirm_new_password})
  if (validationError){
    return next(appError(400, validationError))
  }
  if (isNotValidString(password) || isNotValidString(new_password) || isNotValidString(confirm_new_password)) {
    return next(appError(400, config.get('errorMessage').FIELD_NOT_CORRECT))
  }
  if (isNotValidPassword(password) || isNotValidPassword(new_password) || isNotValidPassword(confirm_new_password)) {
    return next(appError(400, config.get('errorMessage').PASSWORD_ERROR))
  }
  if (new_password === password) {
    return next(appError(400, config.get('errorMessage').PASSWORD_NOT_CHANGE))
  }
  if (new_password !== confirm_new_password ) {
    return next(appError(400, config.get('errorMessage').NEWPASSWORD_NOT_VALIDATE))
  }
  const userRepo = dataSource.getRepository('User')
  const findUser = await userRepo.findOne({
    select: ['password'],
    where: {
            id
          }
  })
  if(!findUser){
    return next(appError(400, config.get('errorMessage').USER_NOT_FOUND))
  }
  console.log(password,findUser.password)
  const isMatch = await bcrypt.compare(password,findUser.password)
  if(!isMatch){
    return next(appError(400, config.get('errorMessage').PASSWORD_NOT_CORRECT))
  }
  
  // 密碼加密並更新資料
  const hashPassword = await bcrypt.hash(new_password,saltRounds)
  const updateUser = await userRepo.update({
    id,
  },{ password:hashPassword}
  )
  if(updateUser.affected===0){
     return next(appError(400, config.get('errorMessage').PASSWORD_UPDATE_FAIL))
  }

  res.status(200).json({
    status: 'success',
    data: null,
  })
}

//取得使用者已購買的方案列表
async function getCreditPackage(req,res,next){
  try {
    const { id } = req.user
 
    const creditPurchaseRepo = dataSource.getRepository('CreditPurchase')
    const userPurchase = await creditPurchaseRepo.find({
      select:{
        purchased_credits: true,
			  price_paid: true,
        CreditPackage:{
          name:true
        },
			  purchaseAt: true,
        },
        where:{
          user_id:id
        },
        relations:{
          CreditPackage: true
        }
            
    })
 
    res.status(200).json({
      status: 'success',
      data: {
        data : userPurchase
      }
    })
  } catch (error) {
    logger.error('取得使用者購買資料錯誤:', error)
    next(error)
  }
}

//取得使用者已預約方案列表
async function getCourseBooking(req,res,next){
  try {
    const { id } = req.user
 
    const courseBookingRepo = dataSource.getRepository('CourseBooking')
    const userCourseBooking = await courseBookingRepo.findOne({
      where: {
        user_id: id,
      }
    })
 
    res.status(200).json({
      status: 'success',
      data: {
        data : userCourseBooking 
      }
    })
  } catch (error) {
    logger.error('取得使用者預約資料錯誤:', error)
    next(error)
  }

}

module.exports = {signUp,
                  login,
                  getProfile,
                  putProfile,
                  putPassword,
                  getCreditPackage,
                  getCourseBooking}

