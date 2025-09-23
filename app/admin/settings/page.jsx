'use client'

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchSettings } from '@/lib/features/settings/settingsSlice'
import { useAuth } from '@clerk/nextjs'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'
import SiteIdentityForm from './components/SiteIdentityForm'
import LocalizationForm from './components/LocalizationForm'
import MaintenanceModeForm from './components/MaintenanceModeForm'
import EmailSettingsForm from './components/EmailSettingsForm'
import SocialMediaForm from './components/SocialMediaForm'
import AnalyticsForm from './components/AnalyticsForm'
import SeoForm from './components/SeoForm'
import NotificationsForm from './components/NotificationsForm'
import TaxForm from './components/TaxForm'
import ShippingForm from './components/ShippingForm'
import PaymentForm from './components/PaymentForm'
import ApiKeysForm from './components/ApiKeysForm'

export default function SettingsPage() {
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const { data: settings, loading, error } = useSelector(state => state.settings)
    const [activeTab, setActiveTab] = useState('identity')

    const tabs = [
        { id: 'identity', label: 'Site Identity', component: SiteIdentityForm },
        { id: 'localization', label: 'Localization', component: LocalizationForm },
        { id: 'maintenance', label: 'Maintenance Mode', component: MaintenanceModeForm },
        { id: 'email', label: 'Email Settings', component: EmailSettingsForm },
        { id: 'social', label: 'Social Media', component: SocialMediaForm },
        { id: 'analytics', label: 'Analytics', component: AnalyticsForm },
        { id: 'seo', label: 'SEO', component: SeoForm },
        { id: 'notifications', label: 'Notifications', component: NotificationsForm },
        { id: 'tax', label: 'Tax Settings', component: TaxForm },
        { id: 'shipping', label: 'Shipping Zones', component: ShippingForm },
        { id: 'payment', label: 'Payment Methods', component: PaymentForm },
        { id: 'api', label: 'API Keys', component: ApiKeysForm },
    ]

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

    if (loading) return <Loading />

    const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Platform Settings</h1>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-6">
                <nav className="flex space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Active Form */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                {ActiveComponent && <ActiveComponent settings={settings} />}
            </div>
        </div>
    )
}