'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import Loading from '@/components/Loading'

export default function ReportsPage() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customReportData, setCustomReportData] = useState(null)
  const [predefinedReports, setPredefinedReports] = useState({
    monthlyGMV: null,
    topCategories: null,
    customerAcquisition: null
  })

  // Form states
  const [customForm, setCustomForm] = useState({
    metrics: [],
    startDate: '',
    endDate: '',
    storeId: ''
  })

  // Fetch predefined reports on mount
  useEffect(() => {
    fetchPredefinedReports()
  }, [])

  const fetchPredefinedReports = async () => {
    setLoading(true)
    setError('')
    try {
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }

      // Monthly GMV - last 12 months
      const gmvResponse = await axios.post('/api/admin/reports', {
        metrics: ['sales'],
        dateRange: {
          startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }
      }, { headers })

      // Top-selling categories - last 30 days
      const categoriesResponse = await axios.post('/api/admin/reports', {
        metrics: ['sales'],
        dateRange: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }
      }, { headers })

      // Customer acquisition - new users by month (simplified)
      const acquisitionResponse = await axios.get('/api/admin/dashboard', { headers }) // Assuming dashboard has user stats

      setPredefinedReports({
        monthlyGMV: gmvResponse.data,
        topCategories: categoriesResponse.data,
        customerAcquisition: acquisitionResponse.data?.userStats || []
      })
    } catch (err) {
      setError('Failed to load predefined reports')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomReport = async (e) => {
    e.preventDefault()
    if (!customForm.metrics.length || !customForm.startDate || !customForm.endDate) {
      setError('Please select metrics and date range')
      return
    }

    setLoading(true)
    setError('')
    try {
      const token = await getToken()
      const response = await axios.post('/api/admin/reports', {
        metrics: customForm.metrics,
        dateRange: {
          startDate: customForm.startDate,
          endDate: customForm.endDate
        },
        storeId: customForm.storeId || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setCustomReportData(response.data)
    } catch (err) {
      setError('Failed to generate custom report')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleMetricChange = (metric) => {
    setCustomForm(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metric)
        ? prev.metrics.filter(m => m !== metric)
        : [...prev.metrics, metric]
    }))
  }

  const renderChart = (data, type = 'bar') => {
    if (!data || !data.length) return <p>No data available</p>

    const chartData = data.map(item => ({
      name: item.storeName || item.date || item.category,
      value: item.totalSales || item.returnCount || item.total || item.count
    }))

    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        )
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        )
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Reports & Analytics</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Custom Report Builder */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Custom Report Builder</h2>
        <form onSubmit={handleCustomReport} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Metrics</label>
            <div className="space-x-4">
              {['sales', 'returns', 'vendor_performance'].map(metric => (
                <label key={metric} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={customForm.metrics.includes(metric)}
                    onChange={() => handleMetricChange(metric)}
                    className="rounded border-slate-300"
                  />
                  <span className="ml-2 capitalize">{metric.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <input
                type="date"
                value={customForm.startDate}
                onChange={(e) => setCustomForm(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
              <input
                type="date"
                value={customForm.endDate}
                onChange={(e) => setCustomForm(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Store ID (optional)</label>
            <input
              type="text"
              value={customForm.storeId}
              onChange={(e) => setCustomForm(prev => ({ ...prev, storeId: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              placeholder="Leave empty for all stores"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-slate-700 text-white px-4 py-2 rounded-md hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </form>

        {customReportData && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Custom Report Results</h3>
            {renderChart(customReportData)}
          </div>
        )}
      </div>

      {/* Predefined Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly GMV */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Monthly GMV</h2>
          {loading ? <Loading /> : renderChart(predefinedReports.monthlyGMV, 'line')}
        </div>

        {/* Top-Selling Categories */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Top-Selling Categories</h2>
          {loading ? <Loading /> : renderChart(predefinedReports.topCategories, 'pie')}
        </div>

        {/* Customer Acquisition Source */}
        <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Customer Acquisition</h2>
          {loading ? <Loading /> : (
            <div className="text-center text-slate-500">
              Customer acquisition data will be displayed here
              {/* Placeholder for customer acquisition chart */}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}