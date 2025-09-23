'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import { Settings, User, Store, Webhook } from 'lucide-react'
import ProfileSettings from './components/ProfileSettings'
import StoreConfiguration from './components/StoreConfiguration'
import ApiWebhooks from './components/ApiWebhooks'

const SettingsPage = () => {
    const { getToken } = useAuth()
    const [activeTab, setActiveTab] = useState('profile')
    const [settings, setSettings] = useState(null)
    const [loading, setLoading] = useState(true)

    const tabs = [
        { id: 'profile', name: 'Profile Settings', icon: User },
        { id: 'store', name: 'Store Configuration', icon: Store },
        { id: 'api', name: 'API & Webhooks', icon: Webhook }
    ]

    const fetchSettings = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/store/settings', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setSettings(data.settings)
        } catch (error) {
            console.error('Error fetching settings:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSettings()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Settings className="h-8 w-8" />
                    Settings & Configuration
                </h1>
                <p className="text-gray-600 mt-2">Manage your store settings, profile preferences, and integrations</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-8">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.name}
                            </button>
                        )
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {activeTab === 'profile' && (
                    <ProfileSettings settings={settings} onUpdate={fetchSettings} />
                )}
                {activeTab === 'store' && (
                    <StoreConfiguration settings={settings} onUpdate={fetchSettings} />
                )}
                {activeTab === 'api' && (
                    <ApiWebhooks onUpdate={fetchSettings} />
                )}
            </div>
        </div>
    )
}

export default SettingsPage