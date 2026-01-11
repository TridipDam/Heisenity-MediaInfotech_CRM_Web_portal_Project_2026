import { prisma } from "@/lib/prisma";
import { getCoordinatesFromMapMyIndia } from "@/utils/geolocation";

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface CreateTaskData {
  employeeId: string;
  title: string;
  description: string;
  category?: string;
  location?: string;
  startTime?: string;
  assignedBy: string;
}

export interface TaskRecord {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  category?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  assignedBy: string;
  assignedAt: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

// Create a new task and update attendance record
export async function createTask(data: CreateTaskData): Promise<TaskRecord> {
  try {
    // Find the employee by employeeId
    const employee = await prisma.employee.findUnique({
      where: { employeeId: data.employeeId }
    });

    if (!employee) {
      throw new Error(`Employee with employee ID ${data.employeeId} not found`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.attendance.updateMany({
      where: {
        employee: {
          employeeId: data.employeeId
        },
        date: today
      },
      data: {
        attemptCount: 'ZERO'
      }
    })

    // Create or update dailyLocation record for today (required for attendance validation)
    if (data.location && data.startTime) {
      console.log(`Processing task location: "${data.location}" for employee ${data.employeeId}`);

      // Parse start and end times
      const [startHour, startMinute] = data.startTime.split(':').map(Number);

      const startDateTime = new Date(today);
      startDateTime.setHours(startHour, startMinute, 0, 0);

      const endDateTime = new Date(startDateTime.getTime() + (8 * 60 * 60 * 1000));

      // Geocode location using MapMyIndia
      const geo = await getCoordinatesFromMapMyIndia(data.location);

      if (!geo) {
        console.error(`MapMyIndia geocoding failed for location: "${data.location}"`);
        throw new Error('UNABLE_TO_GEOCODE_TASK_LOCATION');
      }

      console.log(`Successfully geocoded "${data.location}" to coordinates: ${geo.latitude}, ${geo.longitude}`);

      // Use dynamic radius based on geocoding accuracy
      // If we got exact coordinates, use smaller radius; if fallback/area-based, use larger radius
      let radius = geo.estimatedRadiusMeters || 100;

      // For fallback coordinates (low confidence), use larger radius
      if (geo.importance && geo.importance < 0.5) {
        radius = Math.max(radius, 2000); // At least 2km for low confidence geocoding
      }

      // Ensure minimum radius for practical GPS accuracy
      radius = Math.max(radius, 500); // Minimum 500m for real-world GPS variations

      console.log(`Using radius: ${radius}m for location "${data.location}" (granularity: ${geo.granularity}, confidence: ${geo.importance})`);

      // Create or update daily location
      await prisma.dailyLocation.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: today
          }
        },
        update: {
          latitude: geo.latitude,
          longitude: geo.longitude,
          radius: radius,
          address: data.location,
          city: data.location,
          state: "Task Location",
          startTime: startDateTime,
          endTime: endDateTime,
          assignedBy: data.assignedBy,
          updatedAt: new Date()
        },
        create: {
          employeeId: employee.id,
          date: today,
          latitude: geo.latitude,
          longitude: geo.longitude,
          radius: radius,
          address: data.location,
          city: data.location,
          state: "Task Location",
          startTime: startDateTime,
          endTime: endDateTime,
          assignedBy: data.assignedBy
        }
      });

      console.log(`Created/updated dailyLocation for employee ${data.employeeId} at ${data.location} (${startDateTime.toLocaleTimeString()} - ${endDateTime.toLocaleTimeString()})`);
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        employeeId: employee.id,
        title: data.title,
        description: data.description,
        category: data.category,
        location: data.location,
        startTime: data.startTime,
        assignedBy: data.assignedBy,
        status: 'PENDING'
      }
    });

    // Check if attendance record exists for today
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today
        }
      }
    });

    // Prepare attendance data with task information
    const currentTime = new Date();

    // When a task is assigned, automatically mark employee as PRESENT
    // This indicates the employee is working and has been assigned a task
    let attendanceStatus: 'PRESENT' | 'LATE' = 'PRESENT';

    // If task has start time, check if current time is significantly after start time
    if (data.startTime) {
      const [startHour, startMinute] = data.startTime.split(':').map(Number);
      const taskStartTime = new Date(today);
      taskStartTime.setHours(startHour, startMinute, 0, 0);

      // If current time is more than 30 minutes after task start time, mark as late
      const lateThreshold = new Date(taskStartTime.getTime() + 30 * 60 * 1000); // 30 minutes grace period
      if (currentTime > lateThreshold) {
        attendanceStatus = 'LATE';
      }
    }

    const attendanceData = {
      taskId: task.id,
      taskStartTime: data.startTime, // Initially set to assigned start time
      taskEndTime: null, // Don't set task end time during assignment
      taskLocation: data.location,
      location: data.location || "Task Assignment",
      status: attendanceStatus, // This will be PRESENT or LATE
      source: 'ADMIN' as const, // Mark as admin task assignment
      updatedAt: currentTime
    };

    if (existingAttendance) {
      // Update existing attendance record with task assignment and timing
      // DO NOT automatically set clockIn - employee must check in themselves
      const updateData = {
        ...attendanceData
      };

      console.log(`Updating attendance for employee ${data.employeeId} with status: ${attendanceStatus}`);

      await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: updateData
      });
    } else {
      // Create new attendance record with task assignment and timing
      // DO NOT automatically set clockIn - employee must check in themselves
      console.log(`Creating new attendance record for employee ${data.employeeId} with status: ${attendanceStatus}`);

      await prisma.attendance.create({
        data: {
          employeeId: employee.id,
          date: today,
          // clockIn: null, // Employee must check in themselves
          attemptCount: 'ZERO',
          ...attendanceData
        }
      });
    }

    // Return the task record
    return {
      id: task.id,
      employeeId: data.employeeId,
      title: task.title,
      description: task.description,
      category: task.category || undefined,
      location: task.location || undefined,
      startTime: task.startTime || undefined,
      endTime: task.endTime || undefined,
      assignedBy: task.assignedBy,
      assignedAt: task.assignedAt.toISOString(),
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    };
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

// Get tasks for an employee
export async function getEmployeeTasks(employeeId: string, status?: TaskStatus): Promise<TaskRecord[]> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { employeeId }
    });

    if (!employee) {
      throw new Error(`Employee with employee ID ${employeeId} not found`);
    }

    const whereClause: any = {
      employeeId: employee.id
    };

    if (status) {
      whereClause.status = status;
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: {
        assignedAt: 'desc'
      }
    });

    return tasks.map(task => ({
      id: task.id,
      employeeId: employeeId,
      title: task.title,
      description: task.description,
      category: task.category || undefined,
      location: task.location || undefined,
      startTime: task.startTime || undefined,
      endTime: task.endTime || undefined,
      assignedBy: task.assignedBy,
      assignedAt: task.assignedAt.toISOString(),
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    }));
  } catch (error) {
    console.error('Error getting employee tasks:', error);
    throw error;
  }
}

// Update task status
export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<TaskRecord> {
  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: status,
        updatedAt: new Date()
      },
      include: {
        employee: true
      }
    });

    // Update attendance status based on task status
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance record for this employee
    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: task.employee.id,
          date: today
        }
      }
    });

    if (attendance && attendance.taskId === taskId) {
      let attendanceStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'MARKDOWN' = 'PRESENT';

      // Determine attendance status based on task status
      switch (status) {
        case 'PENDING':
        case 'IN_PROGRESS':
          attendanceStatus = 'PRESENT';
          break;
        case 'COMPLETED':
          attendanceStatus = 'PRESENT';
          break;
        case 'CANCELLED':
          // If task is cancelled, check if there are other tasks or mark as absent
          const otherTasks = await prisma.task.findMany({
            where: {
              employeeId: task.employee.id,
              assignedAt: {
                gte: today,
                lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Next day
              },
              status: {
                in: ['PENDING', 'IN_PROGRESS', 'COMPLETED']
              },
              id: {
                not: taskId
              }
            }
          });

          attendanceStatus = otherTasks.length > 0 ? 'PRESENT' : 'ABSENT';
          break;
      }

      // Update attendance status
      await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          status: attendanceStatus,
          updatedAt: new Date()
        }
      });
    }

    return {
      id: task.id,
      employeeId: task.employee.employeeId,
      title: task.title,
      description: task.description,
      category: task.category || undefined,
      location: task.location || undefined,
      startTime: task.startTime || undefined,
      endTime: task.endTime || undefined,
      assignedBy: task.assignedBy,
      assignedAt: task.assignedAt.toISOString(),
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    };
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
}

// Get all tasks with pagination
export async function getAllTasks(page: number = 1, limit: number = 50, status?: TaskStatus) {
  const skip = (page - 1) * limit;

  try {
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: {
          assignedAt: 'desc'
        },
        include: {
          employee: {
            select: {
              employeeId: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.task.count({ where: whereClause })
    ]);

    return {
      tasks: tasks.map(task => ({
        id: task.id,
        employeeId: task.employee.employeeId,
        employeeName: task.employee.name,
        employeeEmail: task.employee.email,
        title: task.title,
        description: task.description,
        category: task.category,
        location: task.location,
        startTime: task.startTime,
        endTime: task.endTime,
        assignedBy: task.assignedBy,
        assignedAt: task.assignedAt.toISOString(),
        status: task.status,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString()
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting all tasks:', error);
    throw error;
  }
}

// Function to manually update attendance status for an employee
export async function updateAttendanceStatus(employeeId: string, status: 'PRESENT' | 'LATE' | 'ABSENT' | 'MARKDOWN'): Promise<void> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { employeeId }
    });

    if (!employee) {
      throw new Error(`Employee with employee ID ${employeeId} not found`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Update or create attendance record
    await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today
        }
      },
      update: {
        status: status,
        updatedAt: new Date()
      },
      create: {
        employeeId: employee.id,
        date: today,
        status: status,
        location: "Manual Status Update",
        attemptCount: 'ZERO'
      }
    });

    console.log(`Attendance status updated for employee ${employeeId}: ${status}`);
  } catch (error) {
    console.error('Error updating attendance status:', error);
    throw error;
  }
}
// Function to mark task as completed and update task end time (without affecting attendance clock out)
export async function completeTask(taskId: string, employeeId: string): Promise<void> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { employeeId }
    });

    if (!employee) {
      throw new Error(`Employee with employee ID ${employeeId} not found`);
    }

    // Update task status to completed
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        updatedAt: new Date()
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Update attendance record with task completion time (but don't set clockOut)
    await prisma.attendance.updateMany({
      where: {
        employeeId: employee.id,
        date: today,
        taskId: taskId
      },
      data: {
        taskEndTime: new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        }),
        updatedAt: new Date()
        // Note: We don't update clockOut here - that's only for full day checkout
      }
    });

    console.log(`Task ${taskId} completed for employee ${employeeId}`);
  } catch (error) {
    console.error('Error completing task:', error);
    throw error;
  }
}
export async function resetAttendanceAttempts(employeeId: string): Promise<void> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { employeeId }
    });

    if (!employee) {
      throw new Error(`Employee with employee ID ${employeeId} not found`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Reset attendance attempts and unlock if locked
    await prisma.attendance.updateMany({
      where: {
        employeeId: employee.id,
        date: today
      },
      data: {
        attemptCount: 'ZERO',
        locked: false,
        lockedReason: null,
        updatedAt: new Date()
      }
    });

    console.log(`Reset attendance attempts for employee ${employeeId}`);
  } catch (error) {
    console.error('Error resetting attendance attempts:', error);
    throw error;
  }
}
// Function to fix daily locations with same start/end times
export async function fixDailyLocationTimes(): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find daily locations where start time equals end time
    const problematicLocations = await prisma.dailyLocation.findMany({
      where: {
        date: today,
        // This will find locations where start and end times are the same
      }
    });

    for (const location of problematicLocations) {
      const startTime = new Date(location.startTime);
      const endTime = new Date(location.endTime);

      if (endTime <= startTime) {
        // Set end time to 8 hours after start time
        const newEndTime = new Date(startTime.getTime() + (8 * 60 * 60 * 1000));

        await prisma.dailyLocation.update({
          where: { id: location.id },
          data: {
            endTime: newEndTime,
            updatedAt: new Date()
          }
        });

        console.log(`Fixed daily location for employee: ${startTime.toLocaleTimeString()} - ${newEndTime.toLocaleTimeString()}`);
      }
    }

    console.log(`Fixed ${problematicLocations.length} daily location time issues`);
  } catch (error) {
    console.error('Error fixing daily location times:', error);
    throw error;
  }
}