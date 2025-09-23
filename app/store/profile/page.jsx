'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import toast from 'react-hot-toast'
import Loading from '@/components/Loading'

export default function Profile() {
    const { getToken } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [profile, setProfile] = useState({
        businessName: '',
        taxId: '',
        businessAddress: '',
        contactPerson: '',
        phone: '',
        website: '',
        description: '',
        bankName: '',
        accountNumber: '',
        routingNumber: '',
        accountHolderName: '',
        bankAddress: '',
        termsAccepted: false
    })

    const fetchProfile = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/store/profile', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setProfile(data.profile || profile)
        } catch (error) {
            toast.error('Failed to load profile')
        }
        setLoading(false)
    }

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setProfile(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const token = await getToken()
            await axios.put('/api/store/profile', profile, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success('Profile updated successfully')
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Failed to update profile')
        }
        setSaving(false)
    }

    useEffect(() => {
        fetchProfile()
    }, [])

    if (loading) return <Loading />

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8">Store Profile Management</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Business Information</h2>
                        <div className="space-y-4">
                            <input
                                type="text"
                                name="businessName"
                                placeholder="Business Name"
                                value={profile.businessName}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded"
                                required
                            />
                            <input
                                type="text"
                                name="taxId"
                                placeholder="Tax ID"
                                value={profile.taxId}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded"
                            />
                            <textarea
                                name="businessAddress"
                                placeholder="Business Address"
                                value={profile.businessAddress}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded"
                                required
                            />
                            <input
                                type="text"
                                name="contactPerson"
                                placeholder="Contact Person"
                                value={profile.contactPerson}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded"
                                required
                            />
                            <input
                                type="tel"
                                name="phone"
                                placeholder="Phone Number"
                                value={profile.phone}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded"
                                required
                            />
                            <input
                                type="url"
                                name="website"
                                placeholder="Website"
                                value={profile.website}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded"
                            />
                            <textarea
                                name="description"
                                placeholder="Business Description"
                                value={profile.description}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded"
                            />
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-4">Bank Information</h2>
                        <div className="space-y-4">
                            <input
                                type="text"
                                name="bankName"
                                placeholder="Bank Name"
                                value={profile.bankName}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded"
                            />
                            <input
                                type="text"
                                name="accountNumber"
                                placeholder="Account Number"
                                value={profile.accountNumber}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded"
                            />
                            <input
                                type="text"
                                name="routingNumber"
                                placeholder="Routing Number"
                                value={profile.routingNumber}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded"
                            />
                            <input
                                type="text"
                                name="accountHolderName"
                                placeholder="Account Holder Name"
                                value={profile.accountHolderName}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded"
                            />
                            <textarea
                                name="bankAddress"
                                placeholder="Bank Address"
                                value={profile.bankAddress}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            name="termsAccepted"
                            checked={profile.termsAccepted}
                            onChange={handleInputChange}
                            className="mr-2"
                        />
                        I accept the terms and conditions
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {saving ? 'Saving...' : 'Update Profile'}
                </button>
            </form>
        </div>
    )
}