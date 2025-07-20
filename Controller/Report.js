const BookingModel = require("../Model/Booking");
const Roommodal = require("../Model/Rooms");
const mongoose = require("mongoose");
const moment = require("moment");
const HotelModel = require("../Model/Hotel");

// Dashboard Api

const getCounts = async (req, res) => {
  try {
    const { hotelIds } = req.query;

    const hotelFilter = hotelIds
      ? {
          _id: {
            $in: hotelIds.split(",").map((id) => new mongoose.Types.ObjectId(id)),
          },
        }
      : {};

    const hotels = await HotelModel.find(hotelFilter);
    const hotelObjectIds = hotels.map((h) => h._id);

    // --- TODAY RANGE ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // --- LAST MONTH RANGE ---
    const now = new Date();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0); // last day of previous month
    lastMonthEnd.setHours(23, 59, 59, 999);
    const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
    lastMonthStart.setHours(0, 0, 0, 0);

    // BOOKINGS
    const todayBookings = await BookingModel.countDocuments({
      hotelId: { $in: hotelObjectIds },
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    const todayEarningsAgg = await BookingModel.aggregate([
      {
        $match: {
          hotelId: { $in: hotelObjectIds },
          createdAt: { $gte: todayStart, $lte: todayEnd },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    const lastMonthBookings = await BookingModel.countDocuments({
      hotelId: { $in: hotelObjectIds },
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
    });

    const lastMonthEarningsAgg = await BookingModel.aggregate([
      {
        $match: {
          hotelId: { $in: hotelObjectIds },
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    // --- TODAY'S VACANT ROOMS (based on bookings and room availability) ---
    let todayVacantRooms = 0;
    let totalRooms = 0;

    for (const hotelId of hotelObjectIds) {
      // Get all rooms of this hotel
      const rooms = await Roommodal.find({ hotelId });

      totalRooms += rooms.length;

      // Get today’s bookings for this hotel
      const bookings = await BookingModel.find({
        hotelId,
        checkInDate: { $lt: todayEnd },
        checkOutDate: { $gt: todayStart },
      }).select("roomId");

      const bookedRoomIds = bookings.flatMap((b) =>
        b.roomId.map((id) => id.toString())
      );

      // For each room, subtract number of bookings from availability
      for (const room of rooms) {
        const bookedCount = bookedRoomIds.filter(
          (id) => id === room._id.toString()
        ).length;

        const availableToday = room.availability - bookedCount;

        if (availableToday > 0) {
          todayVacantRooms += availableToday;
        }
      }
    }

    // ALL TIME STATS
    const allTimeBookings = await BookingModel.countDocuments({
      hotelId: { $in: hotelObjectIds },
    });

    const allTimeEarningsAgg = await BookingModel.aggregate([
      { $match: { hotelId: { $in: hotelObjectIds } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    // FINAL RESPONSE
    res.json({
      success: true,
      data: {
        todayBookings,
        todayEarnings: todayEarningsAgg[0]?.total || 0,
        todayVacantRooms,
        lastMonthBookings,
        lastMonthEarnings: lastMonthEarningsAgg[0]?.total || 0,
        totalRooms,
        allTimeBookings,
        allTimeEarnings: allTimeEarningsAgg[0]?.total || 0,
        selectedHotelsCount: hotelObjectIds.length,
        totalHotelsCount: await HotelModel.countDocuments(),
      },
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Counts API error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// controllers/analyticsController.js
const getRevenueVsBooking = async (req, res) => {
  try {
    const { period = "last_7_days", hotelIds } = req.query;
    const allowedPeriods = {
      today: [0],
      last_7_days: [7],
      last_15_days: [15],
      last_30_days: [30],
    };

    if (!allowedPeriods[period]) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PERIOD",
          message:
            "Invalid period parameter. Must be one of: today, last_7_days, last_15_days, last_30_days",
        },
      });
    }

    const days = allowedPeriods[period][0];
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days || 0));

    const hotelFilter = hotelIds
      ? hotelIds.split(",").map((id) =>new mongoose.Types.ObjectId(id))
      : [];

    const match = {
      createdAt: { $gte: start, $lte: end },
      ...(hotelFilter.length && { hotelId: { $in: hotelFilter } }),
    };

    const bookings = await BookingModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          bookings: { $sum: 1 },
          earnings: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    const chartData = bookings.map((b) => ({
      fullDate: b._id.date,
      date: new Date(b._id.date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
      bookings: b.bookings,
      earnings: b.earnings,
    }));

    const totalBookings = chartData.reduce((a, b) => a + b.bookings, 0);
    const totalEarnings = chartData.reduce((a, b) => a + b.earnings, 0);
    const avgDays = chartData.length || 1;

    const peak = chartData.reduce(
      (max, curr) => (curr.bookings > max.bookings ? curr : max),
      chartData[0] || { bookings: 0 }
    );

    res.json({
      success: true,
      data: {
        period,
        dateRange: {
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
        },
        chartData,
        summary: {
          totalBookings,
          totalEarnings,
          averageBookingsPerDay: totalBookings / avgDays,
          averageEarningsPerDay: totalEarnings / avgDays,
          peakDay: peak?.date,
          peakBookings: peak?.bookings,
          peakEarnings: peak?.earnings,
        },
      },
      meta: {
        hotelIds: hotelFilter,
        hotelCount: hotelFilter.length,
      },
    });
  } catch (err) {
    console.error("Revenue-booking error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getDailyBookings = async (req, res) => {
  try {
    const { period = "last_7_days", hotelIds } = req.query;

    const periods = {
      today: 0,
      last_7_days: 7,
      last_15_days: 15,
      last_30_days: 30,
    };

    if (!(period in periods)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PERIOD",
          message:
            "Invalid period parameter. Must be one of: today, last_7_days, last_15_days, last_30_days",
        },
      });
    }

    const days = periods[period];
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const hotelFilter = hotelIds
      ? hotelIds.split(",").map((id) =>new mongoose.Types.ObjectId(id))
      : [];

    const match = {
      createdAt: { $gte: start, $lte: end },
      ...(hotelFilter.length && { hotelId: { $in: hotelFilter } }),
    };

    const bookings = await BookingModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    const bookingData = bookings.map((b) => {
      const fullDate = b._id.date;
      const dateObj = new Date(fullDate);
      return {
        fullDate,
        date: dateObj.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
        bookings: b.bookings,
        dayOfWeek: dateObj.toLocaleDateString("en-US", { weekday: "long" }),
      };
    });

    const totalBookings = bookingData.reduce((sum, d) => sum + d.bookings, 0);
    const averageBookingsPerDay = totalBookings / (bookingData.length || 1);

    const peak = bookingData.reduce(
      (max, curr) => (curr.bookings > max.bookings ? curr : max),
      bookingData[0] || { bookings: 0 }
    );
    const low = bookingData.reduce(
      (min, curr) => (curr.bookings < min.bookings ? curr : min),
      bookingData[0] || { bookings: 0 }
    );

    res.json({
      success: true,
      data: {
        period,
        dateRange: {
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
        },
        bookingData,
        analytics: {
          totalBookings,
          averageBookingsPerDay,
          peakBookingDay: peak.date,
          peakBookings: peak.bookings,
          lowestBookingDay: low.date,
          lowestBookings: low.bookings,
        },
      },
      meta: {
        hotelIds: hotelFilter,
        hotelCount: hotelFilter.length,
      },
    });
  } catch (err) {
    console.error("Daily bookings error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Inventory Api
const GetRoomOccupancyReport = async (req, res, next) => {
  try {
    const { hotelIds, startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        status: false,
        message: "startDate and endDate are required.",
      });
    }

    const hotelIdArray =
      hotelIds && hotelIds.length > 0
        ? hotelIds.split(",").map((id) => mongoose.Types.ObjectId(id.trim()))
        : req.branch;

    const start = moment(startDate, "YYYY-MM-DD").startOf("day");
    const end = moment(endDate, "YYYY-MM-DD").endOf("day");

    // Fetch all rooms for these hotels
    const allRooms = await Roommodal.find({ hotelId: { $in: hotelIdArray } });

    const hotelRoomStats = {};
    for (const room of allRooms) {
      const hotelIdStr = room.hotelId.toString();
      const roomIdStr = room._id.toString();
      const units = room.availability || 0;

      if (!hotelRoomStats[hotelIdStr]) {
        hotelRoomStats[hotelIdStr] = {
          totalRooms: 0,
          roomUnitsMap: {},
        };
      }

      hotelRoomStats[hotelIdStr].totalRooms += units;
      hotelRoomStats[hotelIdStr].roomUnitsMap[roomIdStr] = units;
    }

    // Fetch bookings overlapping with given date range
    const bookings = await BookingModel.find({
      hotelId: { $in: hotelIdArray },
      checkInDate: { $lt: end.toDate() },
      checkOutDate: { $gt: start.toDate() },
      status: { $in: ["booked", "checkin", "checkout"] },
    }).select("hotelId roomId checkInDate checkOutDate");

    const roomData = {};

    for (const [hotelIdStr, { totalRooms }] of Object.entries(hotelRoomStats)) {
      roomData[hotelIdStr] = {};

      const current = moment(start);
      while (current.isSameOrBefore(end, "day")) {
        const dateStr = current.format("YYYY-MM-DD");

        const dailyBookings = bookings.filter(
          (b) =>
            b.hotelId.toString() === hotelIdStr &&
            moment(b.checkInDate).isSameOrBefore(current, "day") &&
            moment(b.checkOutDate).isAfter(current, "day")
        );

        let soldRooms = 0;
        for (const booking of dailyBookings) {
          if (Array.isArray(booking.roomId)) {
            soldRooms += booking.roomId.length;
          } else if (booking.roomId) {
            soldRooms += 1;
          }
        }

        const availableRooms = Math.max(0, totalRooms - soldRooms);
        const occupancyRate =
          totalRooms > 0 ? Math.round((soldRooms / totalRooms) * 100) : 0;

        roomData[hotelIdStr][dateStr] = {
          totalRooms,
          soldRooms,
          availableRooms,
          occupancyRate,
        };

        current.add(1, "day");
      }
    }

    res.status(200).json({
      status: true,
      message: "Room occupancy data fetched successfully",
      data: roomData,
    });
  } catch (err) {
    console.error("Error in GetRoomOccupancyReport:", err);
    next(err);
  }
};

const getBookingSummary = async (req, res) => {
  try {
    const { from, to, page = 1, limit = 10, hotelId } = req.query;

   const startDate = from ? new Date(from) : new Date("2024-01-01");
const endDate = to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : new Date();


    // Common filter for both bookings and recentBookings
    const baseFilter = {
      createdAt: { $gte: startDate, $lte: endDate },
      hotelId:req.branch
    };
    if (hotelId && hotelId !== "all") {
      baseFilter.hotelId = hotelId;
    }

    // 1️⃣ Summary + Trends bookings
    const bookings = await BookingModel.find(baseFilter);

    const confirmedBookings = bookings.filter(
      (b) => b.status === "booked" || b.status === "checkin" || b.status === "checkout"
    );
    const cancelledBookings = bookings.filter((b) => b.status === "cancelled");

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const avgBookingValue = totalBookings ? totalRevenue / totalBookings : 0;

    const totalBookingsGrowth = 18;
    const avgBookingValueGrowth = 8;

    const confirmationRate = totalBookings ? (confirmedBookings.length / totalBookings) * 100 : 0;
    const cancellationRate = totalBookings ? (cancelledBookings.length / totalBookings) * 100 : 0;

    // 2️⃣ Monthly Trends
    const monthlyTrendsMap = new Map();
    bookings.forEach((b) => {
      const date = new Date(b.createdAt);
      const month = date.toLocaleString("default", { month: "short" });
      const monthName = date.toLocaleString("default", { month: "long" });
      const year = date.getFullYear();
      const key = `${month}-${year}`;

      if (!monthlyTrendsMap.has(key)) {
        monthlyTrendsMap.set(key, {
          month,
          monthName,
          year,
          bookings: 0,
          revenue: 0,
          bookingGrowth: 0,
          revenueGrowth: 0,
        });
      }

      const stats = monthlyTrendsMap.get(key);
      stats.bookings += 1;
      stats.revenue += b.totalAmount || 0;
    });

    const monthlyTrends = Array.from(monthlyTrendsMap.values()).sort(
      (a, b) => new Date(`${a.monthName} 1, ${a.year}`) - new Date(`${b.monthName} 1, ${b.year}`)
    );

    for (let i = 1; i < monthlyTrends.length; i++) {
      const prev = monthlyTrends[i - 1];
      const curr = monthlyTrends[i];
      curr.bookingGrowth = prev.bookings
        ? (((curr.bookings - prev.bookings) / prev.bookings) * 100).toFixed(1)
        : 0;
      curr.revenueGrowth = prev.revenue
        ? (((curr.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1)
        : 0;
    }

    // 3️⃣ Recent Bookings with Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalRecentBookings = await BookingModel.countDocuments(baseFilter);

    const recentBookings = await BookingModel.find(baseFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("hotelId");

    const formattedRecent = recentBookings.map((b) => ({
      id: b._id.toString(),
      bookingReference: b.bookingId,
      guest: {
        name: b.userInfo[0]?.name || "N/A",
        email: b.userInfo[0]?.email || "",
        phone: b.userInfo[0]?.phone || "",
        guestId: b.userId?.toString() || "",
      },
      hotel: {
        name: b.hotelId?.hotelName || "",
        id: b.hotelId?._id?.toString() || "",
        location: `${b.hotelId?.city || ""}, ${b.hotelId?.country || ""}`,
      },
      checkIn: b.checkInDate,
      checkOut: b.checkOutDate,
      nights: b.stayDuration,
      rooms: b.roomId.length,
      roomType: "",
      amount: b.totalAmount,
      currency: "INR",
      status: b.status,
      bookingDate: b.createdAt,
      paymentStatus: b.paymentDetails?.status || "Pending",
      cancellationPolicy: "",
    }));

    // ✅ Final Response
    res.json({
      success: true,
      data: {
        summary: {
          totalBookings,
          totalBookingsGrowth,
          confirmedBookings: confirmedBookings.length,
          confirmationRate: parseFloat(confirmationRate.toFixed(1)),
          cancelledBookings: cancelledBookings.length,
          cancellationRate: parseFloat(cancellationRate.toFixed(1)),
          avgBookingValue: Math.round(avgBookingValue),
          avgBookingValueGrowth,
        },
        monthlyTrends,
        recentBookings: formattedRecent,
        filters: {
          dateRange: {
            from: startDate.toISOString().split("T")[0],
            to: endDate.toISOString().split("T")[0],
          },
          selectedPeriod: "6months",
          hotels: [hotelId || "all"],
          status: ["all"],
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRecentBookings / limit),
          totalRecords: totalRecentBookings,
          recordsPerPage: parseInt(limit),
        },
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        reportType: "booking-summary",
        version: "1.0",
        currency: "INR",
      },
    });
  } catch (err) {
    console.error("Booking summary error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// Payment Report

module.exports = {
  GetRoomOccupancyReport,
  getCounts,
  getRevenueVsBooking,
  getDailyBookings,
  getBookingSummary
};
