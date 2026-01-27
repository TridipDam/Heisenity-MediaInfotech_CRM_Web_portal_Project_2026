import { prisma } from '../../lib/prisma';
import { MeetingType, MeetingStatus, MeetingPriority, AttendeeStatus, AttendeeResponse } from '@prisma/client';

export interface CreateMeetingData {
  title: string;
  description?: string;
  startTime: Date;
  meetingType: MeetingType;
  priority?: MeetingPriority;
  organizerAdminId?: string;
  organizerEmployeeId?: string;
  customerId?: string;
  meetingLink?: string;
  agenda?: string;
  attendeeIds?: string[];
}

export interface UpdateMeetingData {
  title?: string;
  description?: string;
  startTime?: Date;
  meetingType?: MeetingType;
  priority?: MeetingPriority;
  status?: MeetingStatus;
  customerId?: string;
  meetingLink?: string;
  agenda?: string;
  notes?: string;
}

export interface MeetingFilters {
  organizerAdminId?: string;
  organizerEmployeeId?: string;
  attendeeId?: string;
  customerId?: string;
  status?: MeetingStatus;
  meetingType?: MeetingType;
  startDate?: Date;
  calendly?: boolean;
}

// Create a new meeting
export const createMeeting = async (data: CreateMeetingData) => {
  const { attendeeIds, ...meetingData } = data;

  const meeting = await prisma.meeting.create({
    data: {
      ...meetingData,
      attendees: attendeeIds ? {
        create: attendeeIds.map(employeeId => ({
          employeeId,
          status: AttendeeStatus.INVITED
        }))
      } : undefined
    },
    include: {
      organizerAdmin: {
        select: {
          id: true,
          name: true,
          adminId: true,
          email: true
        }
      },
      organizerEmployee: {
        select: {
          id: true,
          name: true,
          employeeId: true,
          email: true
        }
      },
      customer: {
        select: {
          id: true,
          customerId: true,
          name: true,
          email: true,
          phone: true
        }
      },
      attendees: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              email: true
            }
          }
        }
      },
    }
  });

  return meeting;
};

// Get meeting by ID
export const getMeetingById = async (id: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      organizerAdmin: {
        select: {
          id: true,
          name: true,
          adminId: true,
          email: true
        }
      },
      organizerEmployee: {
        select: {
          id: true,
          name: true,
          employeeId: true,
          email: true
        }
      },
      customer: {
        select: {
          id: true,
          customerId: true,
          name: true,
          email: true,
          phone: true
        }
      },
      attendees: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              email: true
            }
          }
        }
      },
      calendlyMeeting: true
    }
  });

  return meeting;
};

// Get meetings with filters and pagination
export const getMeetings = async (
  page: number = 1,
  limit: number = 20,
  filters: MeetingFilters = {}
) => {
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters.organizerAdminId) {
    where.organizerAdminId = filters.organizerAdminId;
  }

  if (filters.organizerEmployeeId) {
    where.organizerEmployeeId = filters.organizerEmployeeId;
  }

  if (filters.attendeeId) {
    where.attendees = {
      some: {
        employeeId: filters.attendeeId
      }
    };
  }

  if (filters.customerId) {
    where.customerId = filters.customerId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.calendly) {
    where.calendlyMeeting = {
      isNot: null
    };
  }

  if (filters.meetingType) {
    where.meetingType = filters.meetingType;
  }

  if (filters.startDate) {
    where.startTime.gte = filters.startDate;
  }

  const [meetings, total] = await Promise.all([
    prisma.meeting.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startTime: 'asc' },
      include: {
        organizerAdmin: {
          select: {
            id: true,
            name: true,
            adminId: true,
            email: true
          }
        },
        organizerEmployee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true
          }
        },
        customer: {
          select: {
            id: true,
            customerId: true,
            name: true,
            email: true,
            phone: true
          }
        },
        attendees: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                employeeId: true,
                email: true
              }
            }
          }
        },
        calendlyMeeting: true
      }
    }),
    prisma.meeting.count({ where })
  ]);

  return {
    meetings,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Update meeting
export const updateMeeting = async (id: string, data: UpdateMeetingData) => {
  const meeting = await prisma.meeting.update({
    where: { id },
    data,
    include: {
      organizerAdmin: {
        select: {
          id: true,
          name: true,
          adminId: true,
          email: true
        }
      },
      organizerEmployee: {
        select: {
          id: true,
          name: true,
          employeeId: true,
          email: true
        }
      },
      customer: {
        select: {
          id: true,
          customerId: true,
          name: true,
          email: true,
          phone: true
        }
      },
      attendees: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              email: true
            }
          }
        }
      },
      calendlyMeeting: true
    }
  });

  return meeting;
};

// Delete meeting
export const deleteMeeting = async (id: string) => {
  await prisma.meeting.delete({
    where: { id }
  });
};

// Add attendees to meeting
export const addAttendees = async (meetingId: string, employeeIds: string[]) => {
  const attendees = await prisma.meetingAttendee.createMany({
    data: employeeIds.map(employeeId => ({
      meetingId,
      employeeId,
      status: AttendeeStatus.INVITED
    })),
    skipDuplicates: true
  });

  return attendees;
};

// Remove attendee from meeting
export const removeAttendee = async (meetingId: string, employeeId: string) => {
  await prisma.meetingAttendee.delete({
    where: {
      meetingId_employeeId: {
        meetingId,
        employeeId
      }
    }
  });
};

// Update attendee response
export const updateAttendeeResponse = async (
  meetingId: string,
  employeeId: string,
  response: AttendeeResponse
) => {
  const attendee = await prisma.meetingAttendee.update({
    where: {
      meetingId_employeeId: {
        meetingId,
        employeeId
      }
    },
    data: {
      response,
      status: response === AttendeeResponse.ACCEPTED ? AttendeeStatus.CONFIRMED :
        response === AttendeeResponse.DECLINED ? AttendeeStatus.DECLINED :
          AttendeeStatus.TENTATIVE
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          employeeId: true,
          email: true
        }
      }
    }
  });

  return attendee;
};

// Get upcoming meetings for an employee
export const getUpcomingMeetings = async (employeeId: string, limit: number = 10) => {
  const now = new Date();

  const meetings = await prisma.meeting.findMany({
    where: {
      OR: [
        { organizerEmployeeId: employeeId },
        {
          attendees: {
            some: {
              employeeId: employeeId
            }
          }
        }
      ],
      startTime: {
        gte: now
      },
      status: {
        in: [MeetingStatus.SCHEDULED]
      }
    },
    take: limit,
    orderBy: { startTime: 'asc' },
    include: {
      organizerAdmin: {
        select: {
          id: true,
          name: true,
          adminId: true,
          email: true
        }
      },
      organizerEmployee: {
        select: {
          id: true,
          name: true,
          employeeId: true,
          email: true
        }
      },
      customer: {
        select: {
          id: true,
          customerId: true,
          name: true,
          email: true,
          phone: true
        }
      },
      attendees: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              email: true
            }
          }
        }
      }
    }
  });

  return meetings;
};

// Get today's meetings for an employee
export const getTodaysMeetings = async (employeeId: string) => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const meetings = await prisma.meeting.findMany({
    where: {
      OR: [
        { organizerEmployeeId: employeeId },
        {
          attendees: {
            some: {
              employeeId: employeeId
            }
          }
        }
      ],
      startTime: {
        gte: startOfDay,
        lt: endOfDay
      },
      status: {
        in: [MeetingStatus.SCHEDULED]
      }
    },
    orderBy: { startTime: 'asc' },
    include: {
      organizerAdmin: {
        select: {
          id: true,
          name: true,
          adminId: true,
          email: true
        }
      },
      organizerEmployee: {
        select: {
          id: true,
          name: true,
          employeeId: true,
          email: true
        }
      },
      customer: {
        select: {
          id: true,
          customerId: true,
          name: true,
          email: true,
          phone: true
        }
      },
      attendees: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              email: true
            }
          }
        }
      }
    }
  });

  return meetings;
};

