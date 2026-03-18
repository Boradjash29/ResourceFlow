import nodemailer from 'nodemailer';

// Use service: 'gmail' for standard Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // Must be a 16-character App Password
  }
});

// Verify connection configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection Error:', error);
  } else {
    console.log('✅ SMTP Server is ready to take our messages');
  }
});

/**
 * Sends a verification email to a new user.
 */
export const sendVerificationEmail = async (email, token) => {
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const url = `${baseUrl}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: `"ResourceFlow" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify your email address',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #1B2559;">Welcome to ResourceFlow!</h1>
        <p>Please click the button below to verify your email address and activate your account:</p>
        <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #4318FF; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Verify Email</a>
        <p style="font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link: <br/> ${url}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">If you did not create an account, please ignore this email.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Sends a password reset email.
 */
export const sendPasswordResetEmail = async (email, token) => {
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const url = `${baseUrl}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: `"ResourceFlow" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset your password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #1B2559;">Password Reset Request</h1>
        <p>A password reset was requested for your account. Click the button below to reset your password:</p>
        <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #4318FF; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Reset Password</a>
        <p style="font-size: 12px; color: #666;">This link will expire in 1 hour.</p>
        <p style="font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link: <br/> ${url}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">If you did not request a password reset, please ignore this email.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Password reset email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Sends a welcome email after account verification.
 */
export const sendWelcomeEmail = async (email, name) => {
  const mailOptions = {
    from: `"ResourceFlow" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to ResourceFlow!',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 40px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; color: #1a202c;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 64px; height: 64px; background-color: #ebf4ff; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <span style="font-size: 32px;">✨</span>
          </div>
          <h1 style="color: #1a365d; margin: 0; font-size: 28px; font-weight: 800;">Welcome, ${name}!</h1>
        </div>
        <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">Your account is now fully active. You can start booking rooms, equipment, and managing your meetings with our AI assistant.</p>
        <div style="background-color: #edf2f7; padding: 24px; border-radius: 16px; margin: 32px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #4a5568;">Getting Started</h3>
          <ul style="margin: 0; padding-left: 20px; color: #4a5568; font-size: 14px;">
            <li style="margin-bottom: 8px;">Explore available resources</li>
            <li style="margin-bottom: 8px;">Try our AI assistant to book meetings in seconds</li>
            <li>Manage your schedule from the dashboard</li>
          </ul>
        </div>
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; padding: 14px 32px; background-color: #4318ff; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(67, 24, 255, 0.2);">Go to Dashboard</a>
        </div>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
};

/**
 * Sends a booking confirmation email.
 */
export const sendBookingConfirmationEmail = async (email, userName, booking, resource) => {
  const mailOptions = {
    from: `"ResourceFlow" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Booking Confirmed: ${booking.meeting_title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 16px;">
        <h2 style="color: #05CD99;">Booking Confirmed! ✅</h2>
        <p>Hi ${userName}, your booking for <strong>${resource.name}</strong> has been successfully confirmed.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px 0; color: #666;">Resource:</td><td style="font-weight: bold;">${resource.name} (${resource.type})</td></tr>
            <tr><td style="padding: 5px 0; color: #666;">Meeting:</td><td style="font-weight: bold;">${booking.meeting_title}</td></tr>
            <tr><td style="padding: 5px 0; color: #666;">Date:</td><td style="font-weight: bold;">${new Date(booking.start_time).toLocaleDateString()}</td></tr>
            <tr><td style="padding: 5px 0; color: #666;">Time:</td><td style="font-weight: bold;">${new Date(booking.start_time).toLocaleTimeString()} - ${new Date(booking.end_time).toLocaleTimeString()}</td></tr>
          </table>
        </div>
        <p style="font-size: 14px; color: #666;">If you need to make changes, please visit your <a href="${process.env.FRONTEND_URL}/dashboard/bookings">bookings page</a>.</p>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
};

/**
 * Sends a booking cancellation email.
 */
export const sendBookingCancellationEmail = async (email, userName, booking, resource) => {
  const mailOptions = {
    from: `"ResourceFlow" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Booking Cancelled: ${booking.meeting_title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 16px;">
        <h2 style="color: #FF5252;">Booking Cancelled ❌</h2>
        <p>Hi ${userName}, your booking for <strong>${resource.name}</strong> has been cancelled.</p>
        <div style="background: #fff5f5; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #ff000010;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px 0; color: #666;">Resource:</td><td>${resource.name}</td></tr>
            <tr><td style="padding: 5px 0; color: #666;">Meeting:</td><td>${booking.meeting_title}</td></tr>
            <tr><td style="padding: 5px 0; color: #666;">Scheduled for:</td><td>${new Date(booking.start_time).toLocaleString()}</td></tr>
          </table>
        </div>
        <p style="font-size: 14px; color: #666;">The resource is now available for other users to book.</p>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
};

/**
 * Sends a booking reminder email.
 */
export const sendBookingReminderEmail = async (email, userName, booking, resource) => {
  const mailOptions = {
    from: `"ResourceFlow" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Reminder: Meeting in 1 hour - ${booking.meeting_title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #4318ff20; border-radius: 16px;">
        <h2 style="color: #4318ff;">Meeting Reminder ⏳</h2>
        <p>Hi ${userName}, your booking for <strong>${resource.name}</strong> starts in 1 hour.</p>
        <div style="background: #f4f7fe; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1b2559;">${booking.meeting_title}</p>
          <p style="margin: 5px 0 0 0; color: #1b2559;">${new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <p style="font-size: 14px; color: #666;">Location: ${resource.location || 'N/A'}</p>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
};
