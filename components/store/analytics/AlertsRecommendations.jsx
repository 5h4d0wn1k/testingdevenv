'use client'
import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import toast from 'react-hot-toast'
import { AlertTriangle, TrendingUp, Package, Zap, Settings, Lightbulb } from 'lucide-react'

export default function AlertsRecommendations({ data }) {
    const { getToken } = useAuth()
    const [alerts, setAlerts] = useState(data?.alerts || [])
    const [recommendations, setRecommendations] = useState(data?.recommendations || [])

    const alertTypes = [
        {
            id: 'inventory_low',
            name: 'Low Inventory Alert',
            description: 'Alert when inventory falls below threshold',
            icon: Package,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50'
        },
        {
            id: 'high_return_rate',
            name: 'High Return Rate',
            description: 'Alert when return rate exceeds threshold',
            icon: TrendingUp,
            color: 'text-red-600',
            bgColor: 'bg-red-50'
        },
        {
            id: 'low_conversion',
            name: 'Low Conversion Rate',
            description: 'Alert when conversion rate drops below threshold',
            icon: AlertTriangle,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
        }
    ]

    const updateAlertThreshold = async (alertId, threshold) => {
        try {
            const token = await getToken()
            await axios.put(`/api/store/alerts/${alertId}`, {
                threshold
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success('Alert threshold updated')
        } catch (error) {
            console.error('Error updating alert:', error)
            toast.error('Failed to update alert threshold')
        }
    }

    const generateAIRecommendations = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/store/ai/recommendations', {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setRecommendations(data.recommendations)
            toast.success('AI recommendations generated')
        } catch (error) {
            console.error('Error generating recommendations:', error)
            toast.error('Failed to generate AI recommendations')
        }
    }

    return (
        <div className="space-y-6">
            {/* Active Alerts */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Active Alerts</h3>
                <div className="space-y-4">
                    {alerts.map((alert) => (
                        <div key={alert.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 rounded-lg">
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{alert.type.replace('_', ' ').toUpperCase()}</p>
                                    <p className="text-sm text-gray-600">
                                        Current: {alert.currentValue.toFixed(1)}{alert.type.includes('rate') ? '%' : ''}
                                        | Threshold: {alert.threshold.toFixed(1)}{alert.type.includes('rate') ? '%' : ''}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Last triggered: {new Date(alert.lastTriggered).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-red-600">ALERT ACTIVE</p>
                            </div>
                        </div>
                    ))}
                    {alerts.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No active alerts</p>
                    )}
                </div>
            </div>

            {/* Alert Configuration */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Configuration</h3>
                <div className="space-y-4">
                    {alertTypes.map((alertType) => (
                        <div key={alertType.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 ${alertType.bgColor} rounded-lg`}>
                                    <alertType.icon className={`h-5 w-5 ${alertType.color}`} />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{alertType.name}</p>
                                    <p className="text-sm text-gray-600">{alertType.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder="Threshold"
                                    className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm"
                                    onBlur={(e) => {
                                        const threshold = parseFloat(e.target.value)
                                        if (!isNaN(threshold)) {
                                            updateAlertThreshold(alertType.id, threshold)
                                        }
                                    }}
                                />
                                <span className="text-sm text-gray-500">
                                    {alertType.id.includes('rate') ? '%' : 'units'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI-Powered Recommendations */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">AI-Powered Recommendations</h3>
                    <button
                        onClick={generateAIRecommendations}
                        className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center gap-2"
                    >
                        <Zap size={18} />
                        Generate Recommendations
                    </button>
                </div>

                <div className="space-y-4">
                    {recommendations.map((rec, index) => (
                        <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start">
                                <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                                <div>
                                    <h4 className="text-sm font-medium text-blue-800">{rec.title}</h4>
                                    <p className="text-sm text-blue-700 mt-1">{rec.description}</p>
                                    <div className="mt-2 flex gap-2">
                                        {rec.type === 'price_optimization' && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                Price Optimization
                                            </span>
                                        )}
                                        {rec.type === 'keywords' && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                                                SEO Keywords
                                            </span>
                                        )}
                                        {rec.type === 'inventory' && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                                                Inventory Management
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {recommendations.length === 0 && (
                        <div className="text-center py-8">
                            <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">Click &apos;Generate Recommendations&apos; to get AI-powered insights</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                        <Settings className="h-6 w-6 text-gray-600 mb-2" />
                        <p className="font-medium text-gray-900">Configure Alerts</p>
                        <p className="text-sm text-gray-600">Set up custom alert thresholds</p>
                    </button>

                    <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                        <TrendingUp className="h-6 w-6 text-gray-600 mb-2" />
                        <p className="font-medium text-gray-900">View Trends</p>
                        <p className="text-sm text-gray-600">Analyze performance trends</p>
                    </button>

                    <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                        <Package className="h-6 w-6 text-gray-600 mb-2" />
                        <p className="font-medium text-gray-900">Inventory Report</p>
                        <p className="text-sm text-gray-600">Check inventory levels</p>
                    </button>
                </div>
            </div>
        </div>
    )
}