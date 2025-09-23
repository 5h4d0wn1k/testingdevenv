'use client'

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { updateSettings } from '@/lib/features/settings/settingsSlice'
import { useAuth } from '@clerk/nextjs'
import toast from 'react-hot-toast'

const ShippingForm = ({ settings }) => {
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const [formData, setFormData] = useState({
        shippingZones: settings?.shippingZones || {
            enabled: false,
            zones: []
        }
    })

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            shippingZones: { ...prev.shippingZones, [field]: value }
        }))
    }

    const addShippingZone = () => {
        setFormData(prev => ({
            ...prev,
            shippingZones: {
                ...prev.shippingZones,
                zones: [...(prev.shippingZones.zones || []), {
                    name: '',
                    countries: [],
                    methods: [{ name: '', cost: 0, estimatedDays: '' }]
                }]
            }
        }))
    }

    const updateShippingZone = (zoneIndex, field, value) => {
        setFormData(prev => ({
            ...prev,
            shippingZones: {
                ...prev.shippingZones,
                zones: prev.shippingZones.zones.map((zone, i) =>
                    i === zoneIndex ? { ...zone, [field]: value } : zone
                )
            }
        }))
    }

    const addShippingMethod = (zoneIndex) => {
        setFormData(prev => ({
            ...prev,
            shippingZones: {
                ...prev.shippingZones,
                zones: prev.shippingZones.zones.map((zone, i) =>
                    i === zoneIndex
                        ? { ...zone, methods: [...zone.methods, { name: '', cost: 0, estimatedDays: '' }] }
                        : zone
                )
            }
        }))
    }

    const updateShippingMethod = (zoneIndex, methodIndex, field, value) => {
        setFormData(prev => ({
            ...prev,
            shippingZones: {
                ...prev.shippingZones,
                zones: prev.shippingZones.zones.map((zone, i) =>
                    i === zoneIndex
                        ? {
                            ...zone,
                            methods: zone.methods.map((method, j) =>
                                j === methodIndex ? { ...method, [field]: value } : method
                            )
                        }
                        : zone
                )
            }
        }))
    }

    const removeShippingZone = (zoneIndex) => {
        setFormData(prev => ({
            ...prev,
            shippingZones: {
                ...prev.shippingZones,
                zones: prev.shippingZones.zones.filter((_, i) => i !== zoneIndex)
            }
        }))
    }

    const removeShippingMethod = (zoneIndex, methodIndex) => {
        setFormData(prev => ({
            ...prev,
            shippingZones: {
                ...prev.shippingZones,
                zones: prev.shippingZones.zones.map((zone, i) =>
                    i === zoneIndex
                        ? { ...zone, methods: zone.methods.filter((_, j) => j !== methodIndex) }
                        : zone
                )
            }
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await dispatch(updateSettings({ updates: formData, getToken })).unwrap()
            toast.success('Shipping settings updated successfully')
        } catch (error) {
            toast.error('Failed to update shipping settings: ' + error)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="flex items-center">
                    <input
                        type="checkbox"
                        checked={formData.shippingZones.enabled}
                        onChange={(e) => handleInputChange('enabled', e.target.checked)}
                        className="mr-2"
                    />
                    Enable Shipping Zones
                </label>
            </div>

            {formData.shippingZones.enabled && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm font-medium text-slate-700">
                            Shipping Zones
                        </label>
                        <button
                            type="button"
                            onClick={addShippingZone}
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                        >
                            Add Zone
                        </button>
                    </div>

                    <div className="space-y-4">
                        {formData.shippingZones.zones?.map((zone, zoneIndex) => (
                            <div key={zoneIndex} className="border border-slate-200 rounded p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <input
                                        type="text"
                                        placeholder="Zone name (e.g., Domestic, International)"
                                        value={zone.name}
                                        onChange={(e) => updateShippingZone(zoneIndex, 'name', e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded mr-2"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeShippingZone(zoneIndex)}
                                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                                    >
                                        Remove Zone
                                    </button>
                                </div>

                                <div className="mb-3">
                                    <label className="block text-sm text-slate-600 mb-1">Countries (comma-separated)</label>
                                    <input
                                        type="text"
                                        placeholder="US, CA, MX"
                                        value={zone.countries?.join(', ')}
                                        onChange={(e) => updateShippingZone(zoneIndex, 'countries', e.target.value.split(',').map(c => c.trim()))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-medium text-slate-700">Shipping Methods</label>
                                        <button
                                            type="button"
                                            onClick={() => addShippingMethod(zoneIndex)}
                                            className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                                        >
                                            Add Method
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {zone.methods?.map((method, methodIndex) => (
                                            <div key={methodIndex} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Method name"
                                                    value={method.name}
                                                    onChange={(e) => updateShippingMethod(zoneIndex, methodIndex, 'name', e.target.value)}
                                                    className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                                                />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Cost"
                                                    value={method.cost}
                                                    onChange={(e) => updateShippingMethod(zoneIndex, methodIndex, 'cost', parseFloat(e.target.value) || 0)}
                                                    className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Est. days"
                                                    value={method.estimatedDays}
                                                    onChange={(e) => updateShippingMethod(zoneIndex, methodIndex, 'estimatedDays', e.target.value)}
                                                    className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeShippingMethod(zoneIndex, methodIndex)}
                                                    className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <button
                type="submit"
                className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
                Save Shipping Settings
            </button>
        </form>
    )
}

export default ShippingForm