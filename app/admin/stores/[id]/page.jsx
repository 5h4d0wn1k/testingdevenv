'use client'
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useParams, useRouter } from "next/navigation"

export default function AdminStoreDetail() {
    const { user } = useUser()
    const { getToken } = useAuth()
    const router = useRouter()
    const { id } = useParams()

    const [store, setStore] = useState(null)
    const [loading, setLoading] = useState(true)
    const [commissionRate, setCommissionRate] = useState(0)

    const fetchStore = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get(`/api/admin/stores/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            setStore(data.store)
            setCommissionRate(data.store.CommissionRate[0]?.rate || 0)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const handleApprove = async () => {
        try {
            const token = await getToken()
            await axios.post('/api/admin/approve-store', { storeId: id, status: 'approved' }, { headers: { Authorization: `Bearer ${token}` } })
            toast.success('Store approved')
            fetchStore()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const handleSuspend = async () => {
        try {
            const token = await getToken()
            await axios.post('/api/admin/toggle-store', { storeId: id }, { headers: { Authorization: `Bearer ${token}` } })
            toast.success('Store status updated')
            fetchStore()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const handleAdjustCommission = async () => {
        try {
            const token = await getToken()
            await axios.post(`/api/admin/stores/${id}`, { rate: commissionRate }, { headers: { Authorization: `Bearer ${token}` } })
            toast.success('Commission updated')
            fetchStore()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const handleSendMessage = () => {
        // TODO: implement send message
        toast.success('Message sent (placeholder)')
    }

    useEffect(() => {
        if (user && id) {
            fetchStore()
        }
    }, [user, id])

    if (loading) return <Loading />

    if (!store) return <div>Store not found</div>

    return (
        <div className="text-slate-500 mb-28">
            <button onClick={() => router.back()} className="mb-4 px-4 py-2 bg-slate-200 rounded">Back</button>
            <h1 className="text-2xl">{store.name} <span className="text-slate-800 font-medium">Details</span></h1>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Info */}
                <div className="bg-white border border-slate-200 rounded-lg p-6">
                    <h2 className="text-xl font-medium mb-4">Profile Information</h2>
                    <p><strong>Name:</strong> {store.name}</p>
                    <p><strong>Email:</strong> {store.email}</p>
                    <p><strong>Contact:</strong> {store.contact}</p>
                    <p><strong>Address:</strong> {store.address}</p>
                    <p><strong>KYC Document:</strong></p>
                    {store.logo && <img src={store.logo} alt="KYC" className="w-32 h-32 object-cover mt-2" />}
                </div>

                {/* KPIs */}
                <div className="bg-white border border-slate-200 rounded-lg p-6">
                    <h2 className="text-xl font-medium mb-4">Performance KPIs</h2>
                    <p><strong>Orders Fulfilled:</strong> {store.kpis.ordersFulfilled}</p>
                    <p><strong>Cancellation Rate:</strong> {store.kpis.cancellationRate}%</p>
                    <p><strong>Average Rating:</strong> {store.kpis.averageRating}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-6 bg-white border border-slate-200 rounded-lg p-6">
                <h2 className="text-xl font-medium mb-4">Actions</h2>
                <div className="flex gap-4 flex-wrap">
                    {store.status === 'pending' && (
                        <button onClick={handleApprove} className="px-4 py-2 bg-green-500 text-white rounded">Approve</button>
                    )}
                    <button onClick={handleSuspend} className="px-4 py-2 bg-yellow-500 text-white rounded">
                        {store.isActive ? 'Suspend' : 'Activate'}
                    </button>
                    <button onClick={handleSendMessage} className="px-4 py-2 bg-blue-500 text-white rounded">Send Message</button>
                    <div className="flex items-center gap-2">
                        <label>Commission Rate (%):</label>
                        <input
                            type="number"
                            value={commissionRate}
                            onChange={(e) => setCommissionRate(e.target.value)}
                            className="border border-slate-300 rounded px-2 py-1 w-20"
                        />
                        <button onClick={handleAdjustCommission} className="px-4 py-2 bg-purple-500 text-white rounded">Update</button>
                    </div>
                </div>
            </div>
        </div>
    )
}