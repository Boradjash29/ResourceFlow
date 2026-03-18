import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.API_URL || 'http://localhost:3000'}/api/calendar/callback/google`
);

export const getGoogleAuthUrl = (state) => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    state,
    scope: [
      'https://www.googleapis.com/auth/calendar.events'
    ]
  });
};

export const handleGoogleCallback = async (code, userId) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        google_calendar_access_token: tokens.access_token,
        google_calendar_refresh_token: tokens.refresh_token,
        google_calendar_expiry: new Date(tokens.expiry_date)
      }
    });

    return true;
  } catch (error) {
    console.error('Error handling Google callback:', error);
    throw error;
  }
};

const getAuthClientForUser = async (user) => {
  if (!user.google_calendar_access_token) return null;

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  client.setCredentials({
    access_token: user.google_calendar_access_token,
    refresh_token: user.google_calendar_refresh_token,
    expiry_date: user.google_calendar_expiry ? user.google_calendar_expiry.getTime() : null
  });

  // Automatically handle token refresh
  client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          google_calendar_access_token: tokens.access_token,
          google_calendar_refresh_token: tokens.refresh_token,
          google_calendar_expiry: new Date(tokens.expiry_date)
        }
      });
    } else {
       await prisma.user.update({
        where: { id: user.id },
        data: {
          google_calendar_access_token: tokens.access_token,
          google_calendar_expiry: new Date(tokens.expiry_date)
        }
      });
    }
  });

  return client;
};

export const syncBookingToGoogle = async (booking, user) => {
  try {
    const auth = await getAuthClientForUser(user);
    if (!auth) return null;

    const calendar = google.calendar({ version: 'v3', auth });

    const attendees = [];
    if (booking.participants && Array.isArray(booking.participants)) {
      booking.participants.forEach(email => {
        attendees.push({ email });
      });
    }

    const startDateTime = new Date(booking.start_time);
    const endDateTime = new Date(booking.end_time);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      console.error('Invalid booking dates for Google sync:', booking.start_time, booking.end_time);
      return null;
    }

    const event = {
      summary: booking.meeting_title,
      location: booking.resource?.location || booking.resource?.name,
      description: booking.description || 'Synced from ResourceFlow',
      start: {
        dateTime: startDateTime.toISOString(),
      },
      end: {
        dateTime: endDateTime.toISOString(),
      },
      attendees: attendees.length > 0 ? attendees : undefined,
      reminders: {
        useDefault: true
      }
    };

    let response;
    
    // If it already has an external ID, update it
    if (booking.external_event_id) {
       response = await calendar.events.update({
         calendarId: 'primary',
         eventId: booking.external_event_id,
         requestBody: event,
         sendUpdates: 'all' // Auto-invites and updates to attendees
       });
    } else {
       response = await calendar.events.insert({
         calendarId: 'primary',
         requestBody: event,
         sendUpdates: 'all' // Auto-invites configuration
       });
       
       // Save the external ID back to the database
       await prisma.booking.update({
         where: { id: booking.id },
         data: { external_event_id: response.data.id }
       });
    }

    return response.data;
  } catch (error) {
    console.error('Failed to sync booking to Google Calendar:', error);
    return null;
  }
};

export const removeBookingFromGoogle = async (externalEventId, user) => {
  if (!externalEventId) return;
  
  try {
    const auth = await getAuthClientForUser(user);
    if (!auth) return;

    const calendar = google.calendar({ version: 'v3', auth });
    
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: externalEventId,
      sendUpdates: 'all'
    });
    
  } catch (error) {
    console.error('Failed to remove booking from Google Calendar:', error);
  }
};

export const fetchAndImportExternalEvents = async (user) => {
  try {
    const auth = await getAuthClientForUser(user);
    if (!auth) return { success: false, message: 'Not connected' };

    const calendar = google.calendar({ version: 'v3', auth });
    
    // Fetch upcoming events from Google Calendar
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    let importedCount = 0;
    let failedCount = 0;

    for (const event of events) {
      if (!event.start?.dateTime || !event.end?.dateTime) continue;

      // Check if we already have this event imported
      const existingBooking = await prisma.booking.findFirst({
        where: { external_event_id: event.id }
      });

      if (existingBooking) continue;

      // Find a resource for this external booking
      // Ideally we'd have an 'External' resource, but for now we look for any 'available' resource
      const resource = await prisma.resource.findFirst({
         where: { status: 'available' }
      });

      if (resource) {
         try {
           await prisma.booking.create({
             data: {
               user_id: user.id,
               resource_id: resource.id,
               start_time: new Date(event.start.dateTime),
               end_time: new Date(event.end.dateTime),
               meeting_title: `[EXTERNAL] ${event.summary || 'Busy'}`,
               description: event.description || 'Imported from Google Calendar',
               external_event_id: event.id,
               status: 'approved'
             }
           });
           importedCount++;
         } catch (e) {
           console.error(`Failed to create booking for event ${event.id}:`, e);
           failedCount++;
         }
      } else {
         console.warn(`No available resource found to import Google event ${event.id}`);
         failedCount++;
      }
    }

    return { 
      success: true, 
      count: importedCount, 
      message: failedCount > 0 ? `Imported ${importedCount} events, but ${failedCount} failed due to resource constraints.` : `Successfully imported ${importedCount} events.`
    };
  } catch (error) {
    console.error('Failed to import external events:', error);
    return { success: false, error: error.message };
  }
};
