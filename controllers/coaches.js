const { dataSource } = require('../db/data-source')
const appError = require('../utils/appError')
const { validate: isUuid } = require('uuid');
const logger = require('../utils/logger')('Coaches')
const { isUndefined, isNotValidString, isNotValidInteger,validateFields } = require('../utils/validators');


//取得教練列表
async function getCoaches(req, res, next){
  try {
    //做成迴圈？
    let{ per, page } = req.query;
    const validationError = validateFields({per,page})
    if (validationError) {
      return next(appError(400, validationError))
    }
    per =  parseInt(per);
    page = parseInt(page);
    
    if(per<=0||page<=0){
      next(appError(400, config.get('errorMessage').PAGE_OR_PER_ERROR))
      return
    }
    const take = per;
    const skip = (page-1)*per;

    const coaches = await dataSource.getRepository("Coach").find({
        select: {
          id: true,
          user_id: { name: true },
          created_at:true
        },
        order: {created_at: "ASC" },
        take,
        skip,
        relations: ['User']
      });
      
      const result = coaches.map(coach => ({
        id: coach.id,
        name: coach.User.name   
      }));
      
    res.status(200).json({
      status: 'success',
      data: result
    })


  } catch (error) {
    logger.error(error)
    next(error)
  }
}
//取得教練詳細資訊
async function getCoachDetail(req,res,next){
    try {
        const {coachId} = req.params
        if (!isUuid(coachId)) {
            next(appError(400,config.get('errorMessage').ID_ERROR))
            return 
          }
        const coach = await dataSource.getRepository('Coach').findOne({
        where: { id: coachId }
        })
        if (!coach) {
            logger.warn('此教練ID不存在')
            next(appError(400,config.get('errorMessage').COACH_NOT_FOUND))
            return
        }
        const user = await dataSource.getRepository('User').findOne({
                        select: ["name", "role"],
                        where: { id: coach.user_id }
                        })
          
        res.status(200).json({
          status: 'success',
          data: {
            user,
            coach}
        })
    } catch (error) {
      logger.error(error)
      next(error)
    }
}


module.exports = {getCoaches,getCoachDetail}