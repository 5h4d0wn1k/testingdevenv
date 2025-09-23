'use client'
import { useState } from "react"
import { Filter, Eye, Clock, AlertCircle, CheckCircle, ArrowUp, ArrowRight } from "lucide-react"

export default function TicketList() {
    const [filters, setFilters] = useState({
        status: 'all',
        priority: 'all'
    })

    // Dummy data for tickets
    const tickets = [
        {
            id: 'TICK-001',
            subject: 'Order not delivered on time',
            status: 'Open',
            priority: 'High',
            category: 'Order Issues',
            createdAt: '2024-09-20',
            lastUpdated: '2024-09-21'
        },
        {
            id: 'TICK-002',
            subject: 'Product quality complaint',
            status: 'In Progress',
            priority: 'Medium',
            category: 'Product Disputes',
            createdAt: '2024-09-19',
            lastUpdated: '2024-09-20'
        },
        {
            id: 'TICK-003',
            subject: 'Account verification issue',
            status: 'Resolved',
            priority: 'Low',
            category: 'Account Queries',
            createdAt: '2024-09-18',
            lastUpdated: '2024-09-19'
        },
        {
            id: 'TICK-004',
            subject: 'Payment not processed',
            status: 'Escalated',
            priority: 'High',
            category: 'Order Issues',
            createdAt: '2024-09-17',
            lastUpdated: '2024-09-21'
        }
    ]

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

    const filteredTickets = tickets.filter(ticket => {
        if (filters.status !== 'all' && ticket.status !== filters.status) return false
        if (filters.priority !== 'all' && ticket.priority !== filters.priority) return false
        return true
    })

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={18} className="text-gray-600" />
                    <span className="font-medium text-gray-700">Filters</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Escalated">Escalated</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select
                            value={filters.priority}
                            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Priorities</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tickets List */}
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Support Tickets</h3>
                    <p className="text-sm text-gray-600">Manage your support requests</p>
                </div>

                {filteredTickets.length === 0 ? (
                    <div className="text-center py-12">
                        <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">No tickets found matching your filters</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredTickets.map((ticket) => (
                            <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-lg font-medium text-gray-900">{ticket.subject}</h4>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                                {getStatusIcon(ticket.status)}
                                                {ticket.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                            <span>Ticket ID: {ticket.id}</span>
                                            <span>Category: {ticket.category}</span>
                                            <span className={`font-medium ${getPriorityColor(ticket.priority)}`}>
                                                Priority: {ticket.priority}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span>Created: {ticket.createdAt}</span>
                                            <span>Last Updated: {ticket.lastUpdated}</span>
                                        </div>
                                    </div>
                                    <button className="flex items-center gap-2 text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors">
                                        <Eye size={16} />
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}