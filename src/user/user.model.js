const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema({
  _id: String,
  email: String,
  billingID: String,
  plan: { type: String, enum: ['none', 'premium'], default: 'none' }
  
})


/**
 * 
 * hasTrial: { type: Boolean, default: false },
  endDate: { type: Date, default: null }
 */
const userModel = mongoose.model('users', userSchema, 'users')

module.exports = userModel
