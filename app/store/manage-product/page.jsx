'use client'
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import { productDummyData } from "@/assets/assets"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"

export default function StoreManageProducts() {

    const { getToken } = useAuth()
    const { user } = useUser()

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'

    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState([])
    const [filteredProducts, setFilteredProducts] = useState([])
    const [filters, setFilters] = useState({
        category: '',
        status: '',
        stockStatus: '',
        search: ''
    })
    const [selectedProducts, setSelectedProducts] = useState([])
    const [showBulkActions, setShowBulkActions] = useState(false)

    const fetchProducts = async () => {
        try {
             const token = await getToken()
             const { data } = await axios.get('/api/store/product', {headers: { Authorization: `Bearer ${token}` } })
             setProducts(data.products.sort((a, b)=> new Date(b.createdAt) - new Date(a.createdAt)))
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const toggleStock = async (productId) => {
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/store/stock-toggle',{ productId }, {headers: { Authorization: `Bearer ${token}` } })
            setProducts(prevProducts => prevProducts.map(product =>  product.id === productId ? {...product, inStock: !product.inStock} : product))

            toast.success(data.message)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const updateProductStatus = async (productId, status) => {
        try {
            const token = await getToken()
            const { data } = await axios.patch(`/api/store/product/${productId}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } })
            setProducts(prevProducts => prevProducts.map(product =>
                product.id === productId ? {...product, status} : product
            ))
            toast.success(data.message)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const updateStock = async (productId, newStock) => {
        try {
            const token = await getToken()
            const { data } = await axios.patch(`/api/store/product/${productId}/stock`, { stock: newStock }, { headers: { Authorization: `Bearer ${token}` } })
            setProducts(prevProducts => prevProducts.map(product =>
                product.id === productId ? {...product, stock: newStock, inStock: newStock > 0} : product
            ))
            toast.success(data.message)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const applyFilters = () => {
        let filtered = [...products]

        if (filters.category) {
            filtered = filtered.filter(product => product.category === filters.category)
        }

        if (filters.status) {
            filtered = filtered.filter(product => product.status === filters.status)
        }

        if (filters.stockStatus) {
            if (filters.stockStatus === 'in_stock') {
                filtered = filtered.filter(product => product.inStock)
            } else if (filters.stockStatus === 'out_of_stock') {
                filtered = filtered.filter(product => !product.inStock)
            } else if (filters.stockStatus === 'low_stock') {
                filtered = filtered.filter(product => product.stock <= 5 && product.stock > 0)
            }
        }

        if (filters.search) {
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                product.description.toLowerCase().includes(filters.search.toLowerCase())
            )
        }

        setFilteredProducts(filtered)
    }

    const handleSelectProduct = (productId) => {
        setSelectedProducts(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        )
    }

    const handleSelectAll = () => {
        if (selectedProducts.length === filteredProducts.length) {
            setSelectedProducts([])
        } else {
            setSelectedProducts(filteredProducts.map(p => p.id))
        }
    }

    const bulkUpdateStatus = async (status) => {
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/store/product/bulk-status', {
                productIds: selectedProducts,
                status
            }, { headers: { Authorization: `Bearer ${token}` } })

            setProducts(prevProducts => prevProducts.map(product =>
                selectedProducts.includes(product.id) ? {...product, status} : product
            ))
            setSelectedProducts([])
            toast.success(data.message)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const bulkUpdateStock = async (stockChange) => {
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/store/product/bulk-stock', {
                productIds: selectedProducts,
                stockChange
            }, { headers: { Authorization: `Bearer ${token}` } })

            setProducts(prevProducts => prevProducts.map(product =>
                selectedProducts.includes(product.id)
                    ? {...product, stock: Math.max(0, product.stock + stockChange), inStock: product.stock + stockChange > 0}
                    : product
            ))
            setSelectedProducts([])
            toast.success(data.message)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    useEffect(() => {
        if(user){
            fetchProducts()
        }
    }, [user])

    useEffect(() => {
        applyFilters()
    }, [products, filters])

    if (loading) return <Loading />

    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-800'
            case 'FLAGGED': return 'bg-yellow-100 text-yellow-800'
            case 'OUT_OF_STOCK': return 'bg-red-100 text-red-800'
            case 'DRAFT': return 'bg-gray-100 text-gray-800'
            case 'ARCHIVED': return 'bg-purple-100 text-purple-800'
            case 'DELETED': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getStockStatus = (stock, inStock) => {
        if (!inStock) return { text: 'Out of Stock', color: 'text-red-600' }
        if (stock <= 5) return { text: 'Low Stock', color: 'text-yellow-600' }
        return { text: 'In Stock', color: 'text-green-600' }
    }

    return (
        <>
            <div className="flex justify-between items-center mb-5">
                <h1 className="text-2xl text-slate-500">Manage <span className="text-slate-800 font-medium">Products</span></h1>
                <div className="text-sm text-slate-600">
                    {filteredProducts.length} of {products.length} products
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={filters.search}
                        onChange={(e) => setFilters({...filters, search: e.target.value})}
                        className="p-2 border border-slate-200 rounded"
                    />
                    <select
                        value={filters.category}
                        onChange={(e) => setFilters({...filters, category: e.target.value})}
                        className="p-2 border border-slate-200 rounded"
                    >
                        <option value="">All Categories</option>
                        {[...new Set(products.map(p => p.category))].map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                        className="p-2 border border-slate-200 rounded"
                    >
                        <option value="">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="FLAGGED">Flagged</option>
                        <option value="OUT_OF_STOCK">Out of Stock</option>
                        <option value="DRAFT">Draft</option>
                        <option value="ARCHIVED">Archived</option>
                    </select>
                    <select
                        value={filters.stockStatus}
                        onChange={(e) => setFilters({...filters, stockStatus: e.target.value})}
                        className="p-2 border border-slate-200 rounded"
                    >
                        <option value="">All Stock Status</option>
                        <option value="in_stock">In Stock</option>
                        <option value="low_stock">Low Stock (≤5)</option>
                        <option value="out_of_stock">Out of Stock</option>
                    </select>
                    <button
                        onClick={() => setFilters({category: '', status: '', stockStatus: '', search: ''})}
                        className="px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-600"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedProducts.length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-blue-800 font-medium">
                            {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
                        </span>
                        <div className="flex gap-2">
                            <select
                                onChange={(e) => e.target.value && bulkUpdateStatus(e.target.value)}
                                className="p-2 border border-blue-200 rounded text-sm"
                                defaultValue=""
                            >
                                <option value="">Change Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="FLAGGED">Flagged</option>
                                <option value="ARCHIVED">Archived</option>
                            </select>
                            <input
                                type="number"
                                placeholder="Stock change"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        const value = parseInt(e.target.value)
                                        if (!isNaN(value)) {
                                            bulkUpdateStock(value)
                                            e.target.value = ''
                                        }
                                    }
                                }}
                                className="p-2 border border-blue-200 rounded text-sm w-32"
                            />
                        </div>
                    </div>
                </div>
            )}

            <table className="w-full text-left ring ring-slate-200 rounded overflow-hidden text-sm">
                <thead className="bg-slate-50 text-gray-700 uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3">
                            <input
                                type="checkbox"
                                checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                                onChange={handleSelectAll}
                            />
                        </th>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3 hidden md:table-cell">Category</th>
                        <th className="px-4 py-3 hidden md:table-cell">Price</th>
                        <th className="px-4 py-3">Stock</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody className="text-slate-700">
                    {filteredProducts.map((product) => {
                        const stockStatus = getStockStatus(product.stock || 0, product.inStock)
                        return (
                            <tr key={product.id} className="border-t border-gray-200 hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedProducts.includes(product.id)}
                                        onChange={() => handleSelectProduct(product.id)}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-3 items-center">
                                        <Image width={50} height={50} className='p-1 shadow rounded' src={product.images[0]} alt="" />
                                        <div>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-xs text-slate-500 hidden md:block">{product.description.substring(0, 50)}...</div>
                                            {product.sku && <div className="text-xs text-slate-400">SKU: {product.sku}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 hidden md:table-cell">{product.category}</td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                    <div>
                                        <div>{currency} {product.price.toLocaleString()}</div>
                                        {product.mrp > product.price && (
                                            <div className="text-xs text-slate-500 line-through">{currency} {product.mrp.toLocaleString()}</div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={product.stock || 0}
                                            onChange={(e) => updateStock(product.id, parseInt(e.target.value) || 0)}
                                            className="w-16 p-1 border border-slate-200 rounded text-center"
                                            min="0"
                                        />
                                        <span className={`text-xs ${stockStatus.color}`}>{stockStatus.text}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                                        {product.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                onChange={() => toggleStock(product.id)}
                                                checked={product.inStock}
                                            />
                                            <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200"></div>
                                            <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                                        </label>
                                        <select
                                            value={product.status}
                                            onChange={(e) => updateProductStatus(product.id, e.target.value)}
                                            className="text-xs p-1 border border-slate-200 rounded"
                                        >
                                            <option value="ACTIVE">Active</option>
                                            <option value="FLAGGED">Flag</option>
                                            <option value="ARCHIVED">Archive</option>
                                            <option value="DRAFT">Draft</option>
                                        </select>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            {filteredProducts.length === 0 && !loading && (
                <div className="text-center py-8 text-slate-500">
                    No products found matching your filters.
                </div>
            )}
        </>
    )
}