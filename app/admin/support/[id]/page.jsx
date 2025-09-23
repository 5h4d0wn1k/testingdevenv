'use client'
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useParams, useRouter } from "next/navigation"

export default function AdminSupportDetail() {
    const { user } = useUser()
    const { getToken } = useAuth()
    const router = useRouter()
    const { id } = useParams()

    const [ticket, setTicket] = useState(null)
    const [loading, setLoading] = useState(true)
    const [replyMessage, setReplyMessage] = useState('')
    const [sendingReply, setSendingReply] = useState(false)

    const fetchTicket = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get(`/api/admin/support/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            setTicket(data.ticket)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const handleSendReply = async () => {
        if (!replyMessage.trim()) {
            toast.error('Please enter a message')
            return
        }

        setSendingReply(true)
        try {
            const token = await getToken()
            await axios.post(`/api/admin/support/${id}`, { message: replyMessage }, { headers: { Authorization: `Bearer ${token}` } })
            toast.success('Reply sent successfully')
            setReplyMessage('')
            await fetchTicket() // Refresh messages
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setSendingReply(false)
    }

    const handleEscalate = async () => {
        try {
            const token = await getToken()
            await axios.put(`/api/admin/support/${id}`, { status: 'ESCALATED' }, { headers: { Authorization: `Bearer ${token}` } })
            toast.success('Ticket escalated')
            await fetchTicket()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const handleClose = async () => {
        try {
            const token = await getToken()
            await axios.put(`/api/admin/support/${id}`, { status: 'CLOSED' }, { headers: { Authorization: `Bearer ${token}` } })
            toast.success('Ticket closed')
            await fetchTicket()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
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

    const getSenderDisplay = (message) => {
        if (message.senderType === 'admin') return 'Admin Support'
        if (message.senderType === 'store') return ticket?.store?.name || 'Store'
        if (message.senderType === 'user') return ticket?.user?.name || 'User'
        return 'Unknown'
    }

    useEffect(() => {
        if (user && id) {
            fetchTicket()
        }
    }, [user, id])

    if (loading) return <Loading />

    if (!ticket) return <div>Ticket not found</div>

    return (
        <div className="text-slate-500 mb-28">
            <button onClick={() => router.back()} className="mb-4 px-4 py-2 bg-slate-200 rounded">Back</button>
            <h1 className="text-2xl">{ticket.subject} <span className="text-slate-800 font-medium">Details</span></h1>

            {/* Ticket Info */}
            <div className="mt-6 bg-white border border-slate-200 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">Subject</h3>
                        <p className="text-sm text-gray-900">{ticket.subject}</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">Status</h3>
                        <span className={`px-2 py-1 rounded text-sm ${getStatusBadge(ticket.status)}`}>
                            {ticket.status.replace('_', ' ')}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">Priority</h3>
                        <span className={`px-2 py-1 rounded text-sm ${getPriorityBadge(ticket.priority)}`}>
                            {ticket.priority}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">From</h3>
                        <p className="text-sm text-gray-900">
                            {ticket.store ? `Store: ${ticket.store.name}` : ticket.user ? `User: ${ticket.user.name}` : 'Unknown'}
                        </p>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">Created</h3>
                        <p className="text-sm text-gray-900">{new Date(ticket.createdAt).toLocaleString()}</p>
                    </div>
                    {ticket.order && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-1">Related Order</h3>
                            <p className="text-sm text-gray-900">Order #{ticket.order.id}</p>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 flex-wrap">
                    <button
                        onClick={handleEscalate}
                        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                        disabled={ticket.status === 'ESCALATED'}
                    >
                        Escalate
                    </button>
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                        disabled={ticket.status === 'CLOSED'}
                    >
                        Close Ticket
                    </button>
                </div>
            </div>

            {/* Conversation Thread */}
            <div className="mt-6 bg-white border border-slate-200 rounded-lg">
                <div className="px-6 py-4 border-b border-slate-200">
                    <h2 className="text-xl font-medium">Conversation</h2>
                </div>

                <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                    {ticket.messages.map((message) => (
                        <div key={message.id} className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-lg p-3 ${
                                message.senderType === 'admin'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-900'
                            }`}>
                                <div className="text-sm font-medium mb-1">{getSenderDisplay(message)}</div>
                                <div className="text-sm">{message.message}</div>
                                <div className={`text-xs mt-2 ${
                                    message.senderType === 'admin' ? 'text-blue-200' : 'text-gray-500'
                                }`}>
                                    {new Date(message.createdAt).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Reply Form */}
                {ticket.status !== 'CLOSED' && (
                    <div className="px-6 pb-6 border-t">
                        <h3 className="text-lg font-medium mb-4">Reply</h3>
                        <textarea
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Type your reply here..."
                            rows={4}
                            className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                        <div className="flex justify-end mt-3">
                            <button
                                onClick={handleSendReply}
                                disabled={sendingReply || !replyMessage.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sendingReply ? 'Sending...' : 'Send Reply'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}