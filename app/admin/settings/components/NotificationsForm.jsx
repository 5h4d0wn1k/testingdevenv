'use client'

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { updateSettings } from '@/lib/features/settings/settingsSlice'
import { useAuth } from '@clerk/nextjs'
import toast from 'react-hot-toast'

const NotificationsForm = ({ settings }) => {
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const [formData, setFormData] = useState({
        emailNotificationsEnabled: settings?.emailNotificationsEnabled || true,
        newUserNotifications: settings?.newUserNotifications || true,
        orderNotifications: settings?.orderNotifications || true,
        commissionNotifications: settings?.commissionNotifications || true,
        payoutNotifications: settings?.payoutNotifications || true,
        systemNotifications: settings?.systemNotifications || true,
    })

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await dispatch(updateSettings({ updates: formData, getToken })).unwrap()
            toast.success('Notification settings updated successfully')
        } catch (error) {
            toast.error('Failed to update settings: ' + error)
        }
    }

    const notificationOptions = [
        {
            key: 'newUserNotifications',
            label: 'New User Registrations',
            description: 'Receive notifications when new users register on the platform'
        },
        {
            key: 'orderNotifications',
            label: 'New Orders',
            description: 'Receive notifications for new orders placed by customers'
        },
        {
            key: 'commissionNotifications',
            label: 'Commission Updates',
            description: 'Receive notifications about commission calculations and payouts'
        },
        {
            key: 'payoutNotifications',
            label: 'Payout Requests',
            description: 'Receive notifications when sellers request payouts'
        },
        {
            key: 'systemNotifications',
            label: 'System Alerts',
            description: 'Receive important system maintenance and security notifications'
        },
    ]

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={formData.emailNotificationsEnabled}
                        onChange={(e) => handleInputChange('emailNotificationsEnabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Enable Email Notifications</span>
                </label>
                <p className="text-xs text-slate-500 mt-1">
                    Master switch for all email notifications. When disabled, no emails will be sent.
                </p>
            </div>

            <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-medium text-slate-800 mb-4">Notification Types</h3>

                <div className="space-y-4">
                    {notificationOptions.map((option) => (
                        <div key={option.key} className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={formData[option.key]}
                                onChange={(e) => handleInputChange(option.key, e.target.checked)}
                                disabled={!formData.emailNotificationsEnabled}
                                className="mt-1 w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-50"
                            />
                            <div className="flex-1">
                                <label className={`text-sm font-medium ${!formData.emailNotificationsEnabled ? 'text-slate-400' : 'text-slate-700'}`}>
                                    {option.label}
                                </label>
                                <p className={`text-xs ${!formData.emailNotificationsEnabled ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
                                    {option.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Email Configuration</h4>
                <p className="text-sm text-blue-700">
                    Notifications will be sent using the SMTP settings configured in the Email Settings tab.
                    Make sure your SMTP configuration is correct for notifications to work properly.
                </p>
            </div>

            <button
                type="submit"
                className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
                Save Changes
            </button>
        </form>
    )
}

export default NotificationsForm