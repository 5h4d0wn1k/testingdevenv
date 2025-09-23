'use client'
import { useEffect, useState } from "react"
import Loading from "@/components/Loading"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import toast from "react-hot-toast"
import { Search, Filter, Calendar, Truck, Package, RotateCcw, DollarSign, Eye, CheckCircle, XCircle, Clock } from "lucide-react"

export default function StoreOrders() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [filters, setFilters] = useState({
        status: 'all',
        startDate: '',
        endDate: '',
        paymentMethod: 'all',
        fulfillmentType: 'all'
    })

    const { getToken } = useAuth()

    const fetchOrders = async () => {
       try {
        const token = await getToken()
        const queryParams = new URLSearchParams()
        Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== 'all') queryParams.append(key, value)
        })
        const { data } = await axios.get(`/api/store/orders?${queryParams}`, {headers: { Authorization: `Bearer ${token}` }})
        setOrders(data.orders)
       } catch (error) {
        toast.error(error?.response?.data?.error || error.message)
       }finally{
        setLoading(false)
       }
    }

    const updateOrderStatus = async (orderId, status) => {
        try {
            const token = await getToken()
            await axios.post('/api/store/orders',{orderId, status}, {headers: { Authorization: `Bearer ${token}` }})
            setOrders(prev =>
                prev.map(order =>
                    order.id === orderId ? {...order, status} : order
                )
            )
            toast.success('Order status updated!')
       } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
       }
    }

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const applyFilters = () => {
        setLoading(true)
        fetchOrders()
    }

    const clearFilters = () => {
        setFilters({
            status: 'all',
            startDate: '',
            endDate: '',
            paymentMethod: 'all',
            fulfillmentType: 'all'
        })
        setLoading(true)
        fetchOrders()
    }

    const openModal = (order) => {
        setSelectedOrder(order)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setSelectedOrder(null)
        setIsModalOpen(false)
    }

    const getStatusColor = (status) => {
        const colors = {
            ORDER_PLACED: 'bg-blue-100 text-blue-700',
            PROCESSING: 'bg-yellow-100 text-yellow-700',
            SHIPPED: 'bg-purple-100 text-purple-700',
            DELIVERED: 'bg-green-100 text-green-700',
            CANCELLED: 'bg-red-100 text-red-700',
            REFUNDED: 'bg-gray-100 text-gray-700'
        }
        return colors[status] || 'bg-gray-100 text-gray-700'
    }

    const getStatusIcon = (status) => {
        const icons = {
            ORDER_PLACED: <Clock size={14} />,
            PROCESSING: <Package size={14} />,
            SHIPPED: <Truck size={14} />,
            DELIVERED: <CheckCircle size={14} />,
            CANCELLED: <XCircle size={14} />,
            REFUNDED: <RotateCcw size={14} />
        }
        return icons[status] || <Clock size={14} />
    }

    useEffect(() => {
        fetchOrders()
    }, [])

    if (loading) return <Loading />

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl text-slate-500">Store <span className="text-slate-800 font-medium">Orders</span></h1>
                <div className="text-sm text-gray-600">
                    Total Orders: {orders.length}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={18} className="text-gray-600" />
                    <span className="font-medium text-gray-700">Filters</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="ORDER_PLACED">Order Placed</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="SHIPPED">Shipped</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="REFUNDED">Refunded</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                        <select
                            value={filters.paymentMethod}
                            onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Methods</option>
                            <option value="STRIPE">Stripe</option>
                            <option value="COD">Cash on Delivery</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fulfillment Type</label>
                        <select
                            value={filters.fulfillmentType}
                            onChange={(e) => handleFilterChange('fulfillmentType', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Types</option>
                            <option value="standard">Standard</option>
                            <option value="express">Express</option>
                            <option value="pickup">Store Pickup</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={applyFilters}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Search size={16} />
                        Apply Filters
                    </button>
                    <button
                        onClick={clearFilters}
                        className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="text-center py-12">
                    <Package size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No orders found matching your filters</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-md shadow border border-gray-200">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                            <tr>
                                {["Order ID", "Customer", "Items", "Total", "Payment", "Status", "Date", "Actions"].map((heading, i) => (
                                    <th key={i} className="px-4 py-3">{heading}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.map((order, index) => (
                                <tr
                                    key={order.id}
                                    className="hover:bg-gray-50 transition-colors duration-150"
                                >
                                    <td className="px-4 py-3 font-mono text-xs">
                                        {order.id.slice(-8)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div>
                                            <div className="font-medium text-gray-900">{order.user?.name}</div>
                                            <div className="text-gray-500 text-xs">{order.user?.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm">
                                            {order.orderItems.length} item{order.orderItems.length !== 1 ? 's' : ''}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {order.orderItems.slice(0, 2).map(item => item.product?.name).join(', ')}
                                            {order.orderItems.length > 2 && ` +${order.orderItems.length - 2} more`}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900">${order.total.toFixed(2)}</div>
                                        {order.isCouponUsed && (
                                            <div className="text-xs text-green-600">Coupon applied</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            order.paymentMethod === 'STRIPE' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                        }`}>
                                            {order.paymentMethod}
                                        </span>
                                        {order.isPaid ? (
                                            <div className="text-xs text-green-600 mt-1">✓ Paid</div>
                                        ) : (
                                            <div className="text-xs text-red-600 mt-1">✗ Unpaid</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                            {getStatusIcon(order.status)}
                                            {order.status.replace('_', ' ')}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                        <br />
                                        {new Date(order.createdAt).toLocaleTimeString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openModal(order)}
                                                className="text-blue-600 hover:text-blue-800 p-1"
                                                title="View Details"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && (
                                                <select
                                                    value={order.status}
                                                    onChange={e => updateOrderStatus(order.id, e.target.value)}
                                                    className="border border-gray-300 rounded text-xs px-2 py-1 focus:ring focus:ring-blue-200"
                                                >
                                                    <option value="ORDER_PLACED">Order Placed</option>
                                                    <option value="PROCESSING">Processing</option>
                                                    <option value="SHIPPED">Shipped</option>
                                                    <option value="DELIVERED">Delivered</option>
                                                    <option value="CANCELLED">Cancelled</option>
                                                </select>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detailed Order Modal */}
            {isModalOpen && selectedOrder && (
                <div onClick={closeModal} className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-semibold text-gray-900">
                                    Order #{selectedOrder.id.slice(-8)}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Customer & Shipping Details */}
                                <div className="space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <Truck size={18} />
                                            Shipping Address
                                        </h3>
                                        <div className="text-sm text-gray-700">
                                            <p className="font-medium">{selectedOrder.address?.name}</p>
                                            <p>{selectedOrder.address?.street}</p>
                                            <p>{selectedOrder.address?.city}, {selectedOrder.address?.state} {selectedOrder.address?.zip}</p>
                                            <p>{selectedOrder.address?.country}</p>
                                            <p className="mt-2"><span className="font-medium">Phone:</span> {selectedOrder.address?.phone}</p>
                                            <p><span className="font-medium">Email:</span> {selectedOrder.user?.email}</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="font-semibold text-gray-900 mb-3">Order Information</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Order Date:</span>
                                                <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Status:</span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                                                    {getStatusIcon(selectedOrder.status)}
                                                    {selectedOrder.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Payment Method:</span>
                                                <span>{selectedOrder.paymentMethod}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Payment Status:</span>
                                                <span className={selectedOrder.isPaid ? 'text-green-600' : 'text-red-600'}>
                                                    {selectedOrder.isPaid ? 'Paid' : 'Unpaid'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Items & Payment Breakdown */}
                                <div className="space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                                        <div className="space-y-3">
                                            {selectedOrder.orderItems.map((item, i) => (
                                                <div key={i} className="flex items-center gap-3 p-3 bg-white rounded border">
                                                    <img
                                                        src={item.product?.images?.[0]}
                                                        alt={item.product?.name}
                                                        className="w-12 h-12 object-cover rounded"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900 text-sm">{item.product?.name}</p>
                                                        <p className="text-gray-600 text-xs">SKU: {item.product?.sku || 'N/A'}</p>
                                                        <p className="text-gray-600 text-xs">Qty: {item.quantity}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                                                        <p className="text-gray-600 text-xs">${item.price} each</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <DollarSign size={18} />
                                            Payment Breakdown
                                        </h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>Subtotal:</span>
                                                <span>${selectedOrder.total.toFixed(2)}</span>
                                            </div>
                                            {selectedOrder.isCouponUsed && selectedOrder.coupon && (
                                                <div className="flex justify-between text-green-600">
                                                    <span>Coupon ({selectedOrder.coupon.code}):</span>
                                                    <span>-${((selectedOrder.total * selectedOrder.coupon.discount) / 100).toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-red-600">
                                                <span>Commission:</span>
                                                <span>-${selectedOrder.totalCommission.toFixed(2)}</span>
                                            </div>
                                            <div className="border-t pt-2 flex justify-between font-semibold text-gray-900">
                                                <span>Net Earnings:</span>
                                                <span>${(selectedOrder.total - selectedOrder.totalCommission).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-600">
                                                <span>Commission Status:</span>
                                                <span className={selectedOrder.commissionPaid ? 'text-green-600' : 'text-yellow-600'}>
                                                    {selectedOrder.commissionPaid ? 'Paid' : 'Pending'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-6 pt-4 border-t">
                                <div className="flex flex-wrap justify-end gap-3">
                                    <button
                                        onClick={closeModal}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                    >
                                        Close
                                    </button>

                                    {/* Accept Order */}
                                    {selectedOrder.status === 'ORDER_PLACED' && (
                                        <button
                                            onClick={() => {
                                                updateOrderStatus(selectedOrder.id, 'PROCESSING')
                                                closeModal()
                                            }}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                        >
                                            <CheckCircle size={16} />
                                            Accept Order
                                        </button>
                                    )}

                                    {/* Packing */}
                                    {selectedOrder.status === 'PROCESSING' && (
                                        <button
                                            onClick={() => {
                                                updateOrderStatus(selectedOrder.id, 'SHIPPED')
                                                closeModal()
                                            }}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                        >
                                            <Package size={16} />
                                            Mark as Packed
                                        </button>
                                    )}

                                    {/* Shipping */}
                                    {(selectedOrder.status === 'PROCESSING' || selectedOrder.status === 'SHIPPED') && (
                                        <button
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                                        >
                                            <Truck size={16} />
                                            Ship Order
                                        </button>
                                    )}

                                    {/* Cancel Order */}
                                    {selectedOrder.status !== 'DELIVERED' && selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'REFUNDED' && (
                                        <button
                                            onClick={() => {
                                                if (confirm('Are you sure you want to cancel this order?')) {
                                                    updateOrderStatus(selectedOrder.id, 'CANCELLED')
                                                    closeModal()
                                                }
                                            }}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                        >
                                            <XCircle size={16} />
                                            Cancel Order
                                        </button>
                                    )}

                                    {/* Issue Refund */}
                                    {(selectedOrder.status === 'CANCELLED' || selectedOrder.status === 'DELIVERED') && !selectedOrder.refunds?.length && (
                                        <button
                                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                                        >
                                            <RotateCcw size={16} />
                                            Issue Refund
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
