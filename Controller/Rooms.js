const { validationResult } = require("express-validator");
const AppErr = require("../Helper/AppError");
const RoomModel = require("../Model/Rooms");
const HotelModel = require("../Model/Hotel");
const BookingModel = require("../Model/Booking");

// CREATE Room
const createRoom = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new AppErr(errors.array()[0].msg, 400));

    const { hotelId } = req.body;
    const hotel = await HotelModel.findById(hotelId);
    if (!hotel) return next(new AppErr("Hotel not found", 404));

    const room = await RoomModel.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      data: room,
    });
  } catch (err) {
    return next(new AppErr(err.message, 500));
  }
};

// READ All Rooms
const getAllRooms = async (req, res, next) => {
  try {
    const rooms = await RoomModel.find({
      hotelId: { $in: req.branch },
    }).populate("hotelId");
    return res.status(200).json({
      success: true,
      message: "Rooms fetched successfully",
      data: rooms,
    });
  } catch (err) {
    return next(new AppErr(err.message, 500));
  }
};

// READ Room by ID
const getRoomById = async (req, res, next) => {
  try {
    const room = await RoomModel.findById(req.params.id).populate("hotelId");
    if (!room) return next(new AppErr("Room not found", 404));

    return res.status(200).json({
      success: true,
      message: "Room fetched successfully",
      data: room,
    });
  } catch (err) {
    return next(new AppErr(err.message, 500));
  }
};

// UPDATE Room
const updateRoom = async (req, res, next) => {
  try {
    const roomId = req.params.id;
    const updates = req.body;

    if (updates.hotelId) {
      const hotelExists = await HotelModel.findById(updates.hotelId);
      if (!hotelExists) return next(new AppErr("Hotel not found", 404));
    }

    const updatedRoom = await RoomModel.findByIdAndUpdate(roomId, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedRoom) return next(new AppErr("Room not found", 404));

    return res.status(200).json({
      success: true,
      message: "Room updated successfully",
      data: updatedRoom,
    });
  } catch (err) {
    return next(new AppErr(err.message, 500));
  }
};

// DELETE Room
const deleteRoom = async (req, res, next) => {
  try {
    const room = await RoomModel.findByIdAndDelete(req.params.id);
    if (!room) return next(new AppErr("Room not found", 404));

    return res.status(200).json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (err) {
    return next(new AppErr(err.message, 500));
  }
};

// SEARCH Room
// const searchAvailableRoomTypes = async (req, res, next) => {
//   try {
//     const { hotelId, startDate, endDate } = req.query;

//     if (!hotelId || !startDate || !endDate) {
//       return res.status(400).json({
//         success: false,
//         message: "hotelId, startDate, and endDate are required",
//       });
//     }

//     const start = new Date(startDate);
//     const end = new Date(endDate);

//     if (isNaN(start) || isNaN(end) || start >= end) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid date range",
//       });
//     }

//     // Step 1: Get all room types with availability for the hotel
//     const roomTypes = await RoomModel.find({ hotelId });

//     // Step 2: Find all bookings that overlap with the date range
//     const bookings = await BookingModel.find({
//       hotelId,
//       checkInDate: { $lt: end },
//       checkOutDate: { $gt: start },
//     }).select("roomId");

//     // Step 3: Count booked rooms per room type
//     const bookedRoomIds = bookings.flatMap((b) =>
//       b.roomId.map((id) => id.toString())
//     );

//     const roomTypeBookingCounts = {}; 

//     for (let room of roomTypes) {
//       const count = bookedRoomIds.filter(
//         (id) => id === room._id.toString()
//       ).length;

//       const key = room.roomType;
//       roomTypeBookingCounts[key] = (roomTypeBookingCounts[key] || 0) + count;
//     }

//     // Step 4: Build availability response
//     const response = [];

//     for (let room of roomTypes) {
//       const key = room.roomType;
//       const booked = roomTypeBookingCounts[key] || 0;

//       if (!response.some((r) => r.roomType === key)) {
//         response.push({
//           roomType: key,
//           totalAvailable: room.availability,
//           currentlyBooked: booked,
//           availableUnits: Math.max(0, room.availability - booked),
//           price: room.price,
//           amenities: room.amenities,
//         });
//       }
//     }

//     res.status(200).json({
//       success: true,
//       message: "Available room types fetched",
//       data: response,
//     });
//   } catch (error) {
//     console.error("Room availability error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server Error",
//       error: error.message,
//     });
//   }
// };

const searchAvailableRoomTypes = async (req, res, next) => {
  try {
    const { hotelId, startDate, endDate } = req.query;

    if (!hotelId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "hotelId, startDate, and endDate are required",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end) || start >= end) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range",
      });
    }

    const roomTypes = await RoomModel.find({ hotelId });

    const bookings = await BookingModel.find({
      hotelId,
      checkInDate: { $lt: end },
      checkOutDate: { $gt: start },
    }).select("roomId");

    const bookedRoomIds = bookings.flatMap((b) =>
      b.roomId.map((id) => id.toString())
    );

    const roomTypeBookingCounts = {};

    for (let room of roomTypes) {
      const count = bookedRoomIds.filter(
        (id) => id === room._id.toString()
      ).length;

      const key = room.roomType;
      roomTypeBookingCounts[key] = (roomTypeBookingCounts[key] || 0) + count;
    }

    const response = [];

    for (let room of roomTypes) {
      const key = room.roomType;
      const booked = roomTypeBookingCounts[key] || 0;

      if (!response.some((r) => r.roomType === key)) {
        response.push({
          _id: room._id, // ✅ Include _id here
          roomType: key,
          totalAvailable: room.availability,
          currentlyBooked: booked,
          availableUnits: Math.max(0, room.availability - booked),
          price: room.price,
          amenities: room.amenities,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Available room types fetched",
      data: response,
    });
  } catch (error) {
    console.error("Room availability error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


module.exports = {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  searchAvailableRoomTypes,
};
