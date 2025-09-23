'use client'
import Loading from "@/components/Loading"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"

export default function AdminOrders() {

    const { getToken } = useAuth()
    const router = useRouter()

    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        status: '',
        paymentMethod: '',
        dateRange: ''
    })

    const fetchOrders = async () => {
        try {
            const token = await getToken()
            const params = {}
            if (filters.status) params.status = filters.status
            if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod
            if (filters.dateRange) params.dateRange = filters.dateRange

            const { data } = await axios.get('/api/admin/orders', {
                headers: { Authorization: `Bearer ${token}` },
                params
            })
            setOrders(data.orders)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const handleRowClick = (orderId) => {
        router.push(`/admin/orders/${orderId}`)
    }

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    useEffect(() => {
        fetchOrders()
    }, [filters])

    const getStatusBadge = (status) => {
        const statusColors = {
            ORDER_PLACED: 'bg-yellow-100 text-yellow-800',
            PROCESSING: 'bg-blue-100 text-blue-800',
            SHIPPED: 'bg-purple-100 text-purple-800',
            DELIVERED: 'bg-green-100 text-green-800'
        }
        return statusColors[status] || 'bg-gray-100 text-gray-800'
    }

    const getPaymentBadge = (method, isPaid) => {
        if (!isPaid) return 'bg-red-100 text-red-800'
        return method === 'STRIPE' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
    }

    return !loading ? (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">Order <span className="text-slate-800 font-medium">Management</span></h1>

            <div className="mt-4 mb-4 flex gap-4">
                <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1"
                >
                    <option value="">All Status</option>
                    <option value="ORDER_PLACED">Order Placed</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                </select>

                <select
                    value={filters.paymentMethod}
                    onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1"
                >
                    <option value="">All Payment Methods</option>
                    <option value="COD">Cash on Delivery</option>
                    <option value="STRIPE">Stripe</option>
                </select>

                <select
                    value={filters.dateRange}
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1"
                >
                    <option value="">All Time</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                </select>
            </div>

            {orders.length ? (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-2 text-left">Order ID</th>
                                <th className="px-4 py-2 text-left">Customer</th>
                                <th className="px-4 py-2 text-left">Total</th>
                                <th className="px-4 py-2 text-left">Payment Status</th>
                                <th className="px-4 py-2 text-left">Fulfillment Status</th>
                                <th className="px-4 py-2 text-left">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.id} className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer" onClick={() => handleRowClick(order.id)}>
                                    <td className="px-4 py-2 font-mono text-sm">{order.id.slice(-8)}</td>
                                    <td className="px-4 py-2">{order.user.name}</td>
                                    <td className="px-4 py-2">${order.total}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-1 rounded text-sm ${getPaymentBadge(order.paymentMethod, order.isPaid)}`}>
                                            {order.isPaid ? order.paymentMethod : 'Unpaid'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-1 rounded text-sm ${getStatusBadge(order.status)}`}>
                                            {order.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">{new Date(order.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">No orders found</h1>
                </div>
            )}
        </div>
    ) : <Loading />
}