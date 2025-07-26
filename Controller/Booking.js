const axios = require("axios");
const sha256 = require("sha256");
const uniqid = require("uniqid");
const AppErr = require("../Helper/AppError");
const Hotelmodel = require("../Model/Hotel");
const Roommodal = require("../Model/Rooms");
const Bookingmodal = require("../Model/Booking");
const Paymentmodal = require("../Model/Payments");
const { validationResult } = require("express-validator");
require("dotenv").config();
const mongoose = require("mongoose");
const Usermodel = require("../Model/User");
const BookingModel = require("../Model/Booking");
const moment = require("moment");
const Cashmodel = require("../Model/Cash");

// Create Payment Payload
const createPaymentPayload = (
  transactionid,
  TotalAmount,
  Phonenumber,
  Name,
  Age,
  bookingid
) => {
  const userid = `${Phonenumber} ${Name} ${Age} ${bookingid}`;
  let normalPayLoad = {
    merchantId: process.env.MERCHANT_ID,
    merchantTransactionId: transactionid,
    merchantUserId: userid,
    amount: TotalAmount * 100,
    redirectUrl: `${process.env.APP_BASE_URL}/api/v1/booking/payment/validate/${transactionid}`,
    redirectMode: "REDIRECT",
    mobileNumber: Phonenumber,
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  return Buffer.from(JSON.stringify(normalPayLoad), "utf8").toString("base64");
};

// Helper function to calculate stay duration
const calculateStayDuration = (checkIn, checkOut) => {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const timeDiff = checkOutDate - checkInDate;
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
};

// Create Booking
const BookRoom = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let err = validationResult(req);
    if (err.errors.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppErr(err.errors[0].msg, 403));
    }

    let bookingid = uniqid();
    let transactionid = uniqid();
    let {
      hotelId,
      roomId,
      checkInDate,
      checkOutDate,
      userInfo,
      guests,
      addOns,
      couponCode,
      discountAmount,
      taxAmount,
      totalAmount,
      pendingAmount,
      userId,
    } = req.body;

    if (!userInfo || !userInfo.length) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppErr("User Info Not Found", 404));
    }

    let { name, phone, email, age } = userInfo[0];

    // Validate hotel
    let hotel = await Hotelmodel.findById(hotelId).session(session);
    if (!hotel) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppErr("Hotel Not Found", 404));
    }

    // Validate rooms
    let rooms = await Roommodal.find({ _id: { $in: roomId } }).session(session);
    if (!rooms || rooms.length !== roomId.length) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppErr("One or more rooms not found", 404));
    }

    // Create user if not exists
    if (!userId) {
      let existingUser = await Usermodel.findOne({ Number: phone });
      if (!existingUser) {
        await Usermodel.create({
          Number: phone,
        });
      }
    }

    // Calculate stay duration
    const stayDuration = calculateStayDuration(checkInDate, checkOutDate);

    // Create booking data
    const bookingData = {
      bookingId: bookingid,
      hotelId: hotelId,
      roomId: roomId,
      userId: userId,
      userInfo: userInfo,
      guests: guests || { adults: 1, children: 0 },
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
      stayDuration: stayDuration,
      bookingType: "Online",
      addOns: addOns || [],
      couponCode: couponCode || "",
      discountAmount: discountAmount || 0,
      taxAmount: taxAmount || 0,
      totalAmount: totalAmount,
      pendingAmount: pendingAmount || 0,
      paymentDetails: {
        method: "Online",
        status: "pending",
      },
      status: "pending",
      statusHistory: [
        {
          status: "pending",
          timestamp: new Date(),
          note: "Booking created",
        },
      ],
    };

    // Create booking (in transaction)
    let bookingroom = await Bookingmodal.create([bookingData], { session });

    // Create payment (in transaction)
    let paymentData = {
      hotelId: hotelId,
      bookingId: bookingroom[0]._id,
      merchantTransactionId: transactionid,
      paymentMethod: "UPI", // Default for online payments
      tax: taxAmount || 0,
      addOnsAmount: addOns
        ? addOns.reduce((sum, addon) => sum + addon.cost, 0)
        : 0,
      totalAmount: totalAmount,
      amountPaid: 0,
      pendingAmount: totalAmount,
      discountAmount: discountAmount || 0,
      status: "pending",
    };

    let paymentcreate = await Paymentmodal.create([paymentData], { session });

    // Update booking with payment reference
    bookingroom[0].paymentDetails.paymentId = paymentcreate[0]._id;
    await bookingroom[0].save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Prepare payment payload
    const base64EncodedPayload = createPaymentPayload(
      transactionid,
      totalAmount,
      phone,
      name,
      age,
      bookingid
    );

    // Generate checksum
    let string = base64EncodedPayload + "/pg/v1/pay" + process.env.SALT_KEY;
    let sha256_val = sha256(string);
    let xVerifyChecksum = sha256_val + "###" + process.env.SALT_INDEX;

    // Initiate Payment
    axios
      .post(
        `${process.env.PHONE_PE_HOST_URL}/pg/v1/pay`,
        { request: base64EncodedPayload },
        {
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": xVerifyChecksum,
            accept: "application/json",
          },
        }
      )
      .then(async (response) => {
        res.status(200).json({
          status: true,
          code: 200,
          message: "success",
          data: response.data.data.instrumentResponse.redirectInfo.url,
        });
      })
      .catch(function (error) {
        res.status(400).json({
          status: true,
          code: 400,
          message: "Error during payment initiation",
          data: error.message,
        });
      });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(new AppErr(error.message, 500));
  }
};

// Validate Payment
const ValidatePayment = async (req, res, next) => {
  try {
    const { merchantTransactionId } = req.params;
    const PHONE_PE_HOST_URL = process.env.PHONE_PE_HOST_URL;

    let statusUrl = `${PHONE_PE_HOST_URL}/pg/v1/status/${process.env.MERCHANT_ID}/${merchantTransactionId}`;
    let string = `/pg/v1/status/${process.env.MERCHANT_ID}/${merchantTransactionId}${process.env.SALT_KEY}`;
    let sha256_val = sha256(string);
    let xVerifyChecksum = sha256_val + "###" + process.env.SALT_INDEX;

    axios
      .get(statusUrl, {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerifyChecksum,
          "X-MERCHANT-ID": merchantTransactionId,
          accept: "application/json",
        },
      })
      .then(async (response) => {
        if (response.data && response.data.code === "PAYMENT_SUCCESS") {
          let payment = await Paymentmodal.findOne({
            merchantTransactionId: merchantTransactionId,
          });

          if (!payment) {
            return res.status(404).json({
              status: false,
              code: 404,
              message: "Payment record not found",
            });
          }

          // Update payment status
          payment.status = "paid";
          payment.amountPaid = payment.totalAmount;
          payment.pendingAmount = 0;
          payment.transactionTime = new Date();
          payment.gatewayResponse = {
            code: response.data.code,
            message: response.data.message,
            raw: response.data,
          };

          let booking = await Bookingmodal.findById(payment.bookingId);
          if (!booking) {
            return res.status(404).json({
              status: false,
              code: 404,
              message: "Booking not found",
            });
          }

          // Update booking status
          booking.paymentDetails.status = "paid";
          booking.status = "booked";
          booking.amountPaid = payment.totalAmount;
          booking.pendingAmount = 0;
          booking.statusHistory.push({
            status: "booked",
            timestamp: new Date(),
            note: "Payment successful",
          });

          // Update room availability (if needed)
          // Note: You might want to implement a booking date system here
          // based on your room availability logic

          await payment.save();
          await booking.save();

          return res.status(200).json({
            status: true,
            code: 200,
            message: "Payment Success",
            data: response.data,
          });
        } else {
          // Update payment as failed
          let payment = await Paymentmodal.findOne({
            merchantTransactionId: merchantTransactionId,
          });

          if (payment) {
            payment.status = "failed";
            payment.gatewayResponse = {
              code: response.data.code,
              message: response.data.message,
              raw: response.data,
            };
            await payment.save();

            // Update booking status
            let booking = await Bookingmodal.findById(payment.bookingId);
            if (booking) {
              booking.paymentDetails.status = "failed";
              booking.status = "failed";
              booking.statusHistory.push({
                status: "failed",
                timestamp: new Date(),
                note: "Payment failed",
              });
              await booking.save();
            }
          }

          return res.status(400).json({
            status: false,
            code: 400,
            message: "Payment Failed",
            data: response.data,
          });
        }
      })
      .catch(function (error) {
        res.status(500).json({
          status: false,
          code: 500,
          message: "Error validating payment",
          data: error.message,
        });
      });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Get Booking
const GetBooking = async (req, res, next) => {
  try {
    let { status } = req.query;

    let filter = {
      hotelId: { $in: req.branch },
    };

    if (status) {
      filter.status = status;
    }

    let bookings = await Bookingmodal.find(filter)
      .populate("paymentDetails.paymentId")
      .populate("roomId")
      .populate("hotelId")
      .populate("userId");

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Bookings fetched successfully",
      data: bookings,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Get Booking by Id
const GetBookingById = async (req, res, next) => {
  try {
    let { id } = req.params;

    let booking = await Bookingmodal.findById(id)
      .populate("paymentDetails.paymentId")
      .populate("roomId")
      .populate("hotelId")
      .populate("userId");

    if (!booking) {
      return next(new AppErr("Booking not found", 404));
    }

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Booking fetched successfully",
      data: booking,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Create Offline Booking
const OfflineBooking = async (req, res, next) => {
  try {
    let err = validationResult(req);
    if (err.errors.length > 0) {
      return next(new AppErr(err.errors[0].msg, 403));
    }

    let bookingid = uniqid();
    let transactionid = uniqid();
    let {
      hotelId,
      roomId,
      checkInDate,
      checkOutDate,
      userInfo,
      guests,
      addOns,
      couponCode,
      discountAmount,
      taxAmount,
      totalAmount,
      userId,
      paymentstatus,
      paymentMethod,
    } = req.body;

    if (!userInfo || !userInfo.length) {
      return next(new AppErr("User Info Not Found", 404));
    }

    let { name, phone } = userInfo[0];

    // Validate hotel
    let hotel = await Hotelmodel.findById(hotelId);
    if (!hotel) {
      return next(new AppErr("Hotel Not Found", 404));
    }

    // Validate rooms
    let rooms = await Roommodal.find({ _id: { $in: roomId } });
    if (!rooms || rooms.length !== roomId.length) {
      return next(new AppErr("One or more rooms not found", 404));
    }

    // Create user if not exists
    if (!userId) {
      let existingUser = await Usermodel.findOne({ Number: phone });
      if (!existingUser) {
        await Usermodel.create({
          Number: phone,
        });
      }
    }

    // Calculate stay duration
    const stayDuration = calculateStayDuration(checkInDate, checkOutDate);

    // Create booking data
    const bookingData = {
      bookingId: bookingid,
      hotelId: hotelId,
      roomId: roomId,
      userId: userId,
      userInfo: userInfo,
      guests: guests || { adults: 1, children: 0 },
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
      stayDuration: stayDuration,
      bookingType: "Offline",
      addOns: addOns || [],
      couponCode: couponCode || "",
      discountAmount: discountAmount || 0,
      taxAmount: taxAmount || 0,
      totalAmount: totalAmount,
      pendingAmount: paymentstatus === "Paid" ? 0 : totalAmount,
      amountPaid: paymentstatus === "Paid" ? totalAmount : 0,
      paymentDetails:
        paymentstatus === "Paid"
          ? {
              method: paymentMethod,
              status: "paid",
            }
          : {
              method: "",
              status: "pending",
            },
      status: "booked",
      statusHistory: [
        {
          status: "booked",
          timestamp: new Date(),
          note: "Offline booking created",
        },
      ],
    };

    let bookingroom = await Bookingmodal.create(bookingData);

    // Create payment details
    let paymentData = {
      hotelId: hotelId,
      bookingId: bookingroom._id,
      merchantTransactionId: transactionid,
      paymentMethod: paymentMethod,
      tax: taxAmount || 0,
      addOnsAmount: addOns
        ? addOns.reduce((sum, addon) => sum + addon.cost, 0)
        : 0,
      totalAmount: totalAmount,
      amountPaid: paymentstatus === "Paid" ? totalAmount : 0,
      pendingAmount: paymentstatus === "Paid" ? 0 : totalAmount,
      discountAmount: discountAmount || 0,
      status: paymentstatus === "Paid" ? "paid" : "pending",
    };

    let paymentcreate = await Paymentmodal.create(paymentData);

    // Update booking with payment reference
    bookingroom.paymentDetails.paymentId = paymentcreate._id;
    await bookingroom.save();

    if (paymentstatus === "Paid" && paymentMethod === "Cash") {
      let res = await Cashmodel.create({
        hotelId: bookingroom.hotelId,
        amount: bookingroom.totalAmount,
        type: "booking",
        remarks: "While booking rooms",
      });
    }

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Offline booking created successfully",
      data: bookingroom,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Update Booking Status
const UpdateBookingstatus = async (req, res, next) => {
  try {
    let { status, bookingid, paymentMethod, roomno } = req.query;

    let booking = await Bookingmodal.findById(bookingid);
    if (!booking) {
      return next(new AppErr("Booking not found", 404));
    }

    // Validate status
    const validStatuses = [
      "assignRoom",
      "collectPayment",
      "pending",
      "cancelled",
      "failed",
      "booked",
      "checkin",
      "checkout",
      "noshow",
    ];
    if (!validStatuses.includes(status)) {
      return next(new AppErr("Invalid status", 400));
    }

    // Update booking status
    if (status !== "collectPayment" && status !== "assignRoom") {
      booking.status = status;
      booking.statusHistory.push({
        status: status,
        timestamp: new Date(),
        note: `Status updated to ${status}`,
      });
    }

    // Handle cancellation
    if (status === "cancelled") {
      booking.cancellation.isCancelled = true;
      booking.cancellation.cancelDate = new Date();
      booking.cancellation.cancelledBy = "admin";
    }

    if (status === "assignRoom") {
      booking.RoomNo.push(roomno);
    }

    if (status === "collectPayment") {
      let payment = await Paymentmodal.findOne({ bookingId: bookingid });
      if (booking.status === "booked") {
        if (booking.pendingAmount > 0 && paymentMethod === "Cash") {
          let res = await Cashmodel.create({
            hotelId: booking.hotelId,
            amount: booking.pendingAmount,
            type: "booking",
            remarks: "checkin pending amount payment",
          });
        }
        booking.pendingAmount = 0;
        booking.amountPaid = booking.totalAmount;
        booking.paymentDetails = {
          method: paymentMethod,
          status: "paid",
        };
        booking.RoomNo.push(roomno);

        if (payment) {
          payment.pendingAmount = 0;
          payment.amountPaid = payment.totalAmount;
          payment.paymentMethod = paymentMethod;
          await payment.save();
        }
      } else {
        if (booking.pendingAmount > 0 && paymentMethod === "Cash") {
          let res = await Cashmodel.create({
            hotelId: booking.hotelId,
            amount: booking.pendingAmount,
            type: "booking",
            remarks: "checkin pending amount payment",
          });
        }
        booking.pendingAmount = 0;
        booking.amountPaid = booking.totalAmount;

        if (payment) {
          payment.pendingAmount = 0;
          payment.amountPaid = payment.totalAmount;
          payment.paymentMethod = paymentMethod;
          await payment.save();
        }
      }
    }

    if (status === "checkout") {
      let payment = await Paymentmodal.findOne({ bookingId: bookingid });
      if (payment) {
        payment.pendingAmount = 0;
        payment.amountPaid = payment.totalAmount;
        payment.status = "paid";
        await payment.save();
      }
      booking.RoomNo = [];
      if (booking.paymentDetails.status === "paid") {
        booking.pendingAmount = 0;
      }
    }

    await booking.save();

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Booking status updated successfully",
      data: booking,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Get Payment
const GetPayment = async (req, res, next) => {
  try {
    let { status } = req.query;

    let filter = {
      hotelId: { $in: req.branch },
    };

    if (status) {
      filter.status = status;
    }

    let payments = await Paymentmodal.find(filter)
      .populate("bookingId")
      .populate("hotelId");

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Payments fetched successfully",
      data: payments,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Get Payment By Id
const GetPaymentById = async (req, res, next) => {
  try {
    let { id } = req.params;

    let payment = await Paymentmodal.findById(id)
      .populate("bookingId")
      .populate("hotelId");

    if (!payment) {
      return next(new AppErr("Payment not found", 404));
    }

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Payment fetched successfully",
      data: payment,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// create addons

const CreateAddons = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { addOns, status } = req.body;

    if (!Array.isArray(addOns) || addOns.length === 0) {
      return next(new AppErr("addOns array is required", 400));
    }

    if (!["paid", "pending"].includes(status)) {
      return next(new AppErr("Status must be 'paid' or 'pending'", 400));
    }

    const booking = await BookingModel.findById(bookingId);
    if (!booking) return next(new AppErr("Booking not found", 404));

    // Validate and add addons
    for (let addon of addOns) {
      if (!addon.serviceName || addon.cost == null) {
        return next(
          new AppErr("Each addOn must have serviceName and cost", 400)
        );
      }

      // Push to booking.addOns (without status)
      booking.addOns.push({
        serviceName: addon.serviceName,
        cost: addon.cost,
      });
    }

    const totalAddonCost = addOns.reduce((sum, a) => sum + (a.cost || 0), 0);

    // Update booking amounts
    booking.totalAmount += totalAddonCost;

    if (status === "paid") {
      booking.amountPaid += totalAddonCost;
    } else {
      booking.pendingAmount += totalAddonCost;
    }

    await booking.save();

    res.status(200).json({
      status: true,
      message: `Add-ons added and ${status} amount updated`,
      data: booking,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// update addons

const UpdateAddon = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { index, newServiceName, newCost, status } = req.body;

    const booking = await BookingModel.findById(bookingId);
    if (!booking) return next(new AppErr("Booking not found", 404));

    if (index < 0 || index >= booking.addOns.length) {
      return next(new AppErr("Invalid addon index", 400));
    }

    const oldCost = booking.addOns[index].cost;

    // Update addon
    if (newServiceName) booking.addOns[index].serviceName = newServiceName;
    if (newCost != null) booking.addOns[index].cost = newCost;

    // Adjust financials
    const costDiff = (newCost || oldCost) - oldCost;

    booking.totalAmount += costDiff;

    if (status === "paid") {
      booking.amountPaid += costDiff;
    } else if (status === "pending") {
      booking.pendingAmount += costDiff;
    }

    await booking.save();

    res.status(200).json({
      status: true,
      message: "Addon updated successfully",
      data: booking,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};
// delete addons

const DeleteAddon = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { index, status } = req.body;

    const booking = await BookingModel.findById(bookingId);
    if (!booking) return next(new AppErr("Booking not found", 404));

    if (index < 0 || index >= booking.addOns.length) {
      return next(new AppErr("Invalid addon index", 400));
    }

    const removedAddon = booking.addOns.splice(index, 1)[0];

    booking.totalAmount -= removedAddon.cost;

    if (status === "paid") {
      booking.amountPaid -= removedAddon.cost;
    } else if (status === "pending") {
      booking.pendingAmount -= removedAddon.cost;
    }

    await booking.save();

    res.status(200).json({
      status: true,
      message: "Addon deleted successfully",
      data: booking,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

const GetBookingStatusHistory = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        status: false,
        message: "startDate and endDate are required in YYYY-MM-DD format",
      });
    }

    const start = moment(startDate, "YYYY-MM-DD").startOf("day").toDate();
    const end = moment(endDate, "YYYY-MM-DD").endOf("day").toDate();

    const bookings = await BookingModel.find({
      statusHistory: {
        $elemMatch: {
          timestamp: { $gte: start, $lte: end },
        },
      },
    }).lean();

    const result = [];

    bookings.forEach((booking, index) => {
      const matchedStatuses = booking.statusHistory.filter(
        (status) =>
          new Date(status.timestamp) >= start &&
          new Date(status.timestamp) <= end
      );

      matchedStatuses.forEach((statusEntry) => {
        result.push({
          id: result.length + 1,
          name: booking.userInfo?.[0]?.name || "N/A",
          email: booking.userInfo?.[0]?.email || "N/A",
          phone: booking.userInfo?.[0]?.phone || "N/A",
          room: "N/A",
          status: statusEntry.status || "N/A",
          timestamp:
            moment(statusEntry.timestamp).format("YYYY-MM-DD HH:mm") || "N/A",
          note: statusEntry.note || "N/A",
          preference: booking.userInfo?.[0]?.preference || "N/A",
          address: booking.userInfo?.[0]?.address || "India",
          totalSpent: booking.totalAmount || 0,
        });
      });
    });

    res.status(200).json({
      status: true,
      message: "Guest status history fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  BookRoom,
  ValidatePayment,
  GetBooking,
  GetBookingById,
  OfflineBooking,
  UpdateBookingstatus,
  GetPayment,
  GetPaymentById,
  CreateAddons,
  UpdateAddon,
  DeleteAddon,
  GetBookingStatusHistory,
};
