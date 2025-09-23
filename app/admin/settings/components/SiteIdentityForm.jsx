'use client'

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { updateSettings } from '@/lib/features/settings/settingsSlice'
import { useAuth } from '@clerk/nextjs'
import toast from 'react-hot-toast'
import ColorPicker from '@/components/settings/ColorPicker'

const SiteIdentityForm = ({ settings }) => {
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const [formData, setFormData] = useState({
        siteName: settings?.siteName || '',
        logoUrl: settings?.logoUrl || '',
        faviconUrl: settings?.faviconUrl || '',
        primaryColor: settings?.primaryColor || '#007bff',
    })
    const [uploading, setUploading] = useState(false)

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleFileUpload = async (file, field) => {
        if (!file) return

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('folder', '/platform')

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                throw new Error('Upload failed')
            }

            const result = await response.json()
            handleInputChange(field, result.url)
            toast.success(`${field} uploaded successfully`)
        } catch (error) {
            toast.error(`Failed to upload ${field}`)
        }
        setUploading(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await dispatch(updateSettings({ updates: formData, getToken })).unwrap()
            toast.success('Site identity updated successfully')
        } catch (error) {
            toast.error('Failed to update settings: ' + error)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Site Name
                </label>
                <input
                    type="text"
                    value={formData.siteName}
                    onChange={(e) => handleInputChange('siteName', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter site name"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Logo Upload
                </label>
                <div className="flex items-center gap-4">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e.target.files[0], 'logoUrl')}
                        className="hidden"
                        id="logo-upload"
                        disabled={uploading}
                    />
                    <label
                        htmlFor="logo-upload"
                        className="px-4 py-2 bg-blue-500 text-white rounded-md cursor-pointer hover:bg-blue-600 disabled:opacity-50"
                    >
                        {uploading ? 'Uploading...' : 'Choose Logo'}
                    </label>
                    {formData.logoUrl && (
                        <img src={formData.logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Favicon Upload
                </label>
                <div className="flex items-center gap-4">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e.target.files[0], 'faviconUrl')}
                        className="hidden"
                        id="favicon-upload"
                        disabled={uploading}
                    />
                    <label
                        htmlFor="favicon-upload"
                        className="px-4 py-2 bg-blue-500 text-white rounded-md cursor-pointer hover:bg-blue-600 disabled:opacity-50"
                    >
                        {uploading ? 'Uploading...' : 'Choose Favicon'}
                    </label>
                    {formData.faviconUrl && (
                        <img src={formData.faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
                    )}
                </div>
            </div>

            <ColorPicker
                label="Primary Color"
                value={formData.primaryColor}
                onChange={(value) => handleInputChange('primaryColor', value)}
            />

            <button
                type="submit"
                className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
                Save Changes
            </button>
        </form>
    )
}

export default SiteIdentityForm