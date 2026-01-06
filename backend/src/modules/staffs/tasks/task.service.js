import { prisma } from "@/lib/prisma";
// Create a new task and update attendance record
export async function createTask(data) {
    try {
        // Find the employee by employeeId
        const employee = await prisma.fieldEngineer.findUnique({
            where: { employeeId: data.employeeId }
        });
        if (!employee) {
            throw new Error(`Employee with employee ID ${data.employeeId} not found`);
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Create or update dailyLocation record for today (required for attendance validation)
        if (data.location && data.startTime && data.endTime) {
            // Parse start and end times
            const [startHour, startMinute] = data.startTime.split(':').map(Number);
            const [endHour, endMinute] = data.endTime.split(':').map(Number);
            const startDateTime = new Date(today);
            startDateTime.setHours(startHour, startMinute, 0, 0);
            const endDateTime = new Date(today);
            endDateTime.setHours(endHour, endMinute, 0, 0);
            // Create or update daily location
            await prisma.dailyLocation.upsert({
                where: {
                    employeeId_date: {
                        employeeId: employee.id,
                        date: today
                    }
                },
                update: {
                    latitude: 0, // Default coordinates - will be updated when admin sets specific location
                    longitude: 0,
                    radius: 100,
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
                    latitude: 0, // Default coordinates - will be updated when admin sets specific location
                    longitude: 0,
                    radius: 100,
                    address: data.location,
                    city: data.location,
                    state: "Task Location",
                    startTime: startDateTime,
                    endTime: endDateTime,
                    assignedBy: data.assignedBy
                }
            });
            console.log(`Created/updated dailyLocation for employee ${data.employeeId} at ${data.location}`);
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
                endTime: data.endTime,
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
        let attendanceStatus = 'PRESENT';
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
            taskStartTime: data.startTime,
            taskEndTime: data.endTime,
            taskLocation: data.location,
            location: data.location || "Task Assignment",
            status: attendanceStatus, // This will be PRESENT or LATE
            updatedAt: currentTime
        };
        if (existingAttendance) {
            // Update existing attendance record with task assignment and timing
            // If no clockIn time exists, set it to current time
            const updateData = {
                ...attendanceData,
                ...(existingAttendance.clockIn ? {} : { clockIn: currentTime })
            };
            console.log(`Updating attendance for employee ${data.employeeId} with status: ${attendanceStatus}`);
            await prisma.attendance.update({
                where: { id: existingAttendance.id },
                data: updateData
            });
        }
        else {
            // Create new attendance record with task assignment and timing
            console.log(`Creating new attendance record for employee ${data.employeeId} with status: ${attendanceStatus}`);
            await prisma.attendance.create({
                data: {
                    employeeId: employee.id,
                    date: today,
                    clockIn: currentTime, // Set clockIn time when task is assigned
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
    }
    catch (error) {
        console.error('Error creating task:', error);
        throw error;
    }
}
// Get tasks for an employee
export async function getEmployeeTasks(employeeId, status) {
    try {
        const employee = await prisma.fieldEngineer.findUnique({
            where: { employeeId }
        });
        if (!employee) {
            throw new Error(`Employee with employee ID ${employeeId} not found`);
        }
        const whereClause = {
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
    }
    catch (error) {
        console.error('Error getting employee tasks:', error);
        throw error;
    }
}
// Update task status
export async function updateTaskStatus(taskId, status) {
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
            let attendanceStatus = 'PRESENT';
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
    }
    catch (error) {
        console.error('Error updating task status:', error);
        throw error;
    }
}
// Get all tasks with pagination
export async function getAllTasks(page = 1, limit = 50, status) {
    const skip = (page - 1) * limit;
    try {
        const whereClause = {};
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
    }
    catch (error) {
        console.error('Error getting all tasks:', error);
        throw error;
    }
}
// Function to manually update attendance status for an employee
export async function updateAttendanceStatus(employeeId, status) {
    try {
        const employee = await prisma.fieldEngineer.findUnique({
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
    }
    catch (error) {
        console.error('Error updating attendance status:', error);
        throw error;
    }
}
// Function to reset attendance attempts for an employee
export async function resetAttendanceAttempts(employeeId) {
    try {
        const employee = await prisma.fieldEngineer.findUnique({
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
    }
    catch (error) {
        console.error('Error resetting attendance attempts:', error);
        throw error;
    }
}
