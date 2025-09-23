'use client'
import { Search, ShoppingCart, Eye, TrendingUp } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export default function CustomerInsights({ data }) {
    if (!data) return null

    const searchTerms = data.searchTerms || []
    const cartAbandonment = data.cartAbandonment || {}
    const topProducts = data.topProducts || []

    const abandonmentData = [
        { name: 'Completed', value: cartAbandonment.completed || 0, color: '#10b981' },
        { name: 'Abandoned', value: cartAbandonment.abandoned || 0, color: '#ef4444' }
    ]

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Search className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Searches</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {searchTerms.reduce((sum, term) => sum + term.count, 0)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-50 rounded-lg">
                            <ShoppingCart className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Cart Abandonment Rate</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {cartAbandonment.rate ? `${cartAbandonment.rate.toFixed(1)}%` : '0%'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <Eye className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Product Views</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {topProducts.reduce((sum, product) => sum + product.views, 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Search Terms */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Search Terms</h3>
                <div className="space-y-3">
                    {searchTerms.slice(0, 10).map((term, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                                <span className="text-sm font-medium text-gray-900">{term.term}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{
                                            width: `${(term.count / searchTerms[0]?.count) * 100}%`
                                        }}
                                    ></div>
                                </div>
                                <span className="text-sm text-gray-500">{term.count}</span>
                            </div>
                        </div>
                    ))}
                    {searchTerms.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No search data available</p>
                    )}
                </div>
            </div>

            {/* Cart Abandonment Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Cart Completion vs Abandonment</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={abandonmentData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {abandonmentData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 mt-4">
                        {abandonmentData.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                ></div>
                                <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Top Viewed Products</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topProducts.slice(0, 5)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="views" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Insights & Recommendations */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Insights & Recommendations</h3>
                <div className="space-y-4">
                    {cartAbandonment.rate > 20 && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start">
                                <TrendingUp className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                                <div>
                                    <h4 className="text-sm font-medium text-yellow-800">High Cart Abandonment</h4>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        Your cart abandonment rate is {cartAbandonment.rate.toFixed(1)}%. Consider optimizing your checkout process or offering incentives to complete purchases.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {searchTerms.length > 0 && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start">
                                <Search className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                                <div>
                                    <h4 className="text-sm font-medium text-blue-800">Popular Search Terms</h4>
                                    <p className="text-sm text-blue-700 mt-1">
                                        Your customers are searching for '{searchTerms[0]?.term}'. Consider optimizing your product listings and descriptions for these terms.
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