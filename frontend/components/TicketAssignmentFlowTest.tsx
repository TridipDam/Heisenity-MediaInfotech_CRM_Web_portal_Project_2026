import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { Ticket as TicketIcon, UserCheck, ArrowRight } from 'lucide-react'

// Test component to demonstrate the complete ticket assignment flow
export function TicketAssignmentFlowTest() {
  const router = useRouter()

  const mockTickets = [
    {
      id: 'ticket-001',
      ticketId: 'TKT-001',
      title: 'Network Connectivity Issues in Building A',
      description: 'Intermittent internet connection affecting multiple departments',
      priority: 'HIGH',
      category: 'NETWORK'
    },
    {
      id: 'ticket-002', 
      ticketId: 'TKT-002',
      title: 'Printer Malfunction in Office 3B',
      description: 'HP LaserJet printer showing offline status',
      priority: 'MEDIUM',
      category: 'HARDWARE'
    },
    {
      id: 'ticket-003',
      ticketId: 'TKT-003', 
      title: 'Software License Renewal Required',
      description: 'Adobe Creative Suite licenses expiring next month',
      priority: 'LOW',
      category: 'SOFTWARE'
    }
  ]

  const handleAssignAgent = (ticket: any) => {
    // This simulates the exact navigation that happens in TicketTable
    router.push(`/task-management?ticketId=${ticket.id}&action=assign`)
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TicketIcon className="h-5 w-5 text-blue-600" />
            Ticket Assignment Flow Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Click "Assign Agent" on any ticket below to test the complete flow:
          </p>
          <ol className="text-sm text-muted-foreground mb-6 space-y-1">
            <li>1. Navigate to task management page</li>
            <li>2. Automatically show assign task form</li>
            <li>3. Pre-select the clicked ticket</li>
            <li>4. Pre-populate task title and description</li>
          </ol>
          
          <div className="space-y-4">
            {mockTickets.map((ticket) => (
              <div key={ticket.id} className="border rounded-lg p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-medium">{ticket.ticketId}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      ticket.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                      ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {ticket.priority}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {ticket.category}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900">{ticket.ticketId}</h3>
                  <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
                </div>
                <Button 
                  onClick={() => handleAssignAgent(ticket)}
                  className="ml-4 bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Assign Agent
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}