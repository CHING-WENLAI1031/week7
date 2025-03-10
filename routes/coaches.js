const express = require('express')

const router = express.Router()
const coach = require('../controllers/coaches')

//取得教練列表
router.get('/', coach.getCoaches)
//取得教練詳細資訊
router.get('/:coachId', coach.getCoachDetail)


module.exports = router