import { Request, Response } from 'express';
import { createMeeting } from './meeting.service';
import { prisma } from '../../lib/prisma';
import { MeetingType, MeetingPriority } from '@prisma/client';

// Calendly webhook handler
export const handleCalendlyWebhook = async (req: Request, res: Response) => {
  try {
    console.log('Calendly webhook received:', JSON.stringify(req.body, null, 2));
    
    const { event, payload } = req.body;
    
    // Handle different Calendly events
    switch (event) {
      case 'invitee.created':
        await handleInviteeCreated(payload);
        break;
      case 'invitee.canceled':
        await handleInviteeCanceled(payload);
        break;
      default:
        console.log('Unhandled Calendly event:', event);
    }
    
    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Error processing Calendly webhook:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to process webhook' 
    });
  }
};

// Handle when someone books a meeting via Calendly
const handleInviteeCreated = async (payload: any) => {
  try {
    const { event, invitee } = payload;
    
    // Extract meeting details from Calendly payload
    const meetingData = {
      title: event.name || 'Calendly Meeting',
      description: `Meeting scheduled via Calendly\n\nInvitee: ${invitee.name}\nEmail: ${invitee.email}`,
      startTime: new Date(event.start_time),
      endTime: new Date(event.end_time),
      location: event.location?.location || 'Virtual Meeting',
      meetingType: determineeMeetingType(event.name, invitee),
      priority: MeetingPriority.MEDIUM,
      organizerId: await findOrganizerId(event.event_memberships?.[0]?.user_email),
      meetingLink: event.location?.join_url || payload.event.location?.join_url,
      agenda: `Calendly Meeting Details:\n- Event: ${event.name}\n- Duration: ${event.duration} minutes`,
      notes: `Calendly Data:\n- Event UUID: ${event.uuid}\n- Invitee UUID: ${invitee.uuid}\n- Scheduled: ${invitee.created_at}`,
      customerId: undefined as string | undefined
    };

    // Find customer if exists
    const customer = await findCustomerByEmail(invitee.email);
    if (customer) {
      meetingData.customerId = customer.id;
      meetingData.meetingType = MeetingType.CLIENT;
    }

    // Create meeting in database
    const meeting = await createMeeting(meetingData);
    
    console.log('Meeting created from Calendly:', meeting.id);
    
    // Store Calendly-specific data
    await prisma.calendlyMeeting.create({
      data: {
        meetingId: meeting.id,
        calendlyEventUuid: event.uuid,
        calendlyInviteeUuid: invitee.uuid,
        inviteeName: invitee.name,
        inviteeEmail: invitee.email,
        inviteePhone: invitee.phone_number,
        eventName: event.name,
        eventDuration: event.duration,
        scheduledAt: new Date(invitee.created_at),
        calendlyEventUrl: event.uri,
        rescheduleUrl: invitee.reschedule_url,
        cancelUrl: invitee.cancel_url
      }
    });
    
  } catch (error) {
    console.error('Error handling invitee created:', error);
    throw error;
  }
};

// Handle when someone cancels a Calendly meeting
const handleInviteeCanceled = async (payload: any) => {
  try {
    const { invitee } = payload;
    
    // Find the meeting by Calendly invitee UUID
    const calendlyMeeting = await prisma.calendlyMeeting.findFirst({
      where: { calendlyInviteeUuid: invitee.uuid },
      include: { meeting: true }
    });
    
    if (calendlyMeeting) {
      // Update meeting status to cancelled
      await prisma.meeting.update({
        where: { id: calendlyMeeting.meetingId },
        data: { 
          status: 'CANCELLED',
          notes: `${calendlyMeeting.meeting.notes || ''}\n\nCancelled via Calendly on ${new Date().toISOString()}`
        }
      });
      
      console.log('Meeting cancelled from Calendly:', calendlyMeeting.meetingId);
    }
    
  } catch (error) {
    console.error('Error handling invitee canceled:', error);
    throw error;
  }
};

// Determine meeting type based on event name and invitee info
const determineeMeetingType = (eventName: string, invitee: any): MeetingType => {
  const name = eventName?.toLowerCase() || '';
  
  if (name.includes('client') || name.includes('customer')) return MeetingType.CLIENT;
  if (name.includes('vendor') || name.includes('supplier')) return MeetingType.VENDOR;
  if (name.includes('training') || name.includes('workshop')) return MeetingType.TRAINING;
  if (name.includes('review') || name.includes('evaluation')) return MeetingType.REVIEW;
  
  return MeetingType.OTHER;
};

// Find organizer employee by email
const findOrganizerId = async (email: string): Promise<string> => {
  if (!email) {
    // Default to first admin if no email provided
    const admin = await prisma.admin.findFirst();
    if (admin) return admin.id;
    
    // Fallback to first employee
    const employee = await prisma.employee.findFirst();
    return employee?.id || 'system';
  }
  
  // Try to find employee by email
  const employee = await prisma.employee.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }
  });
  
  if (employee) return employee.id;
  
  // Try to find admin by email
  const admin = await prisma.admin.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }
  });
  
  if (admin) return admin.id;
  
  // Default fallback
  const defaultEmployee = await prisma.employee.findFirst();
  return defaultEmployee?.id || 'system';
};

// Find customer by email
const findCustomerByEmail = async (email: string) => {
  if (!email) return null;
  
  return await prisma.customer.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }
  });
};

// Manual import from Calendly API
export const importCalendlyMeetings = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, calendlyApiToken } = req.body;
    
    if (!calendlyApiToken) {
      return res.status(400).json({
        success: false,
        error: 'Calendly API token is required'
      });
    }
    
    // This would integrate with Calendly API to fetch past meetings
    // For now, return success message
    return res.status(200).json({
      success: true,
      message: 'Calendly import feature ready - API integration needed',
      data: {
        imported: 0,
        skipped: 0,
        errors: 0
      }
    });
    
  } catch (error) {
    console.error('Error importing Calendly meetings:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import meetings'
    });
  }
};

// Get Calendly meeting details
export const getCalendlyMeetingDetails = async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    
    const calendlyMeeting = await prisma.calendlyMeeting.findFirst({
      where: { meetingId },
      include: {
        meeting: {
          include: {
            organizerAdmin: true,
            organizerEmployee: true,
            customer: true,
            attendees: {
              include: {
                employee: true
              }
            }
          }
        }
      }
    });
    
    if (!calendlyMeeting) {
      return res.status(404).json({
        success: false,
        error: 'Calendly meeting not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: calendlyMeeting
    });
    
  } catch (error) {
    console.error('Error getting Calendly meeting details:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get meeting details'
    });
  }
};