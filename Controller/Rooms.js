const { validationResult } = require("express-validator");
const AppErr = require("../Helper/AppError");

const HotelModel = require("../Model/Hotel");
const BookingModel = require("../Model/Booking");
const Roommodal = require("../Model/Rooms");

// CREATE Room
const createRoom = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new AppErr(errors.array()[0].msg, 400));

    const { hotelId } = req.body;
    const hotel = await HotelModel.findById(hotelId);
    if (!hotel) return next(new AppErr("Hotel not found", 404));

    const room = await Roommodal.create(req.body);

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
    const rooms = await Roommodal.find({
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
    const room = await Roommodal.findById(req.params.id).populate("hotelId");
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

    const updatedRoom = await Roommodal.findByIdAndUpdate(roomId, updates, {
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
    const room = await Roommodal.findByIdAndDelete(req.params.id);
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

    const roomTypes = await Roommodal.find({ hotelId });

    const bookings = await BookingModel.find({
      hotelId,
      status: {
        $in: [
          "collectPayment",
          "assignRoom",
          "pending",
          "booked",
          "checkin",
          "noshow",
        ],
      },
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
          maxcapacity: room.maxOccupancy,
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

// const getAvailableRoomNumbers = async (req, res, next) => {
//   try {
//     const { roomId, checkInDate, checkOutDate } = req.query;

//     if (!roomId || !checkInDate || !checkOutDate) {
//       return res.status(400).json({
//         status: false,
//         message: "roomId, checkInDate, and checkOutDate are required",
//       });
//     }

//     const start = new Date(checkInDate);
//     const end = new Date(checkOutDate);

//     if (isNaN(start) || isNaN(end) || start >= end) {
//       return res.status(400).json({
//         status: false,
//         message: "Invalid date range",
//       });
//     }

//     // 1. Get the list of all room numbers for that roomId
//     const room = await RoomModel.findById(roomId);
//     if (!room) {
//       return res.status(404).json({
//         status: false,
//         message: "Room type not found",
//       });
//     }

//     const allRoomNumbers = room.roomno;

//     // 2. Get bookings with overlapping dates & same roomId
//     const overlappingBookings = await BookingModel.find({
//       roomId,
//       status: { $in: ["booked", "checkin"] },
//       checkInDate: { $lt: end },
//       checkOutDate: { $gt: start },
//     }).select("RoomNo");

//     // 3. Collect all booked room numbers from those bookings
//     const bookedRoomNumbers = overlappingBookings.flatMap((b) => b.RoomNo);

//     // 4. Filter out booked numbers
//     const availableRoomNumbers = allRoomNumbers.filter(
//       (rn) => !bookedRoomNumbers.includes(rn)
//     );

//     return res.status(200).json({
//       status: true,
//       message: "Available room numbers fetched",
//       data: availableRoomNumbers,
//     });
//   } catch (error) {
//     console.error("Error getting available room numbers:", error);
//     return res.status(500).json({
//       status: false,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

const getAvailableRoomNumbers = async (req, res, next) => {
  try {
    let { roomId, checkInDate, checkOutDate } = req.query;

    if (!roomId || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        status: false,
        message: "roomId, checkInDate, and checkOutDate are required",
      });
    }

    // Convert comma-separated roomId string to array
    const roomIds = roomId.split(",").map((id) => id.trim());

    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);

    if (isNaN(start) || isNaN(end) || start >= end) {
      return res.status(400).json({
        status: false,
        message: "Invalid date range",
      });
    }

    // 1. Get all rooms for given IDs
    const rooms = await Roommodal.find({ _id: { $in: roomIds } });
    if (!rooms.length) {
      return res.status(404).json({
        status: false,
        message: "No rooms found for given IDs",
      });
    }

    // Merge all room numbers into one array
    const allRoomNumbers = rooms.flatMap((room) => room.roomno);

    // 2. Get bookings with overlapping dates & any of the roomIds
    const overlappingBookings = await BookingModel.find({
      roomId: { $in: roomIds },
      status: { $in: ["booked", "checkin"] },
      checkInDate: { $lt: end },
      checkOutDate: { $gt: start },
    }).select("RoomNo");

    // 3. Collect booked room numbers
    const bookedRoomNumbers = overlappingBookings.flatMap((b) => b.RoomNo);

    // 4. Filter available numbers
    const availableRoomNumbers = allRoomNumbers.filter(
      (rn) => !bookedRoomNumbers.includes(rn)
    );

    return res.status(200).json({
      status: true,
      message: "Available room numbers fetched",
      data: availableRoomNumbers,
    });
  } catch (error) {
    console.error("Error getting available room numbers:", error);
    return res.status(500).json({
      status: false,
      message: "Server error",
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
  getAvailableRoomNumbers,
};
