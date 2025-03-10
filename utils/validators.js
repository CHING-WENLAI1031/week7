function isUndefined (value) {
    return value === undefined
}
    
function isNotValidString (value) {
    return typeof value !== 'string' || value.trim().length === 0 || value === ''
}
    
function isNotValidInteger (value) {
    return typeof value !== 'number' || value < 0 || value % 1 !== 0
}

function isNotValidPassword(value){
    const passwordPattern = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,16}/
    return !passwordPattern.test(value)
}

function isNotValidEmail(value){
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/
    return !emailPattern.test(value)
}

const validateFields = (fields) => {
    for (const [key, value] of Object.entries(fields)) {
     if (isUndefined(value) || isNotValidString(value)) {
      return  `欄位 ${key} 未填寫正確`
     }
    }
   return null
}

module.exports = { isUndefined, isNotValidString, isNotValidInteger,isNotValidPassword,isNotValidEmail,validateFields };