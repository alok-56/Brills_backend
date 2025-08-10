const AppErr = require("../Helper/AppError");
const HotelModel = require("../Model/Hotel");
const Roommodal = require("../Model/Rooms");

// Get All Hotels
const GetAllUserHotels = async (req, res, next) => {
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
const GetUserHotelById = async (req, res, next) => {
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



module.exports = {
  GetAllUserHotels,
  GetUserHotelById
};
