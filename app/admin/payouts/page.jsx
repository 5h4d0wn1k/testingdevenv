'use client'
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { CheckCircleIcon, XCircleIcon } from "lucide-react"

export default function AdminPayouts() {

    const { user } = useUser()
    const { getToken } = useAuth()

    const [payouts, setPayouts] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('PENDING') // PENDING, PAID, FAILED, ALL
    const [approving, setApproving] = useState(null)
    const [vendor, setVendor] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    const fetchPayouts = async () => {
        setLoading(true)
        try {
            const token = await getToken()
            const params = {}
            if (filter !== 'ALL') params.status = filter
            if (vendor) params.vendor = vendor
            if (startDate) params.startDate = startDate
            if (endDate) params.endDate = endDate
            const { data } = await axios.get('/api/admin/payouts', {
                headers: { Authorization: `Bearer ${token}` },
                params
            })
            setPayouts(data.payouts)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const approvePayout = async (payoutId) => {
        setApproving(payoutId)
        try {
            const token = await getToken()
            const { data } = await axios.put(`/api/admin/payouts/${payoutId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success(data.message)
            await fetchPayouts()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setApproving(null)
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return 'text-yellow-600 bg-yellow-100'
            case 'PAID': return 'text-green-600 bg-green-100'
            case 'FAILED': return 'text-red-600 bg-red-100'
            default: return 'text-slate-600 bg-slate-100'
        }
    }

    useEffect(() => {
        if(user){
            fetchPayouts()
        }
    }, [user, filter, vendor, startDate, endDate])

    return !loading ? (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">Payout <span className="text-slate-800 font-medium">Management</span></h1>

            {/* Search Inputs */}
            <div className="mt-4 flex gap-4 items-center">
                <input
                    type="text"
                    placeholder="Vendor (store name/username)"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
                <input
                    type="date"
                    placeholder="Start Date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
                <input
                    type="date"
                    placeholder="End Date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
            </div>

            {/* Filter Buttons */}
            <div className="mt-4 flex gap-2">
                {['ALL', 'PENDING', 'PAID', 'FAILED'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                            filter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {payouts.length ? (
                <div className="mt-4 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left p-4 font-medium text-slate-700">Store Name</th>
                                <th className="text-left p-4 font-medium text-slate-700">Username</th>
                                <th className="text-left p-4 font-medium text-slate-700">Amount</th>
                                <th className="text-left p-4 font-medium text-slate-700">Status</th>
                                <th className="text-left p-4 font-medium text-slate-700">Created</th>
                                <th className="text-left p-4 font-medium text-slate-700">Paid Date</th>
                                <th className="text-left p-4 font-medium text-slate-700">Scheduled Date</th>
                                <th className="text-left p-4 font-medium text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payouts.map((payout) => (
                                <tr key={payout.id} className="border-t border-slate-200">
                                    <td className="p-4">{payout.store.name}</td>
                                    <td className="p-4">{payout.store.username}</td>
                                    <td className="p-4 font-medium">${payout.amount.toFixed(2)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>
                                            {payout.status}
                                        </span>
                                    </td>
                                    <td className="p-4">{new Date(payout.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        {payout.payoutDate ? new Date(payout.payoutDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="p-4">
                                        {payout.scheduledDate ? new Date(payout.scheduledDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="p-4">
                                        {payout.status === 'PENDING' && (
                                            <button
                                                onClick={() => approvePayout(payout.id)}
                                                disabled={approving === payout.id}
                                                className="flex items-center gap-2 text-green-600 hover:text-green-800 disabled:opacity-50"
                                            >
                                                <CheckCircleIcon size={16} />
                                                {approving === payout.id ? 'Approving...' : 'Approve'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">No payouts found</h1>
                </div>
            )}
        </div>
    ) : <Loading />
}