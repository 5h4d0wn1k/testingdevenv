'use client'

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { updateSettings } from '@/lib/features/settings/settingsSlice'
import { useAuth } from '@clerk/nextjs'
import toast from 'react-hot-toast'

const PaymentForm = ({ settings }) => {
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const [formData, setFormData] = useState({
        paymentMethods: settings?.paymentMethods || {
            cod: { enabled: true, label: 'Cash on Delivery' },
            stripe: { enabled: false, label: 'Credit/Debit Card' }
        }
    })

    const handlePaymentMethodChange = (method, field, value) => {
        setFormData(prev => ({
            ...prev,
            paymentMethods: {
                ...prev.paymentMethods,
                [method]: {
                    ...prev.paymentMethods[method],
                    [field]: value
                }
            }
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await dispatch(updateSettings({ updates: formData, getToken })).unwrap()
            toast.success('Payment settings updated successfully')
        } catch (error) {
            toast.error('Failed to update payment settings: ' + error)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-slate-800 mb-4">Payment Methods</h3>

                <div className="space-y-4">
                    {/* Cash on Delivery */}
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded">
                        <div>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.paymentMethods.cod?.enabled}
                                    onChange={(e) => handlePaymentMethodChange('cod', 'enabled', e.target.checked)}
                                    className="mr-3"
                                />
                                <span className="font-medium">Cash on Delivery (COD)</span>
                            </label>
                            <p className="text-sm text-slate-600 mt-1">Customers pay when they receive their order</p>
                        </div>
                        <input
                            type="text"
                            value={formData.paymentMethods.cod?.label || ''}
                            onChange={(e) => handlePaymentMethodChange('cod', 'label', e.target.value)}
                            className="px-3 py-1 border border-slate-300 rounded text-sm"
                            placeholder="Display label"
                        />
                    </div>

                    {/* Stripe */}
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded">
                        <div>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.paymentMethods.stripe?.enabled}
                                    onChange={(e) => handlePaymentMethodChange('stripe', 'enabled', e.target.checked)}
                                    className="mr-3"
                                />
                                <span className="font-medium">Stripe (Credit/Debit Cards)</span>
                            </label>
                            <p className="text-sm text-slate-600 mt-1">Accept online payments via Stripe</p>
                            {!formData.paymentMethods.stripe?.enabled && (
                                <p className="text-xs text-amber-600 mt-1">
                                    Note: Configure Stripe API keys in the API Keys tab
                                </p>
                            )}
                        </div>
                        <input
                            type="text"
                            value={formData.paymentMethods.stripe?.label || ''}
                            onChange={(e) => handlePaymentMethodChange('stripe', 'label', e.target.value)}
                            className="px-3 py-1 border border-slate-300 rounded text-sm"
                            placeholder="Display label"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 p-4 rounded">
                <h4 className="font-medium text-blue-800 mb-2">Additional Payment Methods</h4>
                <p className="text-sm text-blue-700">
                    More payment methods (PayPal, Apple Pay, etc.) can be added in future updates.
                    Contact support if you need additional payment integrations.
                </p>
            </div>

            <button
                type="submit"
                className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
                Save Payment Settings
            </button>
        </form>
    )
}

export default PaymentForm