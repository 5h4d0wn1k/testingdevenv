'use client'
import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import { Clock, MapPin, Truck, Save, AlertCircle, Plus, X, Store } from 'lucide-react'

const StoreConfiguration = ({ settings, onUpdate }) => {
    const { getToken } = useAuth()
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [formData, setFormData] = useState({
        operatingHours: settings?.operatingHours || {},
        shippingOriginAddress: settings?.shippingOriginAddress || {},
        defaultShippingMethods: settings?.defaultShippingMethods || []
    })

    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            const token = await getToken()
            const { data } = await axios.put('/api/store/settings', {
                operatingHours: formData.operatingHours,
                shippingOriginAddress: formData.shippingOriginAddress,
                defaultShippingMethods: formData.defaultShippingMethods
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })

            setMessage('Store configuration updated successfully!')
            onUpdate()
        } catch (error) {
            console.error('Error updating settings:', error)
            setMessage(error.response?.data?.error || 'Failed to update store configuration')
        } finally {
            setLoading(false)
        }
    }

    const updateOperatingHours = (day, field, value) => {
        setFormData(prev => ({
            ...prev,
            operatingHours: {
                ...prev.operatingHours,
                [day]: {
                    ...prev.operatingHours[day],
                    [field]: value
                }
            }
        }))
    }

    const updateShippingAddress = (field, value) => {
        setFormData(prev => ({
            ...prev,
            shippingOriginAddress: {
                ...prev.shippingOriginAddress,
                [field]: value
            }
        }))
    }

    const addShippingMethod = () => {
        setFormData(prev => ({
            ...prev,
            defaultShippingMethods: [
                ...prev.defaultShippingMethods,
                { name: '', carrier: '', service: '', cost: 0, estimatedDays: 1 }
            ]
        }))
    }

    const updateShippingMethod = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            defaultShippingMethods: prev.defaultShippingMethods.map((method, i) =>
                i === index ? { ...method, [field]: value } : method
            )
        }))
    }

    const removeShippingMethod = (index) => {
        setFormData(prev => ({
            ...prev,
            defaultShippingMethods: prev.defaultShippingMethods.filter((_, i) => i !== index)
        }))
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
                <Store className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Store Configuration</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Operating Hours */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Operating Hours
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {daysOfWeek.map(day => (
                            <div key={day} className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 capitalize">
                                    {day}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="time"
                                        value={formData.operatingHours[day]?.open || ''}
                                        onChange={(e) => updateOperatingHours(day, 'open', e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <span className="self-center text-gray-500">to</span>
                                    <input
                                        type="time"
                                        value={formData.operatingHours[day]?.close || ''}
                                        onChange={(e) => updateOperatingHours(day, 'close', e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Shipping Origin Address */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Shipping Origin Address
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Street Address
                            </label>
                            <input
                                type="text"
                                value={formData.shippingOriginAddress.street || ''}
                                onChange={(e) => updateShippingAddress('street', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="123 Main St"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                City
                            </label>
                            <input
                                type="text"
                                value={formData.shippingOriginAddress.city || ''}
                                onChange={(e) => updateShippingAddress('city', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="New York"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                State/Province
                            </label>
                            <input
                                type="text"
                                value={formData.shippingOriginAddress.state || ''}
                                onChange={(e) => updateShippingAddress('state', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="NY"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                ZIP/Postal Code
                            </label>
                            <input
                                type="text"
                                value={formData.shippingOriginAddress.zip || ''}
                                onChange={(e) => updateShippingAddress('zip', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="10001"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Country
                            </label>
                            <input
                                type="text"
                                value={formData.shippingOriginAddress.country || ''}
                                onChange={(e) => updateShippingAddress('country', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="United States"
                            />
                        </div>
                    </div>
                </div>

                {/* Default Shipping Methods */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                            <Truck className="h-5 w-5" />
                            Default Shipping Methods
                        </h3>
                        <button
                            type="button"
                            onClick={addShippingMethod}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Method
                        </button>
                    </div>

                    <div className="space-y-3">
                        {formData.defaultShippingMethods.map((method, index) => (
                            <div key={index} className="flex gap-3 items-end p-4 border border-gray-200 rounded-md">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Method Name
                                    </label>
                                    <input
                                        type="text"
                                        value={method.name}
                                        onChange={(e) => updateShippingMethod(index, 'name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Standard Shipping"
                                    />
                                </div>

                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Carrier
                                    </label>
                                    <input
                                        type="text"
                                        value={method.carrier}
                                        onChange={(e) => updateShippingMethod(index, 'carrier', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="USPS"
                                    />
                                </div>

                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Service
                                    </label>
                                    <input
                                        type="text"
                                        value={method.service}
                                        onChange={(e) => updateShippingMethod(index, 'service', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="First Class"
                                    />
                                </div>

                                <div className="w-24">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cost ($)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={method.cost}
                                        onChange={(e) => updateShippingMethod(index, 'cost', parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="w-32">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Days
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={method.estimatedDays}
                                        onChange={(e) => updateShippingMethod(index, 'estimatedDays', parseInt(e.target.value) || 1)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => removeShippingMethod(index)}
                                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
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
                        Save Configuration
                    </button>
                </div>
            </form>
        </div>
    )
}

export default StoreConfiguration