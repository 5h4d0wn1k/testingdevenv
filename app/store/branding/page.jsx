'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import toast from 'react-hot-toast'
import Loading from '@/components/Loading'
import ColorPicker from '@/components/settings/ColorPicker'
import imagekit from '@/configs/imageKit'

export default function BrandingPage() {
    const { getToken } = useAuth()
    const [loading, setLoading] = useState(false)
    const [profile, setProfile] = useState(null)
    const [uploading, setUploading] = useState(false)

    const [formData, setFormData] = useState({
        logoUrl: '',
        bannerUrl: '',
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        aboutPage: '',
        customDomain: '',
        seoTitle: '',
        seoDescription: '',
        seoKeywords: []
    })

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/store/profile', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setProfile(data.profile)
            if (data.profile) {
                setFormData({
                    logoUrl: data.profile.logoUrl || '',
                    bannerUrl: data.profile.bannerUrl || '',
                    primaryColor: data.profile.primaryColor || '#007bff',
                    secondaryColor: data.profile.secondaryColor || '#6c757d',
                    aboutPage: data.profile.aboutPage || '',
                    customDomain: data.profile.customDomain || '',
                    seoTitle: data.profile.seoTitle || '',
                    seoDescription: data.profile.seoDescription || '',
                    seoKeywords: data.profile.seoKeywords || []
                })
            }
        } catch (error) {
            toast.error('Failed to load profile')
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleFileUpload = async (e, field) => {
        const file = e.target.files[0]
        if (!file) return

        setUploading(true)
        try {
            const response = await imagekit.upload({
                file: file,
                fileName: file.name,
                folder: '/branding'
            })
            setFormData(prev => ({ ...prev, [field]: response.url }))
            toast.success('Image uploaded successfully')
        } catch (error) {
            toast.error('Upload failed')
        }
        setUploading(false)
    }

    const handleKeywordsChange = (e) => {
        const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k)
        setFormData(prev => ({ ...prev, seoKeywords: keywords }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const token = await getToken()
            await axios.put('/api/store/profile', formData, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success('Branding updated successfully')
        } catch (error) {
            toast.error('Failed to update branding')
        }
        setLoading(false)
    }

    if (!profile) return <Loading />

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8">Store Branding</h1>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Logo and Banner */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-xl font-semibold mb-4">Store Images</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Store Logo</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'logoUrl')}
                                className="w-full p-2 border rounded"
                            />
                            {formData.logoUrl && (
                                <img src={formData.logoUrl} alt="Logo" className="mt-2 h-16 w-auto" />
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Store Banner</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'bannerUrl')}
                                className="w-full p-2 border rounded"
                            />
                            {formData.bannerUrl && (
                                <img src={formData.bannerUrl} alt="Banner" className="mt-2 h-16 w-full object-cover" />
                            )}
                        </div>
                    </div>
                    {uploading && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
                </div>

                {/* Colors */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-xl font-semibold mb-4">Color Theme</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ColorPicker
                            label="Primary Color"
                            value={formData.primaryColor}
                            onChange={(color) => setFormData(prev => ({ ...prev, primaryColor: color }))}
                        />
                        <ColorPicker
                            label="Secondary Color"
                            value={formData.secondaryColor}
                            onChange={(color) => setFormData(prev => ({ ...prev, secondaryColor: color }))}
                        />
                    </div>
                </div>

                {/* About Page */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-xl font-semibold mb-4">About Page</h2>
                    <textarea
                        name="aboutPage"
                        value={formData.aboutPage}
                        onChange={handleInputChange}
                        rows={6}
                        placeholder="Tell customers about your store..."
                        className="w-full p-3 border rounded"
                    />
                </div>

                {/* Custom Domain */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-xl font-semibold mb-4">Custom Domain</h2>
                    <p className="text-sm text-gray-600 mb-2">Available on premium plans</p>
                    <input
                        type="text"
                        name="customDomain"
                        value={formData.customDomain}
                        onChange={handleInputChange}
                        placeholder="yourstore.com"
                        className="w-full p-3 border rounded"
                        disabled={!profile.subscriptionPlan?.name === 'premium'}
                    />
                </div>

                {/* SEO */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-xl font-semibold mb-4">SEO Settings</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">SEO Title</label>
                            <input
                                type="text"
                                name="seoTitle"
                                value={formData.seoTitle}
                                onChange={handleInputChange}
                                placeholder="Your Store Name"
                                className="w-full p-3 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">SEO Description</label>
                            <textarea
                                name="seoDescription"
                                value={formData.seoDescription}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder="Brief description of your store..."
                                className="w-full p-3 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">SEO Keywords (comma-separated)</label>
                            <input
                                type="text"
                                value={formData.seoKeywords.join(', ')}
                                onChange={handleKeywordsChange}
                                placeholder="keyword1, keyword2, keyword3"
                                className="w-full p-3 border rounded"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Saving...' : 'Save Branding'}
                </button>
            </form>
        </div>
    )
}