'use client'

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { updateSettings } from '@/lib/features/settings/settingsSlice'
import { useAuth } from '@clerk/nextjs'
import toast from 'react-hot-toast'

const ApiKeysForm = ({ settings }) => {
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const [formData, setFormData] = useState({
        stripePublishableKey: settings?.stripePublishableKey || '',
        stripeSecretKey: settings?.stripeSecretKey || '',
        imageKitPublicKey: settings?.imageKitPublicKey || '',
        imageKitPrivateKey: settings?.imageKitPrivateKey || '',
        imageKitUrlEndpoint: settings?.imageKitUrlEndpoint || '',
    })
    const [showSecrets, setShowSecrets] = useState({
        stripeSecret: false,
        imageKitPrivate: false,
    })

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const toggleSecretVisibility = (field) => {
        setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await dispatch(updateSettings({ updates: formData, getToken })).unwrap()
            toast.success('API keys updated successfully')
        } catch (error) {
            toast.error('Failed to update API keys: ' + error)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
                <div className="flex">
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-amber-800">
                            Security Warning
                        </h3>
                        <div className="mt-2 text-sm text-amber-700">
                            <p>API keys are sensitive information. Store them securely and never share them publicly.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-medium text-slate-800 mb-4">Stripe Configuration</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Stripe Publishable Key
                        </label>
                        <input
                            type="text"
                            value={formData.stripePublishableKey}
                            onChange={(e) => handleInputChange('stripePublishableKey', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="pk_test_..."
                        />
                        <p className="text-xs text-slate-500 mt-1">Safe to expose in frontend code</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Stripe Secret Key
                        </label>
                        <div className="relative">
                            <input
                                type={showSecrets.stripeSecret ? "text" : "password"}
                                value={formData.stripeSecretKey}
                                onChange={(e) => handleInputChange('stripeSecretKey', e.target.value)}
                                className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="sk_test_..."
                            />
                            <button
                                type="button"
                                onClick={() => toggleSecretVisibility('stripeSecret')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                                {showSecrets.stripeSecret ? (
                                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Keep this secret - never expose in frontend code</p>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-medium text-slate-800 mb-4">ImageKit Configuration</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            ImageKit Public Key
                        </label>
                        <input
                            type="text"
                            value={formData.imageKitPublicKey}
                            onChange={(e) => handleInputChange('imageKitPublicKey', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Your ImageKit public key"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            ImageKit Private Key
                        </label>
                        <div className="relative">
                            <input
                                type={showSecrets.imageKitPrivate ? "text" : "password"}
                                value={formData.imageKitPrivateKey}
                                onChange={(e) => handleInputChange('imageKitPrivateKey', e.target.value)}
                                className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Your ImageKit private key"
                            />
                            <button
                                type="button"
                                onClick={() => toggleSecretVisibility('imageKitPrivate')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                                {showSecrets.imageKitPrivate ? (
                                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            ImageKit URL Endpoint
                        </label>
                        <input
                            type="text"
                            value={formData.imageKitUrlEndpoint}
                            onChange={(e) => handleInputChange('imageKitUrlEndpoint', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://ik.imagekit.io/your_imagekit_id"
                        />
                    </div>
                </div>
            </div>

            <button
                type="submit"
                className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
                Save API Keys
            </button>
        </form>
    )
}

export default ApiKeysForm