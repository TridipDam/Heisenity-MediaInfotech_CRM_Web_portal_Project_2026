import { Request, Response } from 'express';
import {
  createMeeting,
  getMeetingById,
  getMeetings,
  updateMeeting,
  deleteMeeting,
  addAttendees,
  removeAttendee,
  updateAttendeeResponse,
  getUpcomingMeetings,
  getTodaysMeetings,
  CreateMeetingData,
  UpdateMeetingData,
  MeetingFilters
} from './meeting.service';
import { MeetingType, MeetingStatus, MeetingPriority, AttendeeResponse } from '@prisma/client';

// Create a new meeting
export const createMeetingController = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      startTime,
      meetingType,
      priority,
      organizerId,
      customerId,
      meetingLink,
      agenda,
      attendeeIds
    } = req.body;

    // Validate required fields
    if (!title || !startTime || !organizerId) {
      return res.status(400).json({
        success: false,
        error: 'Title, start time, end time, and organizer ID are required'
      });
    }

    // Validate meeting times
    const start = new Date(startTime);

    if (start < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Meeting cannot be scheduled in the past'
      });
    }

    // Determine if organizer is admin or employee
    // We need to check the session or user type to determine this
    // For now, let's assume we get this information from the request
    const { userType } = req.body; // This should come from auth middleware

    const meetingData: CreateMeetingData = {
      title,
      description,
      startTime: start,
      meetingType: meetingType || MeetingType.INTERNAL,
      priority: priority || MeetingPriority.MEDIUM,
      organizerAdminId: userType === 'ADMIN' ? organizerId : undefined,
      organizerEmployeeId: userType === 'EMPLOYEE' ? organizerId : undefined,
      customerId,
      meetingLink,
      agenda,
      attendeeIds
    };

    const meeting = await createMeeting(meetingData);

    return res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      data: meeting
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create meeting'
    });
  }
};

// Get meeting by ID
export const getMeetingController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Meeting ID is required'
      });
    }

    const meeting = await getMeetingById(id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: meeting
    });
  } catch (error) {
    console.error('Error getting meeting:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get meeting'
    });
  }
};

// Get meetings with filters
export const getMeetingsController = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const filters: MeetingFilters = {};

    if (req.query.calendly === 'true') {
      filters.calendly = true;
    }


    if (req.query.organizerAdminId) filters.organizerAdminId = req.query.organizerAdminId as string;
    if (req.query.organizerEmployeeId) filters.organizerEmployeeId = req.query.organizerEmployeeId as string;
    // Keep backward compatibility
    if (req.query.organizerId) {
      // Determine if it's admin or employee based on userType or other context
      const userType = req.query.userType as string;
      if (userType === 'ADMIN') {
        filters.organizerAdminId = req.query.organizerId as string;
      } else {
        filters.organizerEmployeeId = req.query.organizerId as string;
      }
    }
    if (req.query.attendeeId) filters.attendeeId = req.query.attendeeId as string;
    if (req.query.customerId) filters.customerId = req.query.customerId as string;
    if (req.query.status) filters.status = req.query.status as MeetingStatus;
    if (req.query.meetingType) filters.meetingType = req.query.meetingType as MeetingType;
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

    const result = await getMeetings(page, limit, filters);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting meetings:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get meetings'
    });
  }
};

// Update meeting
export const updateMeetingController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: UpdateMeetingData = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Meeting ID is required'
      });
    }

    const meeting = await updateMeeting(id, updateData);

    return res.status(200).json({
      success: true,
      message: 'Meeting updated successfully',
      data: meeting
    });
  } catch (error) {
    console.error('Error updating meeting:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update meeting'
    });
  }
};

// Delete meeting
export const deleteMeetingController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Meeting ID is required'
      });
    }

    await deleteMeeting(id);

    return res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete meeting'
    });
  }
};

// Add attendees to meeting
export const addAttendeesController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { employeeIds } = req.body;

    if (!id || !employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({
        success: false,
        error: 'Meeting ID and employee IDs array are required'
      });
    }

    await addAttendees(id, employeeIds);

    return res.status(200).json({
      success: true,
      message: 'Attendees added successfully'
    });
  } catch (error) {
    console.error('Error adding attendees:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add attendees'
    });
  }
};

// Remove attendee from meeting
export const removeAttendeeController = async (req: Request, res: Response) => {
  try {
    const { id, employeeId } = req.params;

    if (!id || !employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Meeting ID and employee ID are required'
      });
    }

    await removeAttendee(id, employeeId);

    return res.status(200).json({
      success: true,
      message: 'Attendee removed successfully'
    });
  } catch (error) {
    console.error('Error removing attendee:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove attendee'
    });
  }
};

// Update attendee response
export const updateAttendeeResponseController = async (req: Request, res: Response) => {
  try {
    const { id, employeeId } = req.params;
    const { response } = req.body;

    if (!id || !employeeId || !response) {
      return res.status(400).json({
        success: false,
        error: 'Meeting ID, employee ID, and response are required'
      });
    }

    // Validate response
    const validResponses = Object.values(AttendeeResponse);
    if (!validResponses.includes(response)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid response. Must be ACCEPTED, DECLINED, or TENTATIVE'
      });
    }

    const attendee = await updateAttendeeResponse(id, employeeId, response);

    return res.status(200).json({
      success: true,
      message: 'Attendee response updated successfully',
      data: attendee
    });
  } catch (error) {
    console.error('Error updating attendee response:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update attendee response'
    });
  }
};

// Get upcoming meetings for employee
export const getUpcomingMeetingsController = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
    }

    const meetings = await getUpcomingMeetings(employeeId, limit);

    return res.status(200).json({
      success: true,
      data: meetings
    });
  } catch (error) {
    console.error('Error getting upcoming meetings:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get upcoming meetings'
    });
  }
};

// Get today's meetings for employee
export const getTodaysMeetingsController = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
    }

    const meetings = await getTodaysMeetings(employeeId);

    return res.status(200).json({
      success: true,
      data: meetings
    });
  } catch (error) {
    console.error('Error getting today\'s meetings:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get today\'s meetings'
    });
  }
};