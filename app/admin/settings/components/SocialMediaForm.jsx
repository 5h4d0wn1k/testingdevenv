'use client'

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { updateSettings } from '@/lib/features/settings/settingsSlice'
import { useAuth } from '@clerk/nextjs'
import toast from 'react-hot-toast'

const SocialMediaForm = ({ settings }) => {
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const [formData, setFormData] = useState({
        facebookUrl: settings?.facebookUrl || '',
        twitterUrl: settings?.twitterUrl || '',
        instagramUrl: settings?.instagramUrl || '',
        linkedinUrl: settings?.linkedinUrl || '',
        youtubeUrl: settings?.youtubeUrl || '',
        tiktokUrl: settings?.tiktokUrl || '',
    })

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await dispatch(updateSettings({ updates: formData, getToken })).unwrap()
            toast.success('Social media settings updated successfully')
        } catch (error) {
            toast.error('Failed to update settings: ' + error)
        }
    }

    const socialPlatforms = [
        { key: 'facebookUrl', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
        { key: 'twitterUrl', label: 'Twitter/X', placeholder: 'https://twitter.com/yourhandle' },
        { key: 'instagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
        { key: 'linkedinUrl', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yourcompany' },
        { key: 'youtubeUrl', label: 'YouTube', placeholder: 'https://youtube.com/channel/yourchannel' },
        { key: 'tiktokUrl', label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle' },
    ]

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {socialPlatforms.map((platform) => (
                    <div key={platform.key}>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            {platform.label} URL
                        </label>
                        <input
                            type="url"
                            value={formData[platform.key]}
                            onChange={(e) => handleInputChange(platform.key, e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={platform.placeholder}
                        />
                    </div>
                ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Social Media Integration</h4>
                <p className="text-sm text-blue-700">
                    These URLs will be used for social media links throughout the platform.
                    Leave fields empty if you don&apos;t have accounts on certain platforms.
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

export default SocialMediaForm