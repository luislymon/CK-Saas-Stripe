const UserService = require('../user')

module.exports = async function setCurrentUser (req, res, next) {
  const { _id } = req.session

  if (_id) {
    user = await UserService.getUserByUserId(_id)

    req.user = user
    next()
  } else {
    res.redirect('/')
  }
}
