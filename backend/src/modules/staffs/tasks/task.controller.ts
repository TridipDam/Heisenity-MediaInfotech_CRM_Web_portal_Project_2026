import { Request, Response } from 'express';
import { createTask, getEmployeeTasks, updateTaskStatus, getAllTasks, CreateTaskData, TaskStatus, updateAttendanceStatus, resetAttendanceAttempts, fixDailyLocationTimes } from './task.service';

// Assign a new task to an employee
export const assignTask = async (req: Request, res: Response) => {
  try {
    const { employeeId, title, description, category, location, startTime, endTime } = req.body;

    // Validate required fields
    if (!employeeId || !title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID, title, and description are required'
      });
    }

    // For now, we'll use a default assignedBy value
    // In a real application, this would come from the authenticated admin/user
    const assignedBy = 'admin'; // This should be replaced with actual admin ID from auth

    const taskData: CreateTaskData = {
      employeeId,
      title,
      description,
      category,
      location,
      startTime,
      endTime,
      assignedBy
    };

    const task = await createTask(taskData);

    return res.status(201).json({
      success: true,
      message: 'Task assigned successfully and attendance status updated automatically',
      data: task
    });
  } catch (error) {
    console.error('Error assigning task:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign task'
    });
  }
};

// Get tasks for a specific employee
export const getTasksForEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { status } = req.query;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
    }

    const taskStatus = status ? status as TaskStatus : undefined;
    const tasks = await getEmployeeTasks(employeeId, taskStatus);

    return res.status(200).json({
      success: true,
      data: {
        tasks,
        total: tasks.length
      }
    });
  } catch (error) {
    console.error('Error getting employee tasks:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get employee tasks'
    });
  }
};

// Update task status
export const updateTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!taskId || !status) {
      return res.status(400).json({
        success: false,
        error: 'Task ID and status are required'
      });
    }

    // Validate status
    const validStatuses: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task status'
      });
    }

    const task = await updateTaskStatus(taskId, status);

    return res.status(200).json({
      success: true,
      message: 'Task status updated successfully and attendance status updated automatically',
      data: task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task'
    });
  }
};

// Get all tasks with pagination
export const getTasks = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as TaskStatus | undefined;

    const result = await getAllTasks(page, limit, status);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting tasks:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tasks'
    });
  }
};

// Update attendance status for an employee
export const updateEmployeeAttendanceStatus = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { status } = req.body;

    if (!employeeId || !status) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID and status are required'
      });
    }

    // Validate status
    const validStatuses = ['PRESENT', 'LATE', 'ABSENT', 'MARKDOWN'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid attendance status. Must be one of: PRESENT, LATE, ABSENT, MARKDOWN'
      });
    }

    await updateAttendanceStatus(employeeId, status);

    return res.status(200).json({
      success: true,
      message: `Attendance status updated to ${status} for employee ${employeeId}`
    });
  } catch (error) {
    console.error('Error updating attendance status:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update attendance status'
    });
  }
};
// Reset attendance attempts for an employee
export const resetEmployeeAttendanceAttempts = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
    }

    await resetAttendanceAttempts(employeeId);

    return res.status(200).json({
      success: true,
      message: `Attendance attempts reset for employee ${employeeId}`
    });
  } catch (error) {
    console.error('Error resetting attendance attempts:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset attendance attempts'
    });
  }
};
// Fix daily location time issues
export const fixLocationTimes = async (req: Request, res: Response) => {
  try {
    await fixDailyLocationTimes();

    return res.status(200).json({
      success: true,
      message: 'Daily location times fixed successfully'
    });
  } catch (error) {
    console.error('Error fixing location times:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fix location times'
    });
  }
};