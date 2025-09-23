'use client'
import { TrendingUp, TrendingDown, Award, Target, Star } from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export default function Benchmarking({ data }) {
    if (!data) return null

    const benchmarks = data.categoryBenchmarks || []
    const performanceMetrics = data.performanceMetrics || []

    const radarData = [
        {
            metric: 'Conversion Rate',
            store: data.conversionRate || 0,
            category: data.categoryConversionAvg || 0,
            fullMark: 100
        },
        {
            metric: 'Return Rate',
            store: data.returnRate || 0,
            category: data.categoryReturnAvg || 0,
            fullMark: 100
        },
        {
            metric: 'Customer Rating',
            store: (data.customerRating || 0) * 20, // Scale to 0-100
            category: (data.categoryRatingAvg || 0) * 20,
            fullMark: 100
        },
        {
            metric: 'Fulfillment Time',
            store: Math.max(0, 100 - (data.fulfillmentTime || 0) * 10), // Lower time is better
            category: Math.max(0, 100 - (data.categoryFulfillmentAvg || 0) * 10),
            fullMark: 100
        }
    ]

    return (
        <div className="space-y-6">
            {/* Performance Overview */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance vs Category Average</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {radarData.map((item, index) => {
                        const isBetter = item.metric === 'Fulfillment Time'
                            ? item.store > item.category
                            : item.store > item.category

                        return (
                            <div key={index} className="text-center">
                                <div className="flex items-center justify-center mb-2">
                                    {isBetter ? (
                                        <TrendingUp className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <TrendingDown className="h-5 w-5 text-red-500" />
                                    )}
                                </div>
                                <p className="text-sm font-medium text-gray-600">{item.metric}</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {item.metric === 'Fulfillment Time'
                                        ? `${(data.fulfillmentTime || 0).toFixed(1)}h`
                                        : item.metric === 'Customer Rating'
                                            ? (data.customerRating || 0).toFixed(1)
                                            : `${item.store.toFixed(1)}${item.metric.includes('Rate') ? '%' : ''}`
                                    }
                                </p>
                                <p className="text-xs text-gray-500">
                                    Category avg: {item.category.toFixed(1)}{item.metric.includes('Rate') ? '%' : ''}
                                </p>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Radar Chart */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Radar</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar
                            name="Your Store"
                            dataKey="store"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.3}
                        />
                        <Radar
                            name="Category Average"
                            dataKey="category"
                            stroke="#ef4444"
                            fill="#ef4444"
                            fillOpacity={0.3}
                        />
                        <Tooltip />
                    </RadarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Your Store</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Category Average</span>
                    </div>
                </div>
            </div>

            {/* Category Comparison */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Category Comparison</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={benchmarks}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="yourStore" fill="#3b82f6" name="Your Store" />
                        <Bar dataKey="categoryAvg" fill="#e5e7eb" name="Category Avg" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Insights */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Benchmarking Insights</h3>
                <div className="space-y-4">
                    {data.conversionRate > data.categoryConversionAvg && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-start">
                                <Award className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                                <div>
                                    <h4 className="text-sm font-medium text-green-800">Above Average Conversion</h4>
                                    <p className="text-sm text-green-700 mt-1">
                                        Your conversion rate is {(data.conversionRate - data.categoryConversionAvg).toFixed(1)}% above the category average. Keep up the great work!
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {data.returnRate > data.categoryReturnAvg && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start">
                                <Target className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                                <div>
                                    <h4 className="text-sm font-medium text-yellow-800">Return Rate Opportunity</h4>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        Your return rate is {(data.returnRate - data.categoryReturnAvg).toFixed(1)}% above the category average. Consider reviewing product quality and customer expectations.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {data.customerRating > data.categoryRatingAvg && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start">
                                <Star className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                                <div>
                                    <h4 className="text-sm font-medium text-blue-800">Strong Customer Satisfaction</h4>
                                    <p className="text-sm text-blue-700 mt-1">
                                        Your customer rating is {(data.customerRating - data.categoryRatingAvg).toFixed(1)} points above the category average. This is a competitive advantage!
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}