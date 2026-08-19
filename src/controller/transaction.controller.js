/**
 * Transaction Flow
 *
 * 1. Validate request
 * 2. Validate idempotency key
 * 3. Check Account status
 * 4. Derive sender balance from ledger
 * 5. Create Transaction [Pending]
 * 6. Create Debit Ledger Entry
 * 7. Create Credit Ledger Entry
 * 8. Mark Transaction [Completed]
 * 9. Commit MongoDB transaction
 * 10. Send email notification
 */

const mongoose = require("mongoose");
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");


async function createTransaction(req, res) {

  try {

    /**
     * 1. Validate request
     */

    const {
      fromAccount,
      toAccount,
      amount,
      idempotencyKey
    } = req.body;

    if (
      !fromAccount ||
      !toAccount ||
      !amount ||
      !idempotencyKey
    ) {
      return res.status(400).json({
        message:
          "From-Account, To-Account, amount and idempotencyKey are required"
      });
    }


    /**
     * Find sender and receiver accounts
     */

    const fromUserAccount = await accountModel.findOne({
      _id: fromAccount
    });

    const toUserAccount = await accountModel.findOne({
      _id: toAccount
    });

    if (!fromUserAccount || !toUserAccount) {
      return res.status(400).json({
        message: "Invalid fromAccount or toAccount"
      });
    }


    /**
     * 2. Validate idempotency key
     *
     * Prevents the same transaction from
     * being processed multiple times.
     */

    const isTransactionAlreadyExists =
      await transactionModel.findOne({
        idempotencyKey: idempotencyKey
      });

    if (isTransactionAlreadyExists) {

      if (isTransactionAlreadyExists.status === "Completed") {
        return res.status(200).json({
          message: "Transaction already processed",
          transaction: isTransactionAlreadyExists
        });
      }

      if (isTransactionAlreadyExists.status === "Pending") {
        return res.status(200).json({
          message: "Transaction is still in process"
        });
      }

      if (isTransactionAlreadyExists.status === "Failed") {
        return res.status(500).json({
          message:
            "Transaction processing failed. Please retry."
        });
      }

      if (isTransactionAlreadyExists.status === "Reversed") {
        return res.status(500).json({
          message:
            "Transaction was reversed. Please retry."
        });
      }
    }


    /**
     * 3. Check Account status
     */

    if (
      fromUserAccount.status !== "Active" ||
      toUserAccount.status !== "Active"
    ) {
      return res.status(400).json({
        message:
          "Both fromAccount and toAccount must be active to process transaction"
      });
    }


    /**
     * Prevent transferring to the same account
     */

    if (fromAccount === toAccount) {
      return res.status(400).json({
        message:
          "From account and To account cannot be the same"
      });
    }


    /**
     * Validate amount
     */

    if (amount <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero"
      });
    }


    /**
     * 4. Derive sender balance from ledger
     *
     * Ledger is the single source of truth.
     */

    const balance = await fromUserAccount.getBalance();

    if (balance < amount) {
      return res.status(400).json({
        message:
          `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
      });
    }


    /**
     * 5-8. Database Transaction
     *
     * Either ALL database operations succeed
     * or ALL of them are rolled back.
     */

    const session = await mongoose.startSession();

    try {

      session.startTransaction();


      /**
       * 5. Create Transaction [Pending]
       */

      const transactionResult = await transactionModel.create(
        [
          {
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "Pending"
          }
        ],
        { session }
      );

      const transaction = transactionResult[0];


      /**
       * 6. Create Debit Ledger Entry
       */

      await ledgerModel.create(
        [
          {
            account: fromAccount,
            amount: amount,
            transaction: transaction._id,
            type: "Debit"
          }
        ],
        { session }
      );


      /**
       * 7. Create Credit Ledger Entry
       */

      await ledgerModel.create(
        [
          {
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "Credit"
          }
        ],
        { session }
      );


      /**
       * 8. Mark Transaction as Completed
       */

      transaction.status = "Completed";

      await transaction.save({
        session
      });


      /**
       * 9. Commit MongoDB transaction
       */

      await session.commitTransaction();

      session.endSession();


      /**
       * 10. Send email notification
       *
       * Email is sent AFTER database commit.
       * If email fails, the money transaction
       * should not be rolled back.
       */

      await emailService.sendTransactionEmail(
        req.user.email,
        req.user.name,
        amount,
        fromAccount,
        toAccount
      );


      /**
       * Send response
       */

      return res.status(201).json({
        message: "Transaction completed successfully!",
        transaction: transaction
      });

    } catch (error) {

      /**
       * Rollback database transaction
       */

      await session.abortTransaction();
      session.endSession();

      console.error(
        "Transaction failed:",
        error
      );

      return res.status(500).json({
        message: "Transaction processing failed"
      });
    }

  } catch (error) {

    console.error(
      "Create transaction error:",
      error
    );

    return res.status(500).json({
      message: "Internal server error"
    });
  }
}


module.exports = {
    createTransaction
};