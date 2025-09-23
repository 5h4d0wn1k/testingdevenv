'use client'
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { CheckCircleIcon, DollarSignIcon, TrendingUpIcon, CalendarIcon } from "lucide-react"
import { useParams } from "next/navigation"

export default function AdminPayoutDetail() {
    const { user } = useUser()
    const { getToken } = useAuth()
    const { id } = useParams()

    const [payout, setPayout] = useState(null)
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)

    const fetchPayoutDetail = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get(`/api/admin/payouts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setPayout(data.payout)
            setSummary(data.summary)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const triggerPayout = async () => {
        setProcessing(true)
        try {
            const token = await getToken()
            const { data } = await axios.put(`/api/admin/payouts/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success(data.message)
            await fetchPayoutDetail()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setProcessing(false)
    }

    useEffect(() => {
        if (user && id) {
            fetchPayoutDetail()
        }
    }, [user, id])

    if (loading) return <Loading />

    if (!payout) {
        return (
            <div className="text-slate-500 mb-28">
                <h1 className="text-2xl">Payout <span className="text-slate-800 font-medium">Not Found</span></h1>
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">Payout not found</h1>
                </div>
            </div>
        )
    }

    return (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">Payout <span className="text-slate-800 font-medium">Detail</span></h1>

            <div className="mt-6 bg-white border border-slate-200 rounded-lg shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center">
                            <DollarSignIcon className="h-8 w-8 text-blue-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-blue-600">Sales</p>
                                <p className="text-2xl font-bold text-blue-900">${summary?.sales?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                        <div className="flex items-center">
                            <TrendingUpIcon className="h-8 w-8 text-red-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-red-600">Fees</p>
                                <p className="text-2xl font-bold text-red-900">${summary?.fees?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center">
                            <CheckCircleIcon className="h-8 w-8 text-green-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-green-600">Net Amount</p>
                                <p className="text-2xl font-bold text-green-900">${payout.amount.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center">
                            <CalendarIcon className="h-8 w-8 text-slate-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-slate-600">Status</p>
                                <p className={`text-lg font-bold ${payout.status === 'PAID' ? 'text-green-600' : payout.status === 'PENDING' ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {payout.status}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t pt-6">
                    <h2 className="text-xl font-semibold mb-4">Payout Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-slate-600">Store Name</p>
                            <p className="font-medium">{payout.store.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Username</p>
                            <p className="font-medium">{payout.store.username}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Created Date</p>
                            <p className="font-medium">{new Date(payout.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Paid Date</p>
                            <p className="font-medium">{payout.payoutDate ? new Date(payout.payoutDate).toLocaleDateString() : '-'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Scheduled Date</p>
                            <p className="font-medium">{payout.scheduledDate ? new Date(payout.scheduledDate).toLocaleDateString() : '-'}</p>
                        </div>
                    </div>

                    {payout.status === 'PENDING' && (
                        <div className="mt-6">
                            <button
                                onClick={triggerPayout}
                                disabled={processing}
                                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                <CheckCircleIcon size={20} />
                                {processing ? 'Processing Payout...' : 'Trigger Manual Payout'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}