'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import toast from 'react-hot-toast'
import Loading from '@/components/Loading'

export default function SubscriptionPlansPage() {
    const { getToken } = useAuth()
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingPlan, setEditingPlan] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        commissionRate: '',
        listingLimit: '',
        features: [],
        registrationFee: '',
        listingFee: '',
        isActive: true
    })

    useEffect(() => {
        fetchPlans()
    }, [])

    const fetchPlans = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/admin/subscription-plans', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setPlans(data.plans)
        } catch (error) {
            toast.error('Failed to load plans')
        }
        setLoading(false)
    }

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleFeaturesChange = (e) => {
        const features = e.target.value.split('\n').filter(f => f.trim())
        setFormData(prev => ({ ...prev, features }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const token = await getToken()
            const data = {
                ...formData,
                price: parseFloat(formData.price),
                commissionRate: parseFloat(formData.commissionRate),
                listingLimit: parseInt(formData.listingLimit),
                registrationFee: parseFloat(formData.registrationFee),
                listingFee: parseFloat(formData.listingFee)
            }
            if (editingPlan) {
                data.id = editingPlan.id
            }
            await axios.post('/api/admin/subscription-plans', data, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success(editingPlan ? 'Plan updated successfully' : 'Plan created successfully')
            fetchPlans()
            resetForm()
        } catch (error) {
            toast.error('Failed to save plan')
        }
    }

    const handleEdit = (plan) => {
        setEditingPlan(plan)
        setFormData({
            name: plan.name,
            description: plan.description || '',
            price: plan.price.toString(),
            commissionRate: plan.commissionRate.toString(),
            listingLimit: plan.listingLimit.toString(),
            features: plan.features,
            registrationFee: plan.registrationFee.toString(),
            listingFee: plan.listingFee.toString(),
            isActive: plan.isActive
        })
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this plan?')) return
        try {
            const token = await getToken()
            await axios.delete('/api/admin/subscription-plans', {
                headers: { Authorization: `Bearer ${token}` },
                data: { id }
            })
            toast.success('Plan deleted successfully')
            fetchPlans()
        } catch (error) {
            toast.error('Failed to delete plan')
        }
    }

    const resetForm = () => {
        setEditingPlan(null)
        setFormData({
            name: '',
            description: '',
            price: '',
            commissionRate: '',
            listingLimit: '',
            features: [],
            registrationFee: '',
            listingFee: '',
            isActive: true
        })
    }

    if (loading) return <Loading />

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8">Subscription Plans Management</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-xl font-semibold mb-4">
                        {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full p-2 border rounded"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Price ($/month)</label>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleInputChange}
                                    step="0.01"
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Commission Rate (%)</label>
                                <input
                                    type="number"
                                    name="commissionRate"
                                    value={formData.commissionRate}
                                    onChange={handleInputChange}
                                    step="0.1"
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Listing Limit</label>
                                <input
                                    type="number"
                                    name="listingLimit"
                                    value={formData.listingLimit}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Registration Fee ($)</label>
                                <input
                                    type="number"
                                    name="registrationFee"
                                    value={formData.registrationFee}
                                    onChange={handleInputChange}
                                    step="0.01"
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Listing Fee ($)</label>
                            <input
                                type="number"
                                name="listingFee"
                                value={formData.listingFee}
                                onChange={handleInputChange}
                                step="0.01"
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Features (one per line)</label>
                            <textarea
                                value={formData.features.join('\n')}
                                onChange={handleFeaturesChange}
                                rows={4}
                                className="w-full p-2 border rounded"
                                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                            />
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={handleInputChange}
                                className="mr-2"
                            />
                            <label className="text-sm font-medium">Active</label>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                {editingPlan ? 'Update' : 'Create'}
                            </button>
                            {editingPlan && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Plans List */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-xl font-semibold mb-4">Existing Plans</h2>
                    <div className="space-y-4">
                        {plans.map((plan) => (
                            <div key={plan.id} className="border rounded p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(plan)}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(plan.id)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{plan.description}</p>
                                <div className="text-sm space-y-1">
                                    <p><strong>Price:</strong> ${plan.price}/month</p>
                                    <p><strong>Commission:</strong> {plan.commissionRate}%</p>
                                    <p><strong>Listing Limit:</strong> {plan.listingLimit}</p>
                                    <p><strong>Fees:</strong> Reg ${plan.registrationFee}, List ${plan.listingFee}</p>
                                    <p><strong>Status:</strong> {plan.isActive ? 'Active' : 'Inactive'}</p>
                                </div>
                                <div className="mt-2">
                                    <strong>Features:</strong>
                                    <ul className="list-disc list-inside text-sm">
                                        {plan.features.map((feature, index) => (
                                            <li key={index}>{feature}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}