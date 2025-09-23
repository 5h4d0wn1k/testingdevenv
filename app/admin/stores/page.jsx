'use client'
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"

export default function AdminStores() {

    const { user } = useUser()
    const { getToken } = useAuth()
    const router = useRouter()

    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('')

    const fetchStores = async (status = '') => {
        try {
            const token = await getToken()
            const params = status ? { status } : {}
            const { data } = await axios.get('/api/admin/stores', { headers: { Authorization: `Bearer ${token}` }, params })
            setStores(data.stores)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const getStatusDisplay = (store) => {
        if (store.status === 'pending') return 'Pending'
        if (store.status === 'approved' && store.isActive) return 'Active'
        if (store.status === 'approved' && !store.isActive) return 'Suspended'
        return store.status
    }

    const handleRowClick = (storeId) => {
        router.push(`/admin/stores/${storeId}`)
    }

    const handleFilterChange = (e) => {
        const status = e.target.value
        setStatusFilter(status)
        fetchStores(status)
    }

    useEffect(() => {
        if(user){
            fetchStores()
        }
    }, [user])

    return !loading ? (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">Vendor <span className="text-slate-800 font-medium">Management</span></h1>

            <div className="mt-4 mb-4">
                <label className="mr-2">Filter by Status:</label>
                <select value={statusFilter} onChange={handleFilterChange} className="border border-slate-300 rounded px-2 py-1">
                    <option value="">All</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                </select>
            </div>

            {stores.length ? (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-2 text-left">Store Name</th>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th className="px-4 py-2 text-left">Join Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stores.map((store) => (
                                <tr key={store.id} className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer" onClick={() => handleRowClick(store.id)}>
                                    <td className="px-4 py-2">{store.name}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-1 rounded text-sm ${
                                            getStatusDisplay(store) === 'Active' ? 'bg-green-100 text-green-800' :
                                            getStatusDisplay(store) === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {getStatusDisplay(store)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">{new Date(store.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">No stores Available</h1>
                </div>
            )}
        </div>
    ) : <Loading />
}