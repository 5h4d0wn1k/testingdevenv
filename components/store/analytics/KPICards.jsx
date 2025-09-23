'use client'
import { TrendingUp, TrendingDown, Package, Clock, Star, RefreshCw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function KPICards({ data }) {
    if (!data) return null

    const kpis = [
        {
            title: 'Conversion Rate',
            value: `${(data.conversionRate || 0).toFixed(1)}%`,
            change: data.conversionChange || 0,
            icon: TrendingUp,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
        },
        {
            title: 'Return Rate',
            value: `${(data.returnRate || 0).toFixed(1)}%`,
            change: data.returnChange || 0,
            icon: RefreshCw,
            color: 'text-red-600',
            bgColor: 'bg-red-50'
        },
        {
            title: 'Fulfillment Time',
            value: `${(data.fulfillmentTime || 0).toFixed(1)}h`,
            change: data.fulfillmentChange || 0,
            icon: Clock,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
        },
        {
            title: 'Customer Rating',
            value: (data.customerRating || 0).toFixed(1),
            change: data.ratingChange || 0,
            icon: Star,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
        }
    ]

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, index) => (
                    <div key={index} className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                                <div className="flex items-center mt-2">
                                    {kpi.change > 0 ? (
                                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                                    ) : (
                                        <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                                    )}
                                    <span className={`text-sm font-medium ${
                                        kpi.change > 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {Math.abs(kpi.change).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className={`${kpi.bgColor} p-3 rounded-full`}>
                                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.revenueTrend || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Order Volume */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Order Volume</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.orderVolume || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="orders" fill="#10b981" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}