'use client'
import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Download, Calendar, Filter, FileText } from 'lucide-react'

export default function ReportBuilder() {
    const { getToken } = useAuth()
    const [selectedMetrics, setSelectedMetrics] = useState([])
    const [timeframe, setTimeframe] = useState('monthly')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [generating, setGenerating] = useState(false)
    const [reports, setReports] = useState([])

    const availableMetrics = [
        { id: 'revenue', name: 'Revenue', description: 'Total sales revenue' },
        { id: 'orders', name: 'Orders', description: 'Number of orders' },
        { id: 'conversion', name: 'Conversion Rate', description: 'Visitor to customer conversion' },
        { id: 'returns', name: 'Return Rate', description: 'Percentage of returned orders' },
        { id: 'fulfillment', name: 'Fulfillment Time', description: 'Average order fulfillment time' },
        { id: 'rating', name: 'Customer Rating', description: 'Average customer ratings' },
        { id: 'abandonment', name: 'Cart Abandonment', description: 'Cart abandonment rate' },
        { id: 'inventory', name: 'Inventory Levels', description: 'Current inventory status' }
    ]

    const handleMetricToggle = (metricId) => {
        setSelectedMetrics(prev =>
            prev.includes(metricId)
                ? prev.filter(id => id !== metricId)
                : [...prev, metricId]
        )
    }

    const generateReport = async () => {
        if (selectedMetrics.length === 0) {
            toast.error('Please select at least one metric')
            return
        }

        setGenerating(true)
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/store/reports', {
                metrics: selectedMetrics,
                timeframe,
                startDate: startDate || null,
                endDate: endDate || null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })

            toast.success('Report generated successfully')
            // Refresh reports list
            fetchReports()
        } catch (error) {
            console.error('Error generating report:', error)
            toast.error('Failed to generate report')
        } finally {
            setGenerating(false)
        }
    }

    const fetchReports = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/store/reports', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setReports(data)
        } catch (error) {
            console.error('Error fetching reports:', error)
        }
    }

    const downloadReport = (reportId) => {
        window.open(`/api/store/reports/${reportId}/download`, '_blank')
    }

    return (
        <div className="space-y-6">
            {/* Report Builder */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Report Builder</h3>

                {/* Metrics Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Metrics
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {availableMetrics.map((metric) => (
                            <div
                                key={metric.id}
                                onClick={() => handleMetricToggle(metric.id)}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                    selectedMetrics.includes(metric.id)
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedMetrics.includes(metric.id)}
                                        onChange={() => {}}
                                        className="mr-2"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{metric.name}</p>
                                        <p className="text-xs text-gray-500">{metric.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Timeframe Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Timeframe
                    </label>
                    <div className="flex gap-4">
                        <select
                            value={timeframe}
                            onChange={(e) => setTimeframe(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                            <option value="custom">Custom Range</option>
                        </select>

                        {timeframe === 'custom' && (
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Generate Button */}
                <button
                    onClick={generateReport}
                    disabled={generating || selectedMetrics.length === 0}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <FileText size={18} />
                    {generating ? 'Generating...' : 'Generate Report'}
                </button>
            </div>

            {/* Recent Reports */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Reports</h3>
                <div className="space-y-3">
                    {reports.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No reports generated yet</p>
                    ) : (
                        reports.map((report) => (
                            <div key={report.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900">{report.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {new Date(report.createdAt).toLocaleDateString()} •
                                        {report.metrics.length} metrics •
                                        {report.timeframe}
                                    </p>
                                </div>
                                <button
                                    onClick={() => downloadReport(report.id)}
                                    className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 flex items-center gap-1"
                                >
                                    <Download size={14} />
                                    Download
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}