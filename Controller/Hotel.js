const { validationResult } = require("express-validator");
const HotelModel = require("../Model/Hotel");
const AppErr = require("../Helper/AppError");
const Adminmodel = require("../Model/Admin");

// Create Hotel
const CreateHotel = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppErr(errors.array()[0].msg, 400));
    }

    const hotel = await HotelModel.create(req.body);

    // fetch admin
    let admin = await Adminmodel.findById(req.admin);
    admin.Hotel.push(hotel._id);
    await admin.save();
    return res.status(201).json({
      status: true,
      message: "Hotel created successfully",
      data: hotel,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Update Hotel (Partial Update)
const UpdateHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return next(new AppErr("Hotel ID is required", 400));

    const hotel = await HotelModel.findById(id);
    if (!hotel) return next(new AppErr("Hotel not found", 404));

    const updates = req.body;
    Object.keys(updates).forEach((key) => {
      hotel[key] = updates[key];
    });

    await hotel.save();

    return res.status(200).json({
      status: true,
      message: "Hotel updated successfully",
      data: hotel,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Get All Hotels
const GetAllHotels = async (req, res, next) => {
  try {
    const hotels = await HotelModel.find();
    return res.status(200).json({
      status: true,
      message: "Hotels fetched successfully",
      data: hotels,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Get Hotel By ID
const GetHotelById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return next(new AppErr("Hotel ID is required", 400));

    const hotel = await HotelModel.findById(id);
    if (!hotel) return next(new AppErr("Hotel not found", 404));

    return res.status(200).json({
      status: true,
      message: "Hotel fetched successfully",
      data: hotel,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Delete Hotel
const DeleteHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return next(new AppErr("Hotel ID is required", 400));

    const deleted = await HotelModel.findByIdAndDelete(id);
    if (!deleted) return next(new AppErr("Hotel not found", 404));

    return res.status(200).json({
      status: true,
      message: "Hotel deleted successfully",
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

module.exports = {
  CreateHotel,
  UpdateHotel,
  GetAllHotels,
  GetHotelById,
  DeleteHotel,
};
