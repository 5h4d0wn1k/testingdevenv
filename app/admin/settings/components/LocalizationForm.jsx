'use client'

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { updateSettings } from '@/lib/features/settings/settingsSlice'
import { useAuth } from '@clerk/nextjs'
import toast from 'react-hot-toast'

const LocalizationForm = ({ settings }) => {
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const [formData, setFormData] = useState({
        defaultLanguage: settings?.defaultLanguage || 'en',
        supportedLanguages: settings?.supportedLanguages || [],
        baseCurrency: settings?.baseCurrency || 'USD',
    })

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await dispatch(updateSettings({ updates: formData, getToken })).unwrap()
            toast.success('Localization settings updated successfully')
        } catch (error) {
            toast.error('Failed to update settings: ' + error)
        }
    }

    const languages = [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' },
        { value: 'de', label: 'German' },
        { value: 'it', label: 'Italian' },
        { value: 'pt', label: 'Portuguese' },
    ]

    const dateFormats = [
        { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
        { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
        { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
    ]

    const timeFormats = [
        { value: '12', label: '12 Hour' },
        { value: '24', label: '24 Hour' },
    ]

    const currencies = [
        { value: 'USD', label: 'US Dollar ($)' },
        { value: 'EUR', label: 'Euro (€)' },
        { value: 'GBP', label: 'British Pound (£)' },
        { value: 'JPY', label: 'Japanese Yen (¥)' },
        { value: 'CAD', label: 'Canadian Dollar (C$)' },
        { value: 'AUD', label: 'Australian Dollar (A$)' },
        { value: 'INR', label: 'Indian Rupee (₹)' },
    ]

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Base Currency
                </label>
                <select
                    value={formData.baseCurrency}
                    onChange={(e) => handleInputChange('baseCurrency', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {currencies.map(curr => (
                        <option key={curr.value} value={curr.value}>{curr.label}</option>
                    ))}
                </select>
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

export default LocalizationForm