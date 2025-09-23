'use client'

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { updateSettings } from '@/lib/features/settings/settingsSlice'
import { useAuth } from '@clerk/nextjs'
import toast from 'react-hot-toast'

const SeoForm = ({ settings }) => {
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const [formData, setFormData] = useState({
        metaTitle: settings?.metaTitle || '',
        metaDescription: settings?.metaDescription || '',
        metaKeywords: settings?.metaKeywords || '',
        ogTitle: settings?.ogTitle || '',
        ogDescription: settings?.ogDescription || '',
        ogImageUrl: settings?.ogImageUrl || '',
    })

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await dispatch(updateSettings({ updates: formData, getToken })).unwrap()
            toast.success('SEO settings updated successfully')
        } catch (error) {
            toast.error('Failed to update settings: ' + error)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Meta Title
                </label>
                <input
                    type="text"
                    value={formData.metaTitle}
                    onChange={(e) => handleInputChange('metaTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Website Title"
                    maxLength={60}
                />
                <p className="text-xs text-slate-500 mt-1">
                    {formData.metaTitle.length}/60 characters recommended for optimal SEO.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Meta Description
                </label>
                <textarea
                    value={formData.metaDescription}
                    onChange={(e) => handleInputChange('metaDescription', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of your website"
                    maxLength={160}
                />
                <p className="text-xs text-slate-500 mt-1">
                    {formData.metaDescription.length}/160 characters recommended for search results.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Meta Keywords
                </label>
                <input
                    type="text"
                    value={formData.metaKeywords}
                    onChange={(e) => handleInputChange('metaKeywords', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="keyword1, keyword2, keyword3"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Comma-separated keywords (optional, as modern SEO focuses more on content quality).
                </p>
            </div>

            <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-medium text-slate-800 mb-4">Open Graph (Social Media)</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Open Graph Title
                        </label>
                        <input
                            type="text"
                            value={formData.ogTitle}
                            onChange={(e) => handleInputChange('ogTitle', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Title for social media sharing"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Open Graph Description
                        </label>
                        <textarea
                            value={formData.ogDescription}
                            onChange={(e) => handleInputChange('ogDescription', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Description for social media sharing"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Open Graph Image URL
                        </label>
                        <input
                            type="url"
                            value={formData.ogImageUrl}
                            onChange={(e) => handleInputChange('ogImageUrl', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://example.com/og-image.jpg"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Recommended size: 1200x630 pixels for optimal social media display.
                        </p>
                    </div>
                </div>
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

export default SeoForm