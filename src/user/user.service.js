const updateUser = (User) => ({_id, billingID, plan, endDate }) => {
  if (!_id || !billingID || !plan) { 
    throw new Error('Missing Data. Please provide values for _id, billingID, plan');
  }

  const user = new User({_id, billingID, plan, endDate });
  console.log("In updateUser");
  console.log(user);
  return User.updateOne({_id:_id},{"billingID":billingID, "plan":plan, "endDate":endDate});
}

const getUsers = (User) => () => {
  return User.find({})
}

const getUserByEmail = (User) => async (email) => {
  return await User.findOne({ email })
}

const getUserByUserId = (User) => async (_id) =>{
  return await User.findOne({ _id });
}

const getUserByBillingID = (User) => async (billingID) => {
  return await User.findOne({ billingID })
}

const updatePlan = (User) => (email, plan) => {
  return User.findOneAndUpdate({ email, plan })
}

module.exports = (User) => {
  return {
    updateUser: updateUser(User),
    getUsers: getUsers(User),
    getUserByEmail: getUserByEmail(User),
    updatePlan: updatePlan(User),
    getUserByBillingID: getUserByBillingID(User),
    getUserByUserId: getUserByUserId(User)
  }
}
