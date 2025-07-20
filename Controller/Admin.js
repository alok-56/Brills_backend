const { validationResult } = require("express-validator");
const AppErr = require("../Helper/AppError");
const Adminmodel = require("../Model/Admin");
const generateToken = require("../Helper/GenerateToken");
const HotelModel = require("../Model/Hotel");

// Create Admin
const CreateAdmin = async (req, res, next) => {
  try {
    let err = validationResult(req);
    if (err.errors.length > 0) {
      return next(new AppErr(err.errors[0].msg, 403));
    }
    let { Name, Email, Password, Permission } = req.body;

    let admincheck = await Adminmodel.findOne({ Email: Email });
    if (admincheck) {
      return next(new AppErr("Email Already Exists", 400));
    }

    let admin = await Adminmodel.create(req.body);

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Admin Created Successfully",
      data: admin,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Login Admin
const LoginAdmin = async (req, res, next) => {
  try {
    let err = validationResult(req);
    if (err.errors.length > 0) {
      return next(new AppErr(err.errors[0].msg, 403));
    }
    let { Email, Password } = req.body;

    let admincheck = await Adminmodel.findOne({
      Email: Email,
      Password: Password,
    });
    if (!admincheck) {
      return next(
        new AppErr("Admin Not Found! Invailed Email or Password", 440)
      );
    }

    let token = await generateToken(admincheck._id);

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Admin Login Successfully",
      data: admincheck,
      token: token,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Update Admin
const UpdateAdmin = async (req, res, next) => {
  try {
    let err = validationResult(req);
    if (err.errors.length > 0) {
      return next(new AppErr(err.errors[0].msg, 403));
    }
    let { Name, Email, Password, Permission, Hotel } = req.body;

    let { id } = req.params;
    if (!id) {
      return next(new AppErr("ID is required", 400));
    }

    if (Email) {
      let admincheck = await Adminmodel.findOne({
        Email: Email,
        _id: { $ne: id },
      });
      if (admincheck) {
        return next(new AppErr("Email Already Exists", 400));
      }
    }

    if (Hotel) {
      Hotel.forEach(async (item) => {
        let Hotelcheck = await HotelModel.findById(item);
        if (!Hotelcheck) {
          return next(new AppErr("Some Hotel Not Found", 404));
        }
      });
    }

    let updateData = {};
    if (Name) updateData.Name = Name;
    if (Email) updateData.Email = Email;
    if (Password) updateData.Password = Password;
    if (Permission) updateData.Permission = Permission;
    if (Hotel) updateData.Hotel = [...new Set(Hotel)];

    let updateHotel = await Adminmodel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Admin Updated Successfully",
      data: updateHotel,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Get All Admin Data
const GetAllAdmin = async (req, res, next) => {
  try {
    // { Hotel: { $in: req.Hotel } }
    let admin = await Adminmodel.find().populate("Hotel");
    return res.status(200).json({
      status: true,
      code: 200,
      message: "Admin fetched successfully",
      data: admin,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Get Admin By ID
const GetAdminById = async (req, res, next) => {
  try {
    let { id } = req.params;
    if (!id) {
      return next(new AppErr("ID is required", 400));
    }

    let admin = await Adminmodel.findById(id);
    return res.status(200).json({
      status: true,
      code: 200,
      message: "Admin fetched successfully",
      data: admin,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Get Own Profile
const GetOwnProfile = async (req, res, next) => {
  try {
    let admin = await Adminmodel.findById(req.admin).populate("Hotel");
    return res.status(200).json({
      status: true,
      code: 200,
      message: "Admin fetched successfully",
      data: admin,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Delete Admin
const DeleteAdmin = async (req, res, next) => {
  try {
    let { id } = req.params;
    if (!id) {
      return next(new AppErr("Hotel ID is required", 400));
    }

    await Adminmodel.findByIdAndDelete(id);

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Admin Deleted Successfully",
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

module.exports = {
  CreateAdmin,
  LoginAdmin,
  UpdateAdmin,
  GetAllAdmin,
  GetAdminById,
  GetOwnProfile,
  DeleteAdmin,
};
