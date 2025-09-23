'use client'
import Loading from "@/components/Loading"
import OrdersAreaChart from "@/components/OrdersAreaChart"
import VendorPerformanceChart from "@/components/admin/VendorPerformanceChart"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import { CircleDollarSignIcon, ShoppingBasketIcon, StoreIcon, TagsIcon } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"

export default function AdminDashboard() {

    const { getToken } = useAuth()

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'

    const [loading, setLoading] = useState(true)
    const [dashboardData, setDashboardData] = useState({
        totalVendors: 0,
        activeProducts: 0,
        pendingOrders: 0,
        monthlyGMV: 0,
        allOrders: [],
        vendorPerformance: []
    })

    const dashboardCardsData = [
        { title: 'Total Vendors', value: dashboardData.totalVendors, icon: StoreIcon },
        { title: 'Active Products', value: dashboardData.activeProducts, icon: ShoppingBasketIcon },
        { title: 'Pending Orders', value: dashboardData.pendingOrders, icon: TagsIcon },
        { title: 'Monthly GMV', value: currency + dashboardData.monthlyGMV, icon: CircleDollarSignIcon },
    ]

    const fetchDashboardData = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/admin/dashboard', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setDashboardData(data.dashboardData)
        } catch (error) {
           toast.error(error?.response?.data?.error || error.message) 
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchDashboardData()
    }, [])

    if (loading) return <Loading />

    return (
        <div className="text-slate-500">
            <h1 className="text-2xl">Admin <span className="text-slate-800 font-medium">Dashboard</span></h1>

            {/* Cards */}
            <div className="flex flex-wrap gap-5 my-10 mt-4">
                {
                    dashboardCardsData.map((card, index) => (
                        <div key={index} className="flex items-center gap-10 border border-slate-200 p-3 px-6 rounded-lg">
                            <div className="flex flex-col gap-3 text-xs">
                                <p>{card.title}</p>
                                <b className="text-2xl font-medium text-slate-700">{card.value}</b>
                            </div>
                            <card.icon size={50} className=" w-11 h-11 p-2.5 text-slate-400 bg-slate-100 rounded-full" />
                        </div>
                    ))
                }
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-10">
                <OrdersAreaChart allOrders={dashboardData.allOrders} />
                <VendorPerformanceChart vendorPerformance={dashboardData.vendorPerformance} />
            </div>

            {/* Quick Actions */}
            <div className="my-10">
                <h2 className="text-xl font-medium text-slate-800 mb-4">Quick Actions</h2>
                <div className="flex flex-wrap gap-4">
                    <Link href="/admin/approve" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                        Approve new vendor
                    </Link>
                    <Link href="/admin/products" className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                        View flagged products
                    </Link>
                    <Link href="/admin/orders" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                        Issue refund
                    </Link>
                </div>
            </div>
        </div>
    )
}