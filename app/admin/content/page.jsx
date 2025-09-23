'use client'

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchSettings } from '@/lib/features/settings/settingsSlice'
import { useAuth } from '@clerk/nextjs'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'
import { Upload, X, Plus, Save } from 'lucide-react'

export default function ContentPage() {
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const { data: settings, loading, error } = useSelector(state => state.settings)
    const [formData, setFormData] = useState({
        homepageBanner: '',
        promotionalBanners: [],
        policyPages: {
            terms: '',
            privacy: '',
            refund: ''
        }
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const loadSettings = async () => {
            try {
                await dispatch(fetchSettings({ getToken })).unwrap()
            } catch (err) {
                toast.error('Failed to load settings: ' + err)
            }
        }
        loadSettings()
    }, [dispatch, getToken])

    useEffect(() => {
        if (settings) {
            setFormData({
                homepageBanner: settings.homepageBanner || '',
                promotionalBanners: settings.promotionalBanners || [],
                policyPages: settings.policyPages || {
                    terms: '',
                    privacy: '',
                    refund: ''
                }
            })
        }
    }, [settings])

    const handleImageUpload = async (file, folder = '/content') => {
        const formDataUpload = new FormData()
        formDataUpload.append('file', file)
        formDataUpload.append('folder', folder)

        try {
            const token = await getToken()
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formDataUpload
            })

            if (!response.ok) {
                throw new Error('Upload failed')
            }

            const result = await response.json()
            return result.url
        } catch (error) {
            toast.error('Image upload failed: ' + error.message)
            return null
        }
    }

    const handleHomepageBannerUpload = async (event) => {
        const file = event.target.files[0]
        if (!file) return

        const url = await handleImageUpload(file, '/banners')
        if (url) {
            setFormData(prev => ({ ...prev, homepageBanner: url }))
            toast.success('Homepage banner uploaded successfully')
        }
    }

    const addPromotionalBanner = () => {
        setFormData(prev => ({
            ...prev,
            promotionalBanners: [...prev.promotionalBanners, {
                id: Date.now(),
                title: '',
                description: '',
                imageUrl: '',
                link: '',
                active: true
            }]
        }))
    }

    const updatePromotionalBanner = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            promotionalBanners: prev.promotionalBanners.map((banner, i) =>
                i === index ? { ...banner, [field]: value } : banner
            )
        }))
    }

    const removePromotionalBanner = (index) => {
        setFormData(prev => ({
            ...prev,
            promotionalBanners: prev.promotionalBanners.filter((_, i) => i !== index)
        }))
    }

    const handlePromotionalBannerImageUpload = async (index, file) => {
        const url = await handleImageUpload(file, '/promotional')
        if (url) {
            updatePromotionalBanner(index, 'imageUrl', url)
            toast.success('Banner image uploaded successfully')
        }
    }

    const updatePolicyPage = (policy, content) => {
        setFormData(prev => ({
            ...prev,
            policyPages: { ...prev.policyPages, [policy]: content }
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const token = await getToken()
            const response = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    homepageBanner: formData.homepageBanner,
                    promotionalBanners: formData.promotionalBanners,
                    policyPages: formData.policyPages
                })
            })

            if (!response.ok) {
                throw new Error('Failed to save content')
            }

            toast.success('Content saved successfully')
            // Refresh settings
            await dispatch(fetchSettings({ getToken })).unwrap()
        } catch (error) {
            toast.error('Failed to save content: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <Loading />

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Content Management</h1>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Homepage Banner */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Homepage Banner</h2>
                <div className="space-y-4">
                    {formData.homepageBanner && (
                        <div className="relative">
                            <img
                                src={formData.homepageBanner}
                                alt="Homepage banner"
                                className="w-full h-48 object-cover rounded-lg"
                            />
                            <button
                                onClick={() => setFormData(prev => ({ ...prev, homepageBanner: '' }))}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Upload Homepage Banner
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleHomepageBannerUpload}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Recommended size: 1920x600px. Max file size: 5MB
                        </p>
                    </div>
                </div>
            </div>

            {/* Promotional Banners */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-slate-800">Promotional Banners</h2>
                    <button
                        onClick={addPromotionalBanner}
                        className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Banner
                    </button>
                </div>
                <div className="space-y-4">
                    {formData.promotionalBanners.map((banner, index) => (
                        <div key={banner.id} className="border border-slate-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-md font-medium text-slate-700">Banner {index + 1}</h3>
                                <button
                                    onClick={() => removePromotionalBanner(index)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        value={banner.title}
                                        onChange={(e) => updatePromotionalBanner(index, 'title', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Banner title"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Link (optional)
                                    </label>
                                    <input
                                        type="url"
                                        value={banner.link}
                                        onChange={(e) => updatePromotionalBanner(index, 'link', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={banner.description}
                                    onChange={(e) => updatePromotionalBanner(index, 'description', e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Banner description"
                                />
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Banner Image
                                </label>
                                {banner.imageUrl && (
                                    <div className="relative mb-2">
                                        <img
                                            src={banner.imageUrl}
                                            alt={banner.title}
                                            className="w-full h-32 object-cover rounded-lg"
                                        />
                                        <button
                                            onClick={() => updatePromotionalBanner(index, 'imageUrl', '')}
                                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => e.target.files[0] && handlePromotionalBannerImageUpload(index, e.target.files[0])}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                            <div className="mt-4">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={banner.active}
                                        onChange={(e) => updatePromotionalBanner(index, 'active', e.target.checked)}
                                        className="mr-2"
                                    />
                                    <span className="text-sm text-slate-700">Active</span>
                                </label>
                            </div>
                        </div>
                    ))}
                    {formData.promotionalBanners.length === 0 && (
                        <p className="text-slate-500 text-center py-8">
                            No promotional banners added yet. Click &apos;Add Banner&apos; to get started.
                        </p>
                    )}
                </div>
            </div>

            {/* Policy Pages */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Policy Pages</h2>
                <div className="space-y-6">
                    {/* Terms of Service */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Terms of Service
                        </label>
                        <textarea
                            value={formData.policyPages.terms}
                            onChange={(e) => updatePolicyPage('terms', e.target.value)}
                            rows={10}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                            placeholder="Enter your terms of service content here..."
                        />
                    </div>

                    {/* Privacy Policy */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Privacy Policy
                        </label>
                        <textarea
                            value={formData.policyPages.privacy}
                            onChange={(e) => updatePolicyPage('privacy', e.target.value)}
                            rows={10}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                            placeholder="Enter your privacy policy content here..."
                        />
                    </div>

                    {/* Refund Policy */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Refund Policy
                        </label>
                        <textarea
                            value={formData.policyPages.refund}
                            onChange={(e) => updatePolicyPage('refund', e.target.value)}
                            rows={10}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                            placeholder="Enter your refund policy content here..."
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}