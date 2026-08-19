require("dotenv").config();
const nodemailer = require("nodemailer");

// Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify email server connection
transporter.verify((error, success) => {
  if (error) {
    console.error("Error connecting to email server:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});


// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Backend Ledger" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("Message sent: %s", info.messageId);

    return info;
  } catch (error) {
    console.error("Error sending email:", error);
  }
};


// Registration email
async function sendRegistrationEmail(userEmail, name) {
  const subject = "Welcome to Backend Ledger!";

  const text = `Hello ${name},

Thank you for registering at Backend Ledger.

We're excited to have you on board!

Best regards,
The Backend Ledger Team`;

  const html = `
    <p>Hello ${name},</p>

    <p>
      Thank you for registering at Backend Ledger.
    </p>

    <p>
      We're excited to have you on board!
    </p>

    <p>
      Best regards,<br>
      The Backend Ledger Team
    </p>
  `;

  return await sendEmail(
    userEmail,
    subject,
    text,
    html
  );
}


// Successful transaction email
async function sendTransactionEmail(
  userEmail,
  name,
  amount,
  fromAccount,
  toAccount
) {
  const subject = "Transaction Successful - Backend Ledger";

  const text = `Hello ${name},

Your transaction was successful.

Transaction Details:

Amount: ₹${amount}
From Account: ${fromAccount}
To Account: ${toAccount}

Your transaction has been successfully processed.

Best regards,
The Backend Ledger Team`;

  const html = `
    <p>Hello ${name},</p>

    <p>
      Your transaction was <strong>successful</strong>.
    </p>

    <h3>Transaction Details</h3>

    <p>
      <strong>Amount:</strong> ₹${amount}<br>
      <strong>From Account:</strong> ${fromAccount}<br>
      <strong>To Account:</strong> ${toAccount}
    </p>

    <p>
      Your transaction has been successfully processed.
    </p>

    <p>
      Best regards,<br>
      The Backend Ledger Team
    </p>
  `;

  return await sendEmail(
    userEmail,
    subject,
    text,
    html
  );
}


// Transaction failure email
async function sendTransactionFailureEmail(
  userEmail,
  name,
  amount,
  fromAccount,
  toAccount
) {
  const subject = "Transaction Failed - Backend Ledger";

  const text = `Hello ${name},

Unfortunately, your transaction could not be completed.

Transaction Details:

Amount: ₹${amount}
From Account: ${fromAccount}
To Account: ${toAccount}

Please check your account details and try again.

If you believe this was an error, please contact support.

Best regards,
The Backend Ledger Team`;

  const html = `
    <p>Hello ${name},</p>

    <p>
      Unfortunately, your transaction <strong>could not be completed</strong>.
    </p>

    <h3>Transaction Details</h3>

    <p>
      <strong>Amount:</strong> ₹${amount}<br>
      <strong>From Account:</strong> ${fromAccount}<br>
      <strong>To Account:</strong> ${toAccount}
    </p>

    <p>
      Please check your account details and try again.
    </p>

    <p>
      If you believe this was an error, please contact support.
    </p>

    <p>
      Best regards,<br>
      The Backend Ledger Team
    </p>
  `;

  return await sendEmail(
    userEmail,
    subject,
    text,
    html
  );
};


module.exports = {
  sendRegistrationEmail,
  sendTransactionEmail,
  sendTransactionFailureEmail,
};