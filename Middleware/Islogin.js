const AppErr = require("../Helper/AppError");
const verifyToken = require("../Helper/VerifyToken");
const Adminmodel = require("../Model/Admin");

const Islogin = async (req, res, next) => {
  try {
    let { token } = req.headers;
    let { id } = await verifyToken(token);
    if (!id) {
      return next(new AppErr("Invailed Token", 401));
    }
    let admin = await Adminmodel.findById(id);
    if (!admin) {
      return next(new AppErr("Unauthorized user", 401));
    }

    if (admin.Blocked) {
      return next(new AppErr("Admin Blocked", 401));
    }
    req.admin = id;
    req.branch = admin.Hotel;

    next();
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

module.exports = Islogin;
