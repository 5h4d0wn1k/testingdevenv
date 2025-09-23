'use client'
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { EditIcon } from "lucide-react"

export default function AdminCommissions() {

    const { user } = useUser()
    const { getToken } = useAuth()

    const [commissionRates, setCommissionRates] = useState([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedRate, setSelectedRate] = useState(null)
    const [rateValue, setRateValue] = useState('')
    const [updating, setUpdating] = useState(false)

    const fetchCommissionRates = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/admin/commissions', {headers: { Authorization: `Bearer ${token}` }})
            setCommissionRates(data.commissionRates)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const openEditModal = (rate) => {
        setSelectedRate(rate)
        setRateValue(rate.rate.toString())
        setModalOpen(true)
    }

    const closeModal = () => {
        setModalOpen(false)
        setSelectedRate(null)
        setRateValue('')
    }

    const updateRate = async (e) => {
        e.preventDefault()

        const rate = parseFloat(rateValue)
        if (isNaN(rate) || rate < 0 || rate > 100) {
            toast.error('Rate must be a number between 0 and 100')
            return
        }

        setUpdating(true)
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/admin/commissions', {
                storeId: selectedRate.storeId,
                rate
            }, {headers: { Authorization: `Bearer ${token}` }})

            toast.success(data.message)
            await fetchCommissionRates()
            closeModal()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setUpdating(false)
    }

    useEffect(() => {
        if(user){
            fetchCommissionRates()
        }
    }, [user])

    return !loading ? (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">Commission <span className="text-slate-800 font-medium">Rates</span></h1>

            {commissionRates.length ? (
                <div className="mt-4 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left p-4 font-medium text-slate-700">Store Name</th>
                                <th className="text-left p-4 font-medium text-slate-700">Username</th>
                                <th className="text-left p-4 font-medium text-slate-700">Email</th>
                                <th className="text-left p-4 font-medium text-slate-700">Rate (%)</th>
                                <th className="text-left p-4 font-medium text-slate-700">Last Updated</th>
                                <th className="text-left p-4 font-medium text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {commissionRates.map((rate) => (
                                <tr key={rate.id} className="border-t border-slate-200">
                                    <td className="p-4">{rate.store.name}</td>
                                    <td className="p-4">{rate.store.username}</td>
                                    <td className="p-4">{rate.store.email}</td>
                                    <td className="p-4">{rate.rate}%</td>
                                    <td className="p-4">{new Date(rate.updatedAt).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => openEditModal(rate)}
                                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                                        >
                                            <EditIcon size={16} />
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">No commission rates set</h1>
                </div>
            )}

            {/* Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h2 className="text-xl font-semibold mb-4">Edit Commission Rate</h2>
                        <p className="text-slate-600 mb-4">Store: {selectedRate?.store.name}</p>

                        <form onSubmit={updateRate}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Commission Rate (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={rateValue}
                                    onChange={(e) => setRateValue(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {updating ? 'Updating...' : 'Update'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    ) : <Loading />
}