'use client'
import { useState } from "react"
import { ArrowLeft, Clock, AlertCircle, CheckCircle, ArrowUp, MessageSquare, User } from "lucide-react"

export default function TicketDetail({ ticketId, onBack }) {
    const [selectedStatus, setSelectedStatus] = useState('In Progress')

    // Dummy ticket data
    const ticket = {
        id: ticketId || 'TICK-001',
        subject: 'Order not delivered on time',
        status: 'In Progress',
        priority: 'High',
        category: 'Order Issues',
        createdAt: '2024-09-20T10:30:00Z',
        lastUpdated: '2024-09-21T14:15:00Z',
        orderReference: 'ORD-12345',
        description: 'I placed an order for electronics items on September 15th, but it has not been delivered yet. The estimated delivery date was September 18th. I have tried contacting customer service but haven\'t received a satisfactory response.',
        messages: [
            {
                id: 1,
                sender: 'Customer',
                message: 'I placed an order for electronics items on September 15th, but it has not been delivered yet. The estimated delivery date was September 18th. I have tried contacting customer service but haven\'t received a satisfactory response.',
                timestamp: '2024-09-20T10:30:00Z',
                isCustomer: true
            },
            {
                id: 2,
                sender: 'Support Agent',
                message: 'Thank you for reaching out. I apologize for the inconvenience caused. Let me check the status of your order ORD-12345. I\'ll get back to you within 2 hours with an update.',
                timestamp: '2024-09-20T11:45:00Z',
                isCustomer: false
            },
            {
                id: 3,
                sender: 'Support Agent',
                message: 'I\'ve investigated your order and found that there was a delay in shipping due to inventory issues. Your order is now being processed and should be shipped within the next 24 hours. You will receive a tracking number via email once it ships.',
                timestamp: '2024-09-20T14:20:00Z',
                isCustomer: false
            }
        ]
    }

    const getStatusColor = (status) => {
        const colors = {
            'Open': 'bg-blue-100 text-blue-700',
            'In Progress': 'bg-yellow-100 text-yellow-700',
            'Resolved': 'bg-green-100 text-green-700',
            'Escalated': 'bg-red-100 text-red-700'
        }
        return colors[status] || 'bg-gray-100 text-gray-700'
    }

    const getStatusIcon = (status) => {
        const icons = {
            'Open': <Clock size={14} />,
            'In Progress': <AlertCircle size={14} />,
            'Resolved': <CheckCircle size={14} />,
            'Escalated': <ArrowUp size={14} />
        }
        return icons[status] || <Clock size={14} />
    }

    const getPriorityColor = (priority) => {
        const colors = {
            'High': 'text-red-600',
            'Medium': 'text-yellow-600',
            'Low': 'text-green-600'
        }
        return colors[priority] || 'text-gray-600'
    }

    const handleStatusUpdate = () => {
        console.log('Updating status to:', selectedStatus)
        // In real implementation, this would call an API
        alert(`Status updated to ${selectedStatus}`)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                    <ArrowLeft size={16} />
                    Back to Tickets
                </button>
            </div>

            {/* Ticket Details */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">{ticket.subject}</h2>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Ticket ID: {ticket.id}</span>
                            <span>Category: {ticket.category}</span>
                            {ticket.orderReference && <span>Order: {ticket.orderReference}</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                            {getStatusIcon(ticket.status)}
                            {ticket.status}
                        </span>
                        <span className={`text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority} Priority
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">Created</h3>
                        <p className="text-sm text-gray-900">{new Date(ticket.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">Last Updated</h3>
                        <p className="text-sm text-gray-900">{new Date(ticket.lastUpdated).toLocaleString()}</p>
                    </div>
                </div>

                {/* Status Update */}
                <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Update Status</h3>
                    <div className="flex items-center gap-4">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Escalated">Escalated</option>
                        </select>
                        <button
                            onClick={handleStatusUpdate}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Update Status
                        </button>
                    </div>
                </div>
            </div>

            {/* Conversation */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <MessageSquare size={20} />
                        Conversation
                    </h3>
                </div>

                <div className="p-6 space-y-4">
                    {ticket.messages.map((message) => (
                        <div key={message.id} className={`flex gap-3 ${message.isCustomer ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex gap-3 max-w-[70%] ${message.isCustomer ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    message.isCustomer ? 'bg-blue-100' : 'bg-gray-100'
                                }`}>
                                    <User size={16} className={message.isCustomer ? 'text-blue-600' : 'text-gray-600'} />
                                </div>
                                <div className={`rounded-lg p-3 ${
                                    message.isCustomer
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-900'
                                }`}>
                                    <div className="text-sm font-medium mb-1">{message.sender}</div>
                                    <div className="text-sm">{message.message}</div>
                                    <div className={`text-xs mt-2 ${
                                        message.isCustomer ? 'text-blue-200' : 'text-gray-500'
                                    }`}>
                                        {new Date(message.timestamp).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Reply Form */}
                <div className="px-6 pb-6">
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Add Reply</h4>
                        <textarea
                            placeholder="Type your reply here..."
                            rows={3}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                        <div className="flex justify-end mt-3">
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                Send Reply
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}