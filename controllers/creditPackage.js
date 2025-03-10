const express = require('express')

const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const { isUndefined, isNotValidString, isNotValidInteger,validateFields } = require('../utils/validators');
const logger = require('../utils/logger')('CreditPackage')
const appError = require('../utils/appError')
const auth = require('../middlewares/auth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})

//取得購買方案列表
async function getAll(req,res,next){
    try {
        const creditPackage = await dataSource.getRepository('CreditPackage').find({
          select: ['id', 'name', 'credit_amount', 'price']
        })
        res.status(200).json({
          status: 'success',
          data: creditPackage
        })
      } catch (error) {
        logger.error(error)
        next(error)
      }
}

//新增購買方案
async function post(req,res,next){
    try {
        const { name, credit_amount: creditAmount, price } = req.body
        const validationError = validateFields({name,creditAmount})
        if (validationError) {
          return next(appError(400, validationError))
        }
        if (isUndefined(price) || isNotValidInteger(price)) {
          next(appError(400,config.get('errorMessage').FIELD_NOT_CORRECT))
          return
        }
        const creditPackageRepo = dataSource.getRepository('CreditPackage')
        const existCreditPackage = await creditPackageRepo.find({
          where: {
            name
          }
        })
        if (existCreditPackage.length > 0) {
          next(appError(409,config.get('errorMessage').DUPLICATE_DATA))
          return
        }
        const newCreditPurchase = await creditPackageRepo.create({
          name,
          credit_amount: creditAmount,
          price
        })
        const result = await creditPackageRepo.save(newCreditPurchase)
        res.status(200).json({
          status: 'success',
          data: result
        })
      } catch (error) {
        logger.error(error)
        next(error)
      }
}
//使用者購買方案
async function postUserBuy(req,res,next){
    try {
        const { id } = req.user
        const { creditPackageId } = req.params
        const creditPackageRepo = dataSource.getRepository('CreditPackage')
        const creditPackage = await creditPackageRepo.findOne({
          where: {
            id: creditPackageId
          }
        })
        if (!creditPackage) {
          next(appError(400,config.get('errorMessage').ID_ERROR))
          return
        }
        const creditPurchaseRepo = dataSource.getRepository('CreditPurchase')
        const newPurchase = await creditPurchaseRepo.create({
          user_id: id,
          credit_package_id: creditPackageId,
          purchased_credits: creditPackage.credit_amount,
          price_paid: creditPackage.price,
          purchaseAt: new Date().toISOString()
        })
        await creditPurchaseRepo.save(newPurchase)
        res.status(200).json({
          status: 'success',
          data: null
        })
      } catch (error) {
        logger.error(error)
        next(error)
      }
}
//刪除課程方案
async function deletePackage(req,res,next){
    try {
        const { creditPackageId } = req.params
        const validationError = validateFields({creditPackageId})
        if (validationError) {
          return next(appError(400, validationError))
        }
        const result = await dataSource.getRepository('CreditPackage').delete(creditPackageId)
        if (result.affected === 0) {
          next(appError(400,config.get('errorMessage').ID_ERROR))
          return
        }
        res.status(200).json({
          status: 'success',
          data: result
        })
      } catch (error) {
        logger.error(error)
        next(error)
      }
}


module.exports = {getAll,post,postUserBuy,deletePackage}