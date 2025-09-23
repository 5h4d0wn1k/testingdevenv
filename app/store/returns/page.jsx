'use client'
import { useEffect, useState } from "react"
import Loading from "@/components/Loading"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import toast from "react-hot-toast"
import { Search, Filter, Eye, CheckCircle, XCircle, RotateCcw, Package, Upload } from "lucide-react"

export default function StoreReturns() {
    const [returns, setReturns] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedReturn, setSelectedReturn] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [filters, setFilters] = useState({
        status: 'all'
    })

    const { getToken } = useAuth()

    const fetchReturns = async () => {
       try {
        const token = await getToken()
        const queryParams = new URLSearchParams()
        Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== 'all') queryParams.append(key, value)
        })
        const { data } = await axios.get(`/api/store/returns?${queryParams}`, {headers: { Authorization: `Bearer ${token}` }})
        setReturns(data.returns)
       } catch (error) {
        toast.error(error?.response?.data?.error || error.message)
       }finally{
        setLoading(false)
       }
    }

    const updateReturnStatus = async (returnId, status, refundAmount = null) => {
        try {
            const token = await getToken()
            const payload = { returnId, status }
            if (refundAmount) payload.refundAmount = refundAmount

            await axios.put('/api/store/returns', payload, {headers: { Authorization: `Bearer ${token}` }})
            setReturns(prev =>
                prev.map(ret =>
                    ret.id === returnId ? {...ret, status} : ret
                )
            )
            toast.success('Return status updated!')
       } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
       }
    }

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const applyFilters = () => {
        setLoading(true)
        fetchReturns()
    }

    const clearFilters = () => {
        setFilters({ status: 'all' })
        setLoading(true)
        fetchReturns()
    }

    const openModal = (returnItem) => {
        setSelectedReturn(returnItem)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setSelectedReturn(null)
        setIsModalOpen(false)
    }

    const getStatusColor = (status) => {
        const colors = {
            REQUESTED: 'bg-blue-100 text-blue-700',
            APPROVED: 'bg-yellow-100 text-yellow-700',
            RECEIVED: 'bg-purple-100 text-purple-700',
            REFUNDED: 'bg-green-100 text-green-700',
            REJECTED: 'bg-red-100 text-red-700'
        }
        return colors[status] || 'bg-gray-100 text-gray-700'
    }

    const getStatusIcon = (status) => {
        const icons = {
            REQUESTED: <RotateCcw size={14} />,
            APPROVED: <CheckCircle size={14} />,
            RECEIVED: <Package size={14} />,
            REFUNDED: <CheckCircle size={14} />,
            REJECTED: <XCircle size={14} />
        }
        return icons[status] || <RotateCcw size={14} />
    }

    useEffect(() => {
        fetchReturns()
    }, [])

    if (loading) return <Loading />

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl text-slate-500">Store <span className="text-slate-800 font-medium">Returns</span></h1>
                <div className="text-sm text-gray-600">
                    Total Returns: {returns.length}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={18} className="text-gray-600" />
                    <span className="font-medium text-gray-700">Filters</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="REQUESTED">Requested</option>
                            <option value="APPROVED">Approved</option>
                            <option value="RECEIVED">Received</option>
                            <option value="REFUNDED">Refunded</option>
                            <option value="REJECTED">Rejected</option>
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

            {returns.length === 0 ? (
                <div className="text-center py-12">
                    <RotateCcw size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No returns found matching your filters</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-md shadow border border-gray-200">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                            <tr>
                                {["Return ID", "Order ID", "Customer", "Reason", "Status", "Requested Date", "Actions"].map((heading, i) => (
                                    <th key={i} className="px-4 py-3">{heading}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {returns.map((returnItem, index) => (
                                <tr
                                    key={returnItem.id}
                                    className="hover:bg-gray-50 transition-colors duration-150"
                                >
                                    <td className="px-4 py-3 font-mono text-xs">
                                        {returnItem.id.slice(-8)}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs">
                                        {returnItem.orderId.slice(-8)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div>
                                            <div className="font-medium text-gray-900">{returnItem.order.user?.name}</div>
                                            <div className="text-gray-500 text-xs">{returnItem.order.user?.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="max-w-xs truncate" title={returnItem.reason}>
                                            {returnItem.reason}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(returnItem.status)}`}>
                                            {getStatusIcon(returnItem.status)}
                                            {returnItem.status.replace('_', ' ')}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                        {new Date(returnItem.requestedAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openModal(returnItem)}
                                                className="text-blue-600 hover:text-blue-800 p-1"
                                                title="View Details"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {returnItem.status === 'REQUESTED' && (
                                                <>
                                                    <button
                                                        onClick={() => updateReturnStatus(returnItem.id, 'APPROVED')}
                                                        className="text-green-600 hover:text-green-800 p-1"
                                                        title="Approve Return"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => updateReturnStatus(returnItem.id, 'REJECTED')}
                                                        className="text-red-600 hover:text-red-800 p-1"
                                                        title="Reject Return"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                </>
                                            )}
                                            {returnItem.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => updateReturnStatus(returnItem.id, 'RECEIVED')}
                                                    className="text-purple-600 hover:text-purple-800 p-1"
                                                    title="Mark as Received"
                                                >
                                                    <Package size={16} />
                                                </button>
                                            )}
                                            {returnItem.status === 'RECEIVED' && (
                                                <button
                                                    onClick={() => {
                                                        const refundAmount = prompt('Enter refund amount:');
                                                        if (refundAmount) {
                                                            updateReturnStatus(returnItem.id, 'REFUNDED', parseFloat(refundAmount));
                                                        }
                                                    }}
                                                    className="text-orange-600 hover:text-orange-800 p-1"
                                                    title="Process Refund"
                                                >
                                                    <RotateCcw size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Return Details Modal */}
            {isModalOpen && selectedReturn && (
                <div onClick={closeModal} className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-semibold text-gray-900">
                                    Return #{selectedReturn.id.slice(-8)}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-gray-900 mb-3">Return Details</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium text-gray-600">Order ID:</span>
                                            <p className="font-mono">{selectedReturn.orderId.slice(-8)}</p>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-600">Status:</span>
                                            <p className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ml-2 ${getStatusColor(selectedReturn.status)}`}>
                                                {getStatusIcon(selectedReturn.status)}
                                                {selectedReturn.status.replace('_', ' ')}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-600">Requested:</span>
                                            <p>{new Date(selectedReturn.requestedAt).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-600">Reason:</span>
                                            <p>{selectedReturn.reason}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                                    <div className="text-sm">
                                        <p className="font-medium">{selectedReturn.order.user?.name}</p>
                                        <p>{selectedReturn.order.user?.email}</p>
                                        <p>{selectedReturn.order.address?.phone}</p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                                    <div className="space-y-2">
                                        {selectedReturn.order.orderItems.map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 p-2 bg-white rounded border">
                                                <img
                                                    src={item.product?.images?.[0]}
                                                    alt={item.product?.name}
                                                    className="w-10 h-10 object-cover rounded"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900 text-sm">{item.product?.name}</p>
                                                    <p className="text-gray-600 text-xs">Qty: {item.quantity}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Return Images */}
                                {selectedReturn.images && selectedReturn.images.length > 0 && (
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <Upload size={18} />
                                            Return Images
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {selectedReturn.images.map((image, i) => (
                                                <img
                                                    key={i}
                                                    src={image}
                                                    alt={`Return image ${i + 1}`}
                                                    className="w-full h-24 object-cover rounded border"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}