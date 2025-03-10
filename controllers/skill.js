
const express = require('express')

const router = express.Router()
const { dataSource } = require('../db/data-source')
const { validate: isUuid } = require('uuid');
const appError = require('../utils/appError')
const logger = require('../utils/logger')('Skill')
const { isUndefined, isNotValidString, isNotValidInteger,validateFields } = require('../utils/validators');


async function getSkills (req, res, next){
  try {
    const skill = await dataSource.getRepository('Skill').find({
      select: ['id', 'name']
    })
    res.status(200).json({
      status: 'success',
      data: skill
    })
  } catch (error) {
    logger.error(error)
    next(error)
  }
}

async function addSkill(req,res,next){
    try {
        const { name } = req.body
        const validationError = validateFields({name})
        if (validationError) {
          return next(appError(400, validationError))
        }
        const skillRepo = await dataSource.getRepository('Skill')
        const existSkill = await skillRepo.find({
          where: {
            name
          }
        })
        if (existSkill.length > 0) {
          next(appError(409,config.get('errorMessage').DUPLICATE_DATA))
          return
        }
        const newSkill = await skillRepo.create({
          name
        })
        const result = await skillRepo.save(newSkill)
        res.status(200).json({
          status: 'success',
          data: result
        })
      } catch (error) {
        logger.error(error)
        next(error)
      }
}

async function deleteSkill(req,res,next){
    try {
        const skillId = req.params.skillId
        if (!isUuid(skillId)) {
          next(appError(400,config.get('errorMessage').FIELD_NOT_CORRECT))
          return 
        }
        const result = await dataSource.getRepository('Skill').delete(skillId)
        if (result.affected === 0) {
          next(appError(400,config.get('errorMessage').ID_ERROR))
          return
        }
        res.status(200).json({
          status: 'success',
          data: result
        })
        res.end()
      } catch (error) {
        logger.error(error)
        next(error)
      }
}


module.exports = {getSkills,addSkill,deleteSkill}