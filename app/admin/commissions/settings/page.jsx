'use client'

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchSettings, updateSettings } from '@/lib/features/settings/settingsSlice'
import { useAuth } from '@clerk/nextjs'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'

export default function CommissionSettingsPage() {
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const { data: settings, loading, error } = useSelector(state => state.settings)

    const [globalRate, setGlobalRate] = useState('')
    const [categoryTiers, setCategoryTiers] = useState([])
    const [newTier, setNewTier] = useState({ category: '', rate: '' })
    const [editingIndex, setEditingIndex] = useState(null)
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
            setGlobalRate(settings.globalCommissionRate || '')
            setCategoryTiers(settings.categoryCommissionRates || [])
        }
    }, [settings])

    const validateRate = (rate) => {
        if (!rate || rate.trim() === '') {
            return { valid: false, message: 'Rate is required' }
        }
        const num = parseFloat(rate)
        if (isNaN(num)) {
            return { valid: false, message: 'Rate must be a valid number' }
        }
        if (num < 0) {
            return { valid: false, message: 'Rate cannot be negative' }
        }
        if (num > 100) {
            return { valid: false, message: 'Rate cannot exceed 100%' }
        }
        return { valid: true }
    }

    const validateCategory = (category, existingCategories = []) => {
        if (!category || category.trim() === '') {
            return { valid: false, message: 'Category name is required' }
        }
        const trimmed = category.trim()
        if (trimmed.length < 2) {
            return { valid: false, message: 'Category name must be at least 2 characters' }
        }
        if (existingCategories.includes(trimmed.toLowerCase())) {
            return { valid: false, message: 'This category already has a commission rate' }
        }
        return { valid: true }
    }

    const handleGlobalRateSubmit = async (e) => {
        e.preventDefault()
        const rateValidation = validateRate(globalRate)
        if (!rateValidation.valid) {
            toast.error(`Global commission rate: ${rateValidation.message}`)
            return
        }

        setSaving(true)
        try {
            await dispatch(updateSettings({
                updates: { globalCommissionRate: parseFloat(globalRate) },
                getToken
            })).unwrap()
            toast.success('Global commission rate updated successfully')
        } catch (error) {
            toast.error('Failed to update global rate: ' + error)
        }
        setSaving(false)
    }

    const handleAddTier = async () => {
        const categoryValidation = validateCategory(newTier.category, categoryTiers.map(t => t.category.toLowerCase()))
        if (!categoryValidation.valid) {
            toast.error(`Category: ${categoryValidation.message}`)
            return
        }
        const rateValidation = validateRate(newTier.rate)
        if (!rateValidation.valid) {
            toast.error(`Rate: ${rateValidation.message}`)
            return
        }

        const updatedTiers = [...categoryTiers, {
            category: newTier.category.trim(),
            rate: parseFloat(newTier.rate)
        }]

        console.log('DEBUG: Adding category tier, payload:', { categoryCommissionRates: updatedTiers })
        setSaving(true)
        try {
            await dispatch(updateSettings({
                updates: { categoryCommissionRates: updatedTiers },
                getToken
            })).unwrap()
            setCategoryTiers(updatedTiers)
            setNewTier({ category: '', rate: '' })
            toast.success('Category tier added successfully')
        } catch (error) {
            console.error('DEBUG: Failed to add category tier:', error)
            toast.error('Failed to add category tier: ' + error)
        }
        setSaving(false)
    }

    const handleEditTier = (index) => {
        setEditingIndex(index)
        setNewTier({
            category: categoryTiers[index].category,
            rate: categoryTiers[index].rate.toString()
        })
    }

    const handleUpdateTier = async () => {
        const existingCategories = categoryTiers
            .filter((_, i) => i !== editingIndex)
            .map(t => t.category.toLowerCase())
        const categoryValidation = validateCategory(newTier.category, existingCategories)
        if (!categoryValidation.valid) {
            toast.error(`Category: ${categoryValidation.message}`)
            return
        }
        const rateValidation = validateRate(newTier.rate)
        if (!rateValidation.valid) {
            toast.error(`Rate: ${rateValidation.message}`)
            return
        }

        const updatedTiers = [...categoryTiers]
        updatedTiers[editingIndex] = {
            category: newTier.category.trim(),
            rate: parseFloat(newTier.rate)
        }

        setSaving(true)
        try {
            await dispatch(updateSettings({
                updates: { categoryCommissionRates: updatedTiers },
                getToken
            })).unwrap()
            setCategoryTiers(updatedTiers)
            setNewTier({ category: '', rate: '' })
            setEditingIndex(null)
            toast.success('Category tier updated successfully')
        } catch (error) {
            toast.error('Failed to update category tier: ' + error)
        }
        setSaving(false)
    }

    const handleDeleteTier = async (index) => {
        const updatedTiers = categoryTiers.filter((_, i) => i !== index)

        setSaving(true)
        try {
            await dispatch(updateSettings({
                updates: { categoryCommissionRates: updatedTiers },
                getToken
            })).unwrap()
            setCategoryTiers(updatedTiers)
            toast.success('Category tier deleted successfully')
        } catch (error) {
            toast.error('Failed to delete category tier: ' + error)
        }
        setSaving(false)
    }

    const handleCancelEdit = () => {
        setEditingIndex(null)
        setNewTier({ category: '', rate: '' })
    }

    if (loading) return <Loading />

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Commission Settings</h1>

            <div className="space-y-8">
                {/* Global Commission Rate */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Global Commission Rate</h2>
                    <form onSubmit={handleGlobalRateSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Rate (%)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={globalRate}
                                onChange={(e) => setGlobalRate(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter global commission rate"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Global Rate'}
                        </button>
                    </form>
                </div>

                {/* Category Commission Tiers */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Category Commission Tiers</h2>

                    {/* Add/Edit Form */}
                    <div className="mb-6 p-4 bg-slate-50 rounded-md">
                        <h3 className="text-md font-medium text-slate-700 mb-3">
                            {editingIndex !== null ? 'Edit Category Tier' : 'Add New Category Tier'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Category Name
                                </label>
                                <input
                                    type="text"
                                    value={newTier.category}
                                    onChange={(e) => setNewTier(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Electronics"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Rate (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={newTier.rate}
                                    onChange={(e) => setNewTier(prev => ({ ...prev, rate: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.0"
                                    required
                                />
                            </div>
                            <div className="flex items-end gap-2">
                                <button
                                    onClick={editingIndex !== null ? handleUpdateTier : handleAddTier}
                                    disabled={saving}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : editingIndex !== null ? 'Update' : 'Add'}
                                </button>
                                {editingIndex !== null && (
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-4 py-2 bg-slate-500 text-white rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Existing Tiers */}
                    <div className="space-y-3">
                        <h3 className="text-md font-medium text-slate-700">Existing Category Tiers</h3>
                        {categoryTiers.length === 0 ? (
                            <p className="text-slate-500 text-sm">No category tiers configured yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {categoryTiers.map((tier, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                                        <div>
                                            <span className="font-medium text-slate-800">{tier.category}</span>
                                            <span className="ml-4 text-slate-600">{tier.rate}%</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditTier(index)}
                                                className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTier(index)}
                                                disabled={saving}
                                                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}