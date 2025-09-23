'use client'
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"

export default function AdminSupport() {

    const { user } = useUser()
    const { getToken } = useAuth()
    const router = useRouter()

    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchTickets = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/admin/support', { headers: { Authorization: `Bearer ${token}` } })
            setTickets(data.tickets)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const getStatusBadge = (status) => {
        const colors = {
            'OPEN': 'bg-blue-100 text-blue-800',
            'IN_PROGRESS': 'bg-yellow-100 text-yellow-800',
            'RESOLVED': 'bg-green-100 text-green-800',
            'ESCALATED': 'bg-red-100 text-red-800',
            'CLOSED': 'bg-gray-100 text-gray-800'
        }
        return colors[status] || 'bg-gray-100 text-gray-800'
    }

    const getPriorityBadge = (priority) => {
        const colors = {
            'high': 'bg-red-100 text-red-800',
            'medium': 'bg-yellow-100 text-yellow-800',
            'low': 'bg-green-100 text-green-800'
        }
        return colors[priority] || 'bg-gray-100 text-gray-800'
    }

    const handleRowClick = (ticketId) => {
        router.push(`/admin/support/${ticketId}`)
    }

    useEffect(() => {
        if(user){
            fetchTickets()
        }
    }, [user])

    return !loading ? (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">Support <span className="text-slate-800 font-medium">Tickets</span></h1>

            {tickets.length ? (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mt-4">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-2 text-left">Subject</th>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th className="px-4 py-2 text-left">Priority</th>
                                <th className="px-4 py-2 text-left">Created</th>
                                <th className="px-4 py-2 text-left">From</th>
                                <th className="px-4 py-2 text-left">Messages</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.map((ticket) => (
                                <tr key={ticket.id} className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer" onClick={() => handleRowClick(ticket.id)}>
                                    <td className="px-4 py-2 font-medium">{ticket.subject}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-1 rounded text-sm ${getStatusBadge(ticket.status)}`}>
                                            {ticket.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-1 rounded text-sm ${getPriorityBadge(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                                    <td className="px-4 py-2">
                                        {ticket.storeName ? `Store: ${ticket.storeName}` : ticket.userName ? `User: ${ticket.userName}` : 'Unknown'}
                                    </td>
                                    <td className="px-4 py-2">{ticket.messageCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">No support tickets found</h1>
                </div>
            )}
        </div>
    ) : <Loading />
}