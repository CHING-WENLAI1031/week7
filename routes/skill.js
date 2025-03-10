
const express = require('express')

const router = express.Router()
const { dataSource } = require('../db/data-source')
const skill = require('../controllers/skill')
const { validate: isUuid } = require('uuid');
const appError = require('../utils/appError')
const logger = require('../utils/logger')('Skill')
const { isUndefined, isNotValidString, isNotValidInteger } = require('../utils/validators');


router.get('/', skill.getSkills)

router.post('/', skill.addSkill)

router.delete('/:skillId', skill.deleteSkill)

module.exports = router