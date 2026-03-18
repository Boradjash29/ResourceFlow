import cron from 'node-cron';
import prisma from '../config/prisma.js';
import { sendBookingReminderEmail } from '../services/emailService.js';

/**
 * Starts the booking reminder cron job.
 * Runs every 15 minutes to check for bookings starting in exactly 1 hour.
 */
export const initReminderJob = () => {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('⏰ Running Booking Reminder Job...');
    
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      const seventyFiveMinsFromNow = new Date(now.getTime() + 75 * 60 * 1000);

      // Find bookings starting in the next 1 hour (window: 60-75 mins from now to catch the interval)
      const upcomingBookings = await prisma.booking.findMany({
        where: {
          status: 'confirmed',
          reminder_sent: false,
          start_time: {
            gte: oneHourFromNow,
            lt: seventyFiveMinsFromNow
          }
        },
        include: {
          user: { select: { name: true, email: true } },
          resource: { select: { name: true, location: true } }
        }
      });

      console.log(`Found ${upcomingBookings.length} upcoming bookings for reminders.`);

      for (const booking of upcomingBookings) {
        try {
          await sendBookingReminderEmail(
            booking.user.email,
            booking.user.name,
            booking,
            booking.resource
          );

          // Mark as sent
          await prisma.booking.update({
            where: { id: booking.id },
            data: { reminder_sent: true }
          });
          
          console.log(`✅ Reminder sent for booking: ${booking.id}`);
        } catch (emailError) {
          console.error(`❌ Failed to send reminder for booking ${booking.id}:`, emailError);
        }
      }
    } catch (error) {
      console.error('CRITICAL: Reminder Job Error:', error);
    }
  });

  console.log('🚀 Booking Reminder Job Initialized (Scan interval: 15m)');
};
