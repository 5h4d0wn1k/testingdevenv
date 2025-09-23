'use client'
import { useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Mail, Lock, Bell, Save, AlertCircle, User } from 'lucide-react'

const ProfileSettings = ({ settings, onUpdate }) => {
    const { getToken } = useAuth()
    const { user } = useUser()
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [formData, setFormData] = useState({
        email: user?.emailAddresses[0]?.emailAddress || '',
        emailNotifications: settings?.emailNotifications ?? true,
        orderNotifications: settings?.orderNotifications ?? true,
        returnNotifications: settings?.returnNotifications ?? true,
        payoutNotifications: settings?.payoutNotifications ?? true
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            const token = await getToken()
            const { data } = await axios.put('/api/store/settings', {
                emailNotifications: formData.emailNotifications,
                orderNotifications: formData.orderNotifications,
                returnNotifications: formData.returnNotifications,
                payoutNotifications: formData.payoutNotifications
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })

            setMessage('Settings updated successfully!')
            onUpdate()
        } catch (error) {
            console.error('Error updating settings:', error)
            setMessage(error.response?.data?.error || 'Failed to update settings')
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
                <User className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email Settings
                    </h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter your email"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Email updates are managed through your Clerk account
                        </p>
                    </div>
                </div>

                {/* Notification Preferences */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Notification Preferences
                    </h3>

                    <div className="space-y-3">
                        <div className="flex items-center">
                            <input
                                id="email-notifications"
                                type="checkbox"
                                checked={formData.emailNotifications}
                                onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="email-notifications" className="ml-2 text-sm text-gray-700">
                                Email notifications for all activities
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                id="order-notifications"
                                type="checkbox"
                                checked={formData.orderNotifications}
                                onChange={(e) => handleInputChange('orderNotifications', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="order-notifications" className="ml-2 text-sm text-gray-700">
                                New order notifications
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                id="return-notifications"
                                type="checkbox"
                                checked={formData.returnNotifications}
                                onChange={(e) => handleInputChange('returnNotifications', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="return-notifications" className="ml-2 text-sm text-gray-700">
                                Return and refund notifications
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                id="payout-notifications"
                                type="checkbox"
                                checked={formData.payoutNotifications}
                                onChange={(e) => handleInputChange('payoutNotifications', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="payout-notifications" className="ml-2 text-sm text-gray-700">
                                Payout notifications
                            </label>
                        </div>
                    </div>
                </div>

                {/* Message */}
                {message && (
                    <div className={`p-4 rounded-md ${message.includes('successfully') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                        <div className="flex">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            {message}
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    )
}

export default ProfileSettings