'use client'
import Loading from "@/components/Loading"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useParams, useRouter } from "next/navigation"

export default function AdminOrderDetail() {

    const { getToken } = useAuth()
    const router = useRouter()
    const { id } = useParams()

    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)

    const fetchOrder = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get(`/api/admin/orders/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setOrder(data)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
            router.push('/admin/orders')
        }
        setLoading(false)
    }

    const handleStatusUpdate = async (newStatus) => {
        setActionLoading(true)
        try {
            const token = await getToken()
            await axios.patch(`/api/admin/orders/${id}`, {
                status: newStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success(`Order status updated to ${newStatus.replace('_', ' ')}`)
            fetchOrder() // Refresh data
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setActionLoading(false)
    }

    const handleRefund = async () => {
        if (!confirm('Are you sure you want to issue a refund for this order?')) return

        setActionLoading(true)
        try {
            const token = await getToken()
            await axios.post(`/api/admin/orders/${id}/refund`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success('Refund processed successfully')
            fetchOrder()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setActionLoading(false)
    }

    useEffect(() => {
        if (id) fetchOrder()
    }, [id])

    if (loading) return <Loading />

    if (!order) return <div>Order not found</div>

    const getStatusBadge = (status) => {
        const statusColors = {
            ORDER_PLACED: 'bg-yellow-100 text-yellow-800',
            PROCESSING: 'bg-blue-100 text-blue-800',
            SHIPPED: 'bg-purple-100 text-purple-800',
            DELIVERED: 'bg-green-100 text-green-800'
        }
        return statusColors[status] || 'bg-gray-100 text-gray-800'
    }

    return (
        <div className="text-slate-500 mb-28">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => router.push('/admin/orders')}
                    className="text-slate-600 hover:text-slate-800"
                >
                    ← Back to Orders
                </button>
                <h1 className="text-2xl">Order <span className="text-slate-800 font-medium">#{order.id.slice(-8)}</span></h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Order Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Status and Actions */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Order Status</h2>
                            <span className={`px-3 py-1 rounded text-sm ${getStatusBadge(order.status)}`}>
                                {order.status.replace('_', ' ')}
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {order.status === 'ORDER_PLACED' && (
                                <button
                                    onClick={() => handleStatusUpdate('PROCESSING')}
                                    disabled={actionLoading}
                                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                                >
                                    Mark as Processing
                                </button>
                            )}
                            {order.status === 'PROCESSING' && (
                                <button
                                    onClick={() => handleStatusUpdate('SHIPPED')}
                                    disabled={actionLoading}
                                    className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
                                >
                                    Mark as Shipped
                                </button>
                            )}
                            {order.status === 'SHIPPED' && (
                                <button
                                    onClick={() => handleStatusUpdate('DELIVERED')}
                                    disabled={actionLoading}
                                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                                >
                                    Mark as Delivered
                                </button>
                            )}
                            {order.isPaid && order.paymentMethod === 'STRIPE' && (
                                <button
                                    onClick={handleRefund}
                                    disabled={actionLoading}
                                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
                                >
                                    Issue Refund
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Order Items</h2>
                        <div className="space-y-4">
                            {order.orderItems.map((item) => (
                                <div key={item.productId} className="flex items-center gap-4 p-4 border border-slate-200 rounded">
                                    <img
                                        src={item.product.images[0]}
                                        alt={item.product.name}
                                        className="w-16 h-16 object-cover rounded"
                                    />
                                    <div className="flex-1">
                                        <h3 className="font-medium">{item.product.name}</h3>
                                        <p className="text-sm text-slate-600">Quantity: {item.quantity}</p>
                                        <p className="text-sm text-slate-600">${item.price} each</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                                        <p className="text-sm text-slate-600">Commission: ${item.commissionAmount.toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Customer Info */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Customer</h2>
                        <div className="space-y-2">
                            <p><strong>Name:</strong> {order.user.name}</p>
                            <p><strong>Email:</strong> {order.user.email}</p>
                        </div>
                    </div>

                    {/* Store Info */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Store</h2>
                        <div className="space-y-2">
                            <p><strong>Name:</strong> {order.store.name}</p>
                            <p><strong>Username:</strong> {order.store.username}</p>
                            <p><strong>Email:</strong> {order.store.email}</p>
                            <p><strong>Contact:</strong> {order.store.contact}</p>
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
                        <div className="space-y-1 text-sm">
                            <p>{order.address.name}</p>
                            <p>{order.address.street}</p>
                            <p>{order.address.city}, {order.address.state} {order.address.zip}</p>
                            <p>{order.address.country}</p>
                            <p>{order.address.phone}</p>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Payment</h2>
                        <div className="space-y-2">
                            <p><strong>Method:</strong> {order.paymentMethod}</p>
                            <p><strong>Status:</strong> {order.isPaid ? 'Paid' : 'Unpaid'}</p>
                            <p><strong>Total:</strong> ${order.total}</p>
                            <p><strong>Commission:</strong> ${order.totalCommission}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}