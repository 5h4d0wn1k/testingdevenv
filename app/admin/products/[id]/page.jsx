'use client'
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"

export default function AdminProductDetail() {

    const { user } = useUser()
    const { getToken } = useAuth()
    const router = useRouter()
    const { id } = useParams()

    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)

    const fetchProduct = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get(`/api/admin/products/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            setProduct(data.product)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const handleAction = async (action, reason = '') => {
        setActionLoading(true)
        try {
            const token = await getToken()
            const { data } = await axios.patch(`/api/admin/products/${id}`, { action, reason }, { headers: { Authorization: `Bearer ${token}` } })
            if (action === 'delete') {
                toast.success('Product deleted')
                router.push('/admin/products')
            } else {
                setProduct(data.product)
                toast.success('Action completed')
            }
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setActionLoading(false)
    }

    useEffect(() => {
        if(user && id){
            fetchProduct()
        }
    }, [user, id])

    if (loading) return <Loading />

    if (!product) return <div>Product not found</div>

    return (
        <div className="text-slate-500 mb-28">
            <button onClick={() => router.push('/admin/products')} className="mb-4 text-blue-500">← Back to Products</button>

            <h1 className="text-2xl">{product.name}</h1>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-xl font-medium mb-2">Images</h2>
                    <div className="grid grid-cols-2 gap-2">
                        {product.images.map((image, index) => (
                            <Image
                                key={index}
                                src={`${process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT}${image}`}
                                alt={`Product image ${index + 1}`}
                                width={200}
                                height={200}
                                className="object-cover rounded"
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-medium mb-2">Details</h2>
                    <p><strong>Description:</strong> {product.description}</p>
                    <p><strong>Price:</strong> ${product.price}</p>
                    <p><strong>MRP:</strong> ${product.mrp}</p>
                    <p><strong>Category:</strong> {product.category}</p>
                    <p><strong>Vendor:</strong> {product.store.name}</p>
                    <p><strong>Status:</strong> {product.status}</p>
                    <p><strong>In Stock:</strong> {product.inStock ? 'Yes' : 'No'}</p>
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-medium mb-2">Flag Logs</h2>
                {product.flagLogs && product.flagLogs.length > 0 ? (
                    <div className="space-y-2">
                        {product.flagLogs.map((log, index) => (
                            <div key={index} className="border border-slate-200 rounded p-2">
                                <p><strong>Action:</strong> {log.action}</p>
                                <p><strong>Reason:</strong> {log.reason}</p>
                                <p><strong>Timestamp:</strong> {new Date(log.timestamp).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No flag logs</p>
                )}
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-medium mb-2">Actions</h2>
                <div className="flex gap-4">
                    <button
                        onClick={() => handleAction('activate')}
                        disabled={actionLoading}
                        className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                        Activate
                    </button>
                    <button
                        onClick={() => handleAction('deactivate')}
                        disabled={actionLoading}
                        className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                        Deactivate
                    </button>
                    <button
                        onClick={() => handleAction('flag', 'Flagged by admin')}
                        disabled={actionLoading}
                        className="bg-yellow-500 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                        Flag
                    </button>
                    <button
                        onClick={() => handleAction('request_info', 'Requesting more information')}
                        disabled={actionLoading}
                        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                        Request More Info
                    </button>
                    <button
                        onClick={() => handleAction('delete')}
                        disabled={actionLoading}
                        className="bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    )
}