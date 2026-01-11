import { prisma } from '@/lib/prisma'
import { createTask, CreateTaskData, TaskRecord } from '../tasks/task.service';

export interface Team {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamWithMembers extends Team {
  members: Array<{
    id: string;
    name: string;
    employeeId: string;
    email: string;
    isTeamLeader: boolean;
  }>;
  teamLeader?: {
    id: string;
    name: string;
    employeeId: string;
    email: string;
  };
}

export async function getAllTeams(): Promise<TeamWithMembers[]> {
  const teams = await prisma.team.findMany({
    include: {
      members: {
        where: {
          status: 'ACTIVE'
        },
        select: {
          id: true,
          name: true,
          employeeId: true,
          email: true,
          isTeamLeader: true
        },
        orderBy: [
          { isTeamLeader: 'desc' },
          { name: 'asc' }
        ]
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  return teams.map(team => {
    const teamLeader = team.members.find(member => member.isTeamLeader);
    return {
      ...team,
      teamLeader
    };
  });
}

export async function getTeamById(teamId: string): Promise<TeamWithMembers | null> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        where: {
          status: 'ACTIVE'
        },
        select: {
          id: true,
          name: true,
          employeeId: true,
          email: true,
          isTeamLeader: true
        },
        orderBy: [
          { isTeamLeader: 'desc' },
          { name: 'asc' }
        ]
      }
    }
  });

  if (!team) return null;

  const teamLeader = team.members.find(member => member.isTeamLeader);
  return {
    ...team,
    teamLeader
  };
}

export async function createTeam(name: string, description?: string): Promise<Team> {
  return await prisma.team.create({
    data: {
      name,
      description
    }
  });
}

export async function createTeamWithMembers(
  name: string, 
  description: string | null, 
  memberIds: string[], 
  teamLeaderId?: string
): Promise<TeamWithMembers> {
  // Create the team first
  const team = await prisma.team.create({
    data: {
      name,
      description
    }
  });

  // Update employees to assign them to this team
  if (memberIds.length > 0) {
    await prisma.employee.updateMany({
      where: {
        id: {
          in: memberIds
        }
      },
      data: {
        teamId: team.id,
        isTeamLeader: false // Reset all to false first
      }
    });

    // Set team leader if specified
    if (teamLeaderId && memberIds.includes(teamLeaderId)) {
      await prisma.employee.update({
        where: {
          id: teamLeaderId
        },
        data: {
          isTeamLeader: true
        }
      });
    }
  }

  // Return the team with members
  const teamWithMembers = await getTeamById(team.id);
  return teamWithMembers!;
}

export async function createTeamTask(
  teamId: string,
  title: string,
  description: string,
  category?: string,
  location?: string,
  startTime?: string,
  endTime?: string,
  assignedBy: string = 'admin'
): Promise<{ tasks: TaskRecord[], teamName: string, memberCount: number }> {
  try {
    // Get team with members
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          select: { id: true, employeeId: true, name: true }
        }
      }
    });

    if (!team) {
      throw new Error('Team not found');
    }

    if (team.members.length === 0) {
      throw new Error('Team has no active members');
    }

    const tasks: TaskRecord[] = [];

    // Create tasks for all team members
    for (const member of team.members) {
      const taskData: CreateTaskData = {
        employeeId: member.employeeId, // Use the string employeeId, not the internal id
        title,
        description,
        category,
        location,
        startTime,
        assignedBy
      };

      const task = await createTask(taskData);
      tasks.push(task);
    }

    return {
      tasks,
      teamName: team.name,
      memberCount: team.members.length
    };
  } catch (error) {
    console.error('Error creating team task:', error);
    throw error;
  }
}

export async function updateTeamMembers(
  teamId: string,
  memberIds: string[],
  teamLeaderId?: string
): Promise<TeamWithMembers | null> {
  // First, remove all current members from this team
  await prisma.employee.updateMany({
    where: {
      teamId: teamId
    },
    data: {
      teamId: null,
      isTeamLeader: false
    }
  });

  // Add new members to the team
  if (memberIds.length > 0) {
    await prisma.employee.updateMany({
      where: {
        id: {
          in: memberIds
        }
      },
      data: {
        teamId: teamId,
        isTeamLeader: false
      }
    });

    // Set team leader if specified
    if (teamLeaderId && memberIds.includes(teamLeaderId)) {
      await prisma.employee.update({
        where: {
          id: teamLeaderId
        },
        data: {
          isTeamLeader: true
        }
      });
    }
  }

  return await getTeamById(teamId);
}

export async function deleteTeam(teamId: string): Promise<boolean> {
  try {
    // First, remove all members from this team
    await prisma.employee.updateMany({
      where: {
        teamId: teamId
      },
      data: {
        teamId: null,
        isTeamLeader: false
      }
    });

    // Delete the team
    await prisma.team.delete({
      where: {
        id: teamId
      }
    });

    return true;
  } catch (error) {
    console.error('Error deleting team:', error);
    throw error;
  }
}
