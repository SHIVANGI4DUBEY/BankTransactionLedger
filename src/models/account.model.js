const mongoose = require("mongoose");
const ledgerModel = require("../models/ledger.model");

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "Account must be associated with a user"],

      // Single user can hold multiple accounts
      // Index makes searching by user faster
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: ["Active", "Frozen", "Closed"],
        message: "Status can be Active, Frozen or Closed",
      },
      default: "Active",
    },

    currency: {
      type: String,
      required: [true, "Currency is required for creating an account"],
      default: "INR",
    },

    // Balance is not stored in DB.
    // It is calculated from the ledger.
  },
  {
    timestamps: true,
  }
);


// Compound index
// Makes queries using both user and status faster
accountSchema.index({ user: 1, status: 1 });


// Calculate account balance from ledger
accountSchema.methods.getBalance = async function () {

  const balanceData = await ledgerModel.aggregate([

    // 1. Find all ledger entries belonging to this account
    {
      $match: {
        account: this._id,
      },
    },

    // 2. Calculate total debit and total credit
    {
      $group: {
        _id: null,

        totalDebit: {
          $sum: {
            $cond: [
              { $eq: ["$type", "Debit"] },
              "$amount",
              0,
            ],
          },
        },

        totalCredit: {
          $sum: {
            $cond: [
              { $eq: ["$type", "Credit"] },
              "$amount",
              0,
            ],
          },
        },
      },
    },

    // 3. Calculate balance
    {
      $project: {
        _id: 0,
        balance: {
          $subtract: ["$totalCredit", "$totalDebit"],
        },
      },
    },
  ]);


  // If no ledger entries exist, balance = 0
  return balanceData.length > 0
    ? balanceData[0].balance
    : 0;
};


const accountModel = mongoose.model("account", accountSchema);

module.exports = accountModel;