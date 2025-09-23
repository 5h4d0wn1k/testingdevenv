'use client'

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { updateSettings } from '@/lib/features/settings/settingsSlice'
import { useAuth } from '@clerk/nextjs'
import toast from 'react-hot-toast'

const TaxForm = ({ settings }) => {
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const [formData, setFormData] = useState({
        taxRates: settings?.taxRates || {
            enabled: false,
            defaultRate: 0,
            rates: []
        }
    })

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            taxRates: { ...prev.taxRates, [field]: value }
        }))
    }

    const addTaxRate = () => {
        setFormData(prev => ({
            ...prev,
            taxRates: {
                ...prev.taxRates,
                rates: [...(prev.taxRates.rates || []), { name: '', rate: 0, countries: [] }]
            }
        }))
    }

    const updateTaxRate = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            taxRates: {
                ...prev.taxRates,
                rates: prev.taxRates.rates.map((rate, i) =>
                    i === index ? { ...rate, [field]: value } : rate
                )
            }
        }))
    }

    const removeTaxRate = (index) => {
        setFormData(prev => ({
            ...prev,
            taxRates: {
                ...prev.taxRates,
                rates: prev.taxRates.rates.filter((_, i) => i !== index)
            }
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await dispatch(updateSettings({ updates: formData, getToken })).unwrap()
            toast.success('Tax settings updated successfully')
        } catch (error) {
            toast.error('Failed to update tax settings: ' + error)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="flex items-center">
                    <input
                        type="checkbox"
                        checked={formData.taxRates.enabled}
                        onChange={(e) => handleInputChange('enabled', e.target.checked)}
                        className="mr-2"
                    />
                    Enable Tax Calculation
                </label>
            </div>

            {formData.taxRates.enabled && (
                <>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Default Tax Rate (%)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.taxRates.defaultRate}
                            onChange={(e) => handleInputChange('defaultRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="block text-sm font-medium text-slate-700">
                                Tax Rates by Region
                            </label>
                            <button
                                type="button"
                                onClick={addTaxRate}
                                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                            >
                                Add Rate
                            </button>
                        </div>

                        <div className="space-y-3">
                            {formData.taxRates.rates?.map((rate, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 border border-slate-200 rounded">
                                    <input
                                        type="text"
                                        placeholder="Region name"
                                        value={rate.name}
                                        onChange={(e) => updateTaxRate(index, 'name', e.target.value)}
                                        className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Rate %"
                                        value={rate.rate}
                                        onChange={(e) => updateTaxRate(index, 'rate', parseFloat(e.target.value) || 0)}
                                        className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeTaxRate(index)}
                                        className="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <button
                type="submit"
                className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
                Save Tax Settings
            </button>
        </form>
    )
}

export default TaxForm