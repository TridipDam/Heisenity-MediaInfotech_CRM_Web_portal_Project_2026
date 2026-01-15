import { prisma } from "@/lib/prisma";
import { formatDateLocal, getTodayDate } from "@/utils/date";

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
    // 1) Find the employee by employeeId
    const employee = await prisma.employee.findUnique({
      where: { employeeId: data.employeeId }
    });

    if (!employee) {
      throw new Error(`Employee with employee ID ${data.employeeId} not found`);
    }

    // 2) Compute the local-midnight and the UTC-midnight for the same calendar day
    const localMidnight = getTodayDate(); // your correct local midnight
    // Construct UTC-midnight for the same Y-M-D (this forces the date to be "YYYY-MM-DDT00:00:00.000Z")
    const utcMidnightForLocalDate = new Date(Date.UTC(
      localMidnight.getFullYear(),
      localMidnight.getMonth(),
      localMidnight.getDate(),
      0, 0, 0, 0
    ));

    // Also compute end of day UTC for safe range queries
    const utcNextDayMidnight = new Date(Date.UTC(
      localMidnight.getFullYear(),
      localMidnight.getMonth(),
      localMidnight.getDate() + 1,
      0, 0, 0, 0
    ));

    const currentTime = new Date();

    // 3) Transaction: reset attempts, create task, update/create attendance
    let createdTask: any = null;

    await prisma.$transaction(async (tx) => {
      // Reset attemptCount for today's attendance (use range to be safe)
      await tx.attendance.updateMany({
        where: {
          employeeId: employee.id,
          date: {
            gte: utcMidnightForLocalDate,
            lt: utcNextDayMidnight
          }
        },
        data: {
          attemptCount: 'ZERO'
        }
      });

      // Create the task
      createdTask = await tx.task.create({
        data: {
          employeeId: employee.id,
          title: data.title,
          description: data.description,
          category: data.category,
          startTime: data.startTime,
          assignedBy: data.assignedBy,
          status: 'PENDING'
        }
      });

      // Try to find today's attendance record using safe range
      const existingAttendance = await tx.attendance.findFirst({
        where: {
          employeeId: employee.id,
          date: {
            gte: utcMidnightForLocalDate,
            lt: utcNextDayMidnight
          }
        }
      });

      // Determine attendanceStatus (PRESENT or LATE)
      let attendanceStatus: 'PRESENT' | 'LATE' = 'PRESENT';
      if (data.startTime) {
        const [startHour, startMinute] = data.startTime.split(':').map(Number);
        const taskStartTime = new Date(
          localMidnight.getFullYear(),
          localMidnight.getMonth(),
          localMidnight.getDate(),
          startHour,
          startMinute,
          0,
          0
        );

        const lateThreshold = new Date(taskStartTime.getTime() + 30 * 60 * 1000); // 30 minutes grace period
        if (currentTime > lateThreshold) {
          attendanceStatus = 'LATE';
        }
      }

      const attendanceDataForWrite: any = {
        taskId: createdTask.id,
        taskStartTime: data.startTime ?? null,
        taskEndTime: null,
        taskLocation: data.location ?? null,
        location: data.location || "Task Assignment",
        status: attendanceStatus,
        source: 'ADMIN',
        updatedAt: currentTime
      };

      if (existingAttendance) {
        // Update existing attendance with task info
        const updateData: any = {
          ...attendanceDataForWrite
        };

        // For FIELD_ENGINEER: if they've checked out from a previous task, reset clockOut
        // This allows them to check in for the new task
        if (employee.role === 'FIELD_ENGINEER' && existingAttendance.clockOut) {
          updateData.clockOut = null;
          console.log(`Resetting clockOut for field engineer ${data.employeeId} to allow new task check-in`);
        }

        // Preserve existing clockIn and approval status - don't reset them
        // The employee will check in themselves, and approval is only needed once per day

        console.log(`Updating attendance for employee ${data.employeeId} with status: ${attendanceStatus}`);

        await tx.attendance.update({
          where: { id: existingAttendance.id },
          data: updateData
        });
      } else {
        // Create new attendance record WITHOUT clockIn - employee must check in themselves
        console.log(`Creating new attendance record for employee ${data.employeeId} with status: ${attendanceStatus}`);
        await tx.attendance.create({
          data: {
            employeeId: employee.id,
            date: utcMidnightForLocalDate,
            attemptCount: 'ZERO',
            clockIn: null, // Employee must check in themselves
            clockOut: null,
            approvalStatus: 'PENDING', // Will need approval when they check in
            ...attendanceDataForWrite
          }
        });
      }
    }); // end transaction

    if (!createdTask) {
      throw new Error('Task creation failed inside transaction');
    }

    // 4) Return the created task record
    return {
      id: createdTask.id,
      employeeId: data.employeeId,
      title: createdTask.title,
      description: createdTask.description,
      category: createdTask.category || undefined,
      location: createdTask.location || data.location || undefined,
      startTime: createdTask.startTime || undefined,
      endTime: createdTask.endTime || undefined,
      assignedBy: createdTask.assignedBy,
      assignedAt: createdTask.assignedAt ? createdTask.assignedAt.toISOString() : new Date().toISOString(),
      status: createdTask.status as TaskStatus,
      createdAt: createdTask.createdAt.toISOString(),
      updatedAt: createdTask.updatedAt.toISOString()
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
    const today = getTodayDate();

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

    const today = getTodayDate();

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

    const today = getTodayDate();

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

    const today = getTodayDate();

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