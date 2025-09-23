'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function VendorPerformanceChart({ vendorPerformance }) {

    const chartData = vendorPerformance.map(v => ({
        storeName: v.storeName,
        sales: parseFloat(v.sales.toFixed(2))
    }))

    return (
        <div className="w-full max-w-4xl h-[300px] text-xs">
            <h3 className="text-lg font-medium text-slate-800 mb-4 pt-2 text-right"> <span className='text-slate-500'>Vendor /</span> Performance</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="storeName" />
                    <YAxis label={{ value: 'Sales', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => [`$${value}`, 'Sales']} />
                    <Bar dataKey="sales" fill="#4f46e5" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}