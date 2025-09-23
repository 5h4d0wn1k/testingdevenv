'use client'
import { useEffect, useState } from "react"
import Loading from "@/components/Loading"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import toast from "react-hot-toast"
import {
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  CreditCard,
  FileText,
  Receipt,
  AlertCircle
} from "lucide-react"

export default function StoreFinancials() {
    const [financialData, setFinancialData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('dashboard')
    const [filters, setFilters] = useState({
        dateRange: '30d',
        product: 'all',
        category: 'all'
    })

    const { getToken } = useAuth()

    const fetchFinancialData = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get(`/api/store/financials?${new URLSearchParams(filters)}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setFinancialData(data)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const applyFilters = () => {
        setLoading(true)
        fetchFinancialData()
    }

    const downloadStatement = async (type, period) => {
        try {
            const token = await getToken()
            const response = await axios.get(`/api/store/statements?type=${type}&period=${period}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            })

            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `${type}_statement_${period}.csv`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            toast.success('Statement downloaded successfully')
        } catch (error) {
            toast.error('Failed to download statement')
        }
    }

    useEffect(() => {
        fetchFinancialData()
    }, [])

    if (loading) return <Loading />

    const tabs = [
        { id: 'dashboard', label: 'Sales Dashboard', icon: BarChart3 },
        { id: 'commissions', label: 'Commissions & Fees', icon: PieChart },
        { id: 'payouts', label: 'Payout Schedule', icon: CreditCard },
        { id: 'taxes', label: 'Tax Reporting', icon: FileText },
        { id: 'statements', label: 'Statements', icon: Receipt }
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl text-slate-500">Store <span className="text-slate-800 font-medium">Financials</span></h1>
                <div className="flex items-center gap-4">
                    <select
                        value={filters.dateRange}
                        onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="1y">Last year</option>
                    </select>
                    <button
                        onClick={applyFilters}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="flex border-b border-gray-200">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'border-b-2 border-blue-500 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {activeTab === 'dashboard' && (
                        <SalesDashboard data={financialData?.dashboard} />
                    )}
                    {activeTab === 'commissions' && (
                        <CommissionsFees data={financialData?.commissions} />
                    )}
                    {activeTab === 'payouts' && (
                        <PayoutSchedule data={financialData?.payouts} />
                    )}
                    {activeTab === 'taxes' && (
                        <TaxReporting data={financialData?.taxes} />
                    )}
                    {activeTab === 'statements' && (
                        <Statements onDownload={downloadStatement} />
                    )}
                </div>
            </div>
        </div>
    )
}

// Sales Dashboard Component
function SalesDashboard({ data }) {
    if (!data) return <div className="text-center py-8 text-gray-500">No data available</div>

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Sales"
                    value={`$${data.totalSales?.toFixed(2) || '0.00'}`}
                    icon={DollarSign}
                    trend={data.salesTrend}
                />
                <MetricCard
                    title="Average Order Value"
                    value={`$${data.averageOrderValue?.toFixed(2) || '0.00'}`}
                    icon={TrendingUp}
                    trend={data.aovTrend}
                />
                <MetricCard
                    title="Units Sold"
                    value={data.unitsSold || 0}
                    icon={Package}
                    trend={data.unitsTrend}
                />
                <MetricCard
                    title="Orders"
                    value={data.orderCount || 0}
                    icon={Receipt}
                    trend={data.ordersTrend}
                />
            </div>

            {/* Charts Placeholder - Would integrate with Chart.js or similar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Daily Sales</h3>
                    <div className="h-64 flex items-center justify-center text-gray-500">
                        <BarChart3 size={48} />
                        <span className="ml-2">Chart will be implemented</span>
                    </div>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Sales by Category</h3>
                    <div className="h-64 flex items-center justify-center text-gray-500">
                        <PieChart size={48} />
                        <span className="ml-2">Chart will be implemented</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Commissions & Fees Component
function CommissionsFees({ data }) {
    if (!data) return <div className="text-center py-8 text-gray-500">No commission data available</div>

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">Gross Revenue</h3>
                    <div className="text-3xl font-bold text-green-600">${data.grossRevenue?.toFixed(2) || '0.00'}</div>
                    <p className="text-sm text-gray-500 mt-2">Total sales before fees</p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">Platform Commission</h3>
                    <div className="text-3xl font-bold text-red-600">-${data.totalCommission?.toFixed(2) || '0.00'}</div>
                    <p className="text-sm text-gray-500 mt-2">{data.commissionRate || 0}% platform fee</p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">Net Revenue</h3>
                    <div className="text-3xl font-bold text-blue-600">${data.netRevenue?.toFixed(2) || '0.00'}</div>
                    <p className="text-sm text-gray-500 mt-2">After all deductions</p>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Commission Breakdown</h3>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {data.breakdown?.map((item, index) => (
                            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                <div>
                                    <div className="font-medium">{item.type}</div>
                                    <div className="text-sm text-gray-500">{item.description}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium">${item.amount?.toFixed(2)}</div>
                                    <div className="text-sm text-gray-500">{item.rate}%</div>
                                </div>
                            </div>
                        )) || <div className="text-center py-8 text-gray-500">No breakdown data available</div>}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Payout Schedule Component
function PayoutSchedule({ data }) {
    if (!data) return <div className="text-center py-8 text-gray-500">No payout data available</div>

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Next Payout</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-2xl font-bold text-green-600">${data.nextPayout?.amount?.toFixed(2) || '0.00'}</div>
                        <div className="text-sm text-gray-500">Scheduled for {data.nextPayout?.date || 'TBD'}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Pending Amount</div>
                        <div className="text-lg font-semibold">${data.pendingAmount?.toFixed(2) || '0.00'}</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Payout History</h3>
                </div>
                <div className="divide-y divide-gray-200">
                    {data.history?.map((payout, index) => (
                        <div key={index} className="p-6 flex justify-between items-center">
                            <div>
                                <div className="font-medium">{new Date(payout.date).toLocaleDateString()}</div>
                                <div className="text-sm text-gray-500">ID: {payout.id?.slice(-8)}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-medium">${payout.amount?.toFixed(2)}</div>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                    payout.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                    payout.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                    {payout.status}
                                </span>
                            </div>
                        </div>
                    )) || <div className="p-6 text-center text-gray-500">No payout history available</div>}
                </div>
            </div>
        </div>
    )
}

// Tax Reporting Component
function TaxReporting({ data }) {
    if (!data) return <div className="text-center py-8 text-gray-500">No tax data available</div>

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.regions?.map((region, index) => (
                    <div key={index} className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-semibold mb-2">{region.name}</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Tax Rate:</span>
                                <span className="font-medium">{region.rate}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Taxable Amount:</span>
                                <span className="font-medium">${region.taxableAmount?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Tax Amount:</span>
                                <span className="font-medium">${region.taxAmount?.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )) || <div className="col-span-full text-center py-8 text-gray-500">No regional tax data available</div>}
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Tax Summary</h3>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <div className="text-sm text-gray-600">Total Taxable Sales</div>
                            <div className="text-2xl font-bold">${data.totalTaxable?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Total Tax Owed</div>
                            <div className="text-2xl font-bold text-red-600">${data.totalTax?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Tax Filing Status</div>
                            <div className="text-lg font-medium text-green-600">{data.filingStatus || 'Up to date'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Statements Component
function Statements({ onDownload }) {
    const periods = [
        { label: 'Last 30 days', value: '30d' },
        { label: 'Last 90 days', value: '90d' },
        { label: 'Last year', value: '1y' },
        { label: 'Current month', value: 'month' },
        { label: 'Last month', value: 'last_month' }
    ]

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Download Statements</h3>
                    <p className="text-sm text-gray-600 mt-1">Download CSV files containing your transaction data, fees, and refunds</p>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium mb-4 flex items-center gap-2">
                                <Receipt size={18} />
                                Sales Statements
                            </h4>
                            <div className="space-y-2">
                                {periods.map((period) => (
                                    <button
                                        key={`sales-${period.value}`}
                                        onClick={() => onDownload('sales', period.value)}
                                        className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <span>{period.label}</span>
                                        <Download size={16} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-medium mb-4 flex items-center gap-2">
                                <FileText size={18} />
                                Commission Statements
                            </h4>
                            <div className="space-y-2">
                                {periods.map((period) => (
                                    <button
                                        key={`commission-${period.value}`}
                                        onClick={() => onDownload('commissions', period.value)}
                                        className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <span>{period.label}</span>
                                        <Download size={16} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Metric Card Component
function MetricCard({ title, value, icon: Icon, trend }) {
    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    {trend && (
                        <p className={`text-sm mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trend > 0 ? '+' : ''}{trend}% from last period
                        </p>
                    )}
                </div>
                <Icon size={24} className="text-gray-400" />
            </div>
        </div>
    )
}