'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import toast from 'react-hot-toast'
import { BarChart3, TrendingUp, Users, Package, AlertTriangle, Download } from 'lucide-react'
import KPICards from '@/components/store/analytics/KPICards'
import ReportBuilder from '@/components/store/analytics/ReportBuilder'
import CustomerInsights from '@/components/store/analytics/CustomerInsights'
import Benchmarking from '@/components/store/analytics/Benchmarking'
import AlertsRecommendations from '@/components/store/analytics/AlertsRecommendations'

export default function AnalyticsPage() {
    const { getToken } = useAuth()
    const [activeTab, setActiveTab] = useState('dashboard')
    const [analyticsData, setAnalyticsData] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchAnalyticsData = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/store/analytics', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setAnalyticsData(data)
        } catch (error) {
            console.error('Error fetching analytics:', error)
            toast.error('Failed to load analytics data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAnalyticsData()
    }, [])

    const tabs = [
        { id: 'dashboard', name: 'KPIs Dashboard', icon: BarChart3 },
        { id: 'reports', name: 'Custom Reports', icon: Download },
        { id: 'insights', name: 'Customer Insights', icon: Users },
        { id: 'benchmarking', name: 'Benchmarking', icon: TrendingUp },
        { id: 'alerts', name: 'Alerts & Recommendations', icon: AlertTriangle }
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Analytics & Performance</h1>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'dashboard' && (
                    <KPICards data={analyticsData} />
                )}

                {activeTab === 'reports' && (
                    <ReportBuilder />
                )}

                {activeTab === 'insights' && (
                    <CustomerInsights data={analyticsData?.customerBehavior} />
                )}

                {activeTab === 'benchmarking' && (
                    <Benchmarking data={analyticsData?.benchmarking} />
                )}

                {activeTab === 'alerts' && (
                    <AlertsRecommendations data={analyticsData?.alerts} />
                )}
            </div>
        </div>
    )
}