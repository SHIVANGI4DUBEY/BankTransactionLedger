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


/**
 * ============================================================
 * CREATE NORMAL TRANSACTION
 * POST /api/transactions
 * ============================================================
 */

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
     */

    const balance = await fromUserAccount.getBalance();

    if (balance < amount) {
      return res.status(400).json({
        message:
          `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
      });
    }


    /**
     * 5-9. Database Transaction
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


/**
 * ============================================================
 * CREATE INITIAL FUNDS TRANSACTION
 * POST /api/transactions/system/initial-funds
 *
 * SYSTEM USER → USER ACCOUNT
 * ============================================================
 */

async function createInitialFundsTransaction(req, res) {

  try {

    /**
     * 1. Validate request
     */

    const {
      toAccount,
      amount,
      idempotencyKey
    } = req.body;

    if (
      !toAccount ||
      !amount ||
      !idempotencyKey
    ) {
      return res.status(400).json({
        message:
          "toAccount, amount and idempotencyKey are required"
      });
    }


    /**
     * 2. Find destination account
     */

    const toUserAccount = await accountModel.findOne({
      _id: toAccount
    });

    if (!toUserAccount) {
      return res.status(400).json({
        message: "Invalid toAccount"
      });
    }


    /**
     * 3. Find System User's account
     *
     * authSystemUserMiddleware has already verified:
     *
     * req.user.systemUser === true
     *
     * Therefore we only need to find the
     * account belonging to req.user.
     */

    const fromUserAccount = await accountModel.findOne({
      user: req.user._id,
      status: "Active"
    });

    if (!fromUserAccount) {
      return res.status(400).json({
        message: "System user account not found"
      });
    }


    /**
     * 4. Validate amount
     */

    if (amount <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero"
      });
    }


    /**
     * Prevent System from sending to itself
     */

    if (
      fromUserAccount._id.toString() ===
      toUserAccount._id.toString()
    ) {
      return res.status(400).json({
        message:
          "System account and destination account cannot be the same"
      });
    }


    /**
     * 5. Idempotency check
     */

    const existingTransaction =
      await transactionModel.findOne({
        idempotencyKey
      });

    if (existingTransaction) {

      if (existingTransaction.status === "Completed") {
        return res.status(200).json({
          message: "Initial funds transaction already processed",
          transaction: existingTransaction
        });
      }

      if (existingTransaction.status === "Pending") {
        return res.status(200).json({
          message: "Initial funds transaction is still in process"
        });
      }
    }


    /**
     * 6. Start MongoDB transaction
     */

    const session = await mongoose.startSession();

    try {

      session.startTransaction();


      /**
       * 7. Create transaction
       */

      const transactionResult =
        await transactionModel.create(
          [
            {
              fromAccount: fromUserAccount._id,
              toAccount: toUserAccount._id,
              amount: amount,
              idempotencyKey: idempotencyKey,
              status: "Pending"
            }
          ],
          { session }
        );

      const transaction = transactionResult[0];


      /**
       * 8. Debit System Account
       */

      await ledgerModel.create(
        [
          {
            account: fromUserAccount._id,
            amount: amount,
            transaction: transaction._id,
            type: "Debit"
          }
        ],
        { session }
      );


      /**
       * 9. Credit User Account
       */

      await ledgerModel.create(
        [
          {
            account: toUserAccount._id,
            amount: amount,
            transaction: transaction._id,
            type: "Credit"
          }
        ],
        { session }
      );


      /**
       * 10. Mark transaction as Completed
       */

      transaction.status = "Completed";

      await transaction.save({
        session
      });


      /**
       * 11. Commit transaction
       */

      await session.commitTransaction();


      /**
       * Close session
       */

      session.endSession();


      /**
       * 12. Send response
       */

      return res.status(201).json({
        message:
          "Initial funds transaction completed successfully",
        transaction: transaction
      });

    } catch (error) {

      await session.abortTransaction();
      session.endSession();

      console.error(
        "Initial funds transaction failed:",
        error
      );

      return res.status(500).json({
        message:
          "Initial funds transaction processing failed",
        error: error.message
      });
    }

  } catch (error) {

    console.error(
      "Create initial funds transaction error:",
      error
    );

    return res.status(500).json({
      message: "Internal server error"
    });
  }
}


/**
 * ============================================================
 * EXPORTS
 * ============================================================
 */

module.exports = {
  createTransaction,
  createInitialFundsTransaction
};