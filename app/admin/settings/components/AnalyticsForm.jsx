'use client'

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { updateSettings } from '@/lib/features/settings/settingsSlice'
import { useAuth } from '@clerk/nextjs'
import toast from 'react-hot-toast'

const AnalyticsForm = ({ settings }) => {
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const [formData, setFormData] = useState({
        analyticsEnabled: settings?.analyticsEnabled || false,
        googleAnalyticsId: settings?.googleAnalyticsId || '',
        facebookPixelId: settings?.facebookPixelId || '',
    })

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await dispatch(updateSettings({ updates: formData, getToken })).unwrap()
            toast.success('Analytics settings updated successfully')
        } catch (error) {
            toast.error('Failed to update settings: ' + error)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={formData.analyticsEnabled}
                        onChange={(e) => handleInputChange('analyticsEnabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Enable Analytics Tracking</span>
                </label>
                <p className="text-xs text-slate-500 mt-1">
                    Enable tracking scripts for analytics and marketing purposes.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Google Analytics ID
                </label>
                <input
                    type="text"
                    value={formData.googleAnalyticsId}
                    onChange={(e) => handleInputChange('googleAnalyticsId', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="GA-XXXXXXXXXX or G-XXXXXXXXXX"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Enter your Google Analytics Measurement ID (e.g., G-XXXXXXXXXX) or Universal Analytics ID (e.g., UA-XXXXXXXXX-X).
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Facebook Pixel ID
                </label>
                <input
                    type="text"
                    value={formData.facebookPixelId}
                    onChange={(e) => handleInputChange('facebookPixelId', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456789012345"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Enter your Facebook Pixel ID for conversion tracking and audience building.
                </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-amber-800 mb-2">Privacy Notice</h4>
                <p className="text-sm text-amber-700">
                    Analytics tracking collects anonymous usage data to help improve your platform.
                    Ensure you comply with privacy regulations like GDPR when enabling these features.
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

export default AnalyticsForm