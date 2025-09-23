'use client'
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"

export default function AdminProducts() {

    const { user } = useUser()
    const { getToken } = useAuth()
    const router = useRouter()

    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [vendorFilter, setVendorFilter] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    const fetchProducts = async (pageNum = 1) => {
        try {
            const token = await getToken()
            const params = {
                page: pageNum,
                limit: 10,
                search: search || undefined,
                vendor: vendorFilter || undefined,
                category: categoryFilter || undefined,
                status: statusFilter || undefined
            }
            const { data } = await axios.get('/api/admin/products', { headers: { Authorization: `Bearer ${token}` }, params })
            setProducts(data.products)
            setTotalPages(data.pagination.pages)
            setPage(pageNum)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const getStatusDisplay = (status) => {
        switch (status) {
            case 'ACTIVE': return 'Active'
            case 'FLAGGED': return 'Flagged'
            case 'OUT_OF_STOCK': return 'Out of Stock'
            default: return status
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-800'
            case 'FLAGGED': return 'bg-yellow-100 text-yellow-800'
            case 'OUT_OF_STOCK': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const handleRowClick = (productId) => {
        router.push(`/admin/products/${productId}`)
    }

    const handleSearch = () => {
        fetchProducts(1)
    }

    const handleFilterChange = () => {
        fetchProducts(1)
    }

    const handlePageChange = (newPage) => {
        fetchProducts(newPage)
    }

    useEffect(() => {
        if(user){
            fetchProducts()
        }
    }, [user])

    return !loading ? (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">Product <span className="text-slate-800 font-medium">Management</span></h1>

            <div className="mt-4 mb-4 flex flex-wrap gap-4">
                <input
                    type="text"
                    placeholder="Search by product title"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1"
                />
                <button onClick={handleSearch} className="bg-blue-500 text-white px-4 py-1 rounded">Search</button>

                <select value={vendorFilter} onChange={(e) => { setVendorFilter(e.target.value); handleFilterChange(); }} className="border border-slate-300 rounded px-2 py-1">
                    <option value="">All Vendors</option>
                    {/* TODO: Populate with actual vendors */}
                </select>

                <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); handleFilterChange(); }} className="border border-slate-300 rounded px-2 py-1">
                    <option value="">All Categories</option>
                    {/* TODO: Populate with actual categories */}
                </select>

                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); handleFilterChange(); }} className="border border-slate-300 rounded px-2 py-1">
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="FLAGGED">Flagged</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                </select>
            </div>

            {products.length ? (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-2 text-left">Product Title</th>
                                <th className="px-4 py-2 text-left">Vendor</th>
                                <th className="px-4 py-2 text-left">Category</th>
                                <th className="px-4 py-2 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product.id} className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer" onClick={() => handleRowClick(product.id)}>
                                    <td className="px-4 py-2">{product.name}</td>
                                    <td className="px-4 py-2">{product.store.name}</td>
                                    <td className="px-4 py-2">{product.category}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-1 rounded text-sm ${getStatusColor(product.status)}`}>
                                            {getStatusDisplay(product.status)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-between items-center p-4">
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span>Page {page} of {totalPages}</span>
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page === totalPages}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">No products Available</h1>
                </div>
            )}
        </div>
    ) : <Loading />
}