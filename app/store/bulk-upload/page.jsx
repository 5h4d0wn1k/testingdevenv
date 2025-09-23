'use client'
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import Image from "next/image"
import { assets } from "@/assets/assets"

export default function StoreBulkUpload() {
    const [file, setFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState([])
    const [errors, setErrors] = useState([])
    const { getToken } = useAuth()

    const handleFileUpload = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile) {
            const isCSV = selectedFile.name.endsWith('.csv')
            const isXLS = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')

            if (!isCSV && !isXLS) {
                toast.error('Please upload a CSV or XLS/XLSX file')
                return
            }
            setFile(selectedFile)
            if (isCSV) {
                parseCSV(selectedFile)
            } else {
                parseXLS(selectedFile)
            }
        }
    }

    const parseCSV = (file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const csv = e.target.result
            const lines = csv.split('\n')
            const headers = lines[0].split(',').map(h => h.trim())

            // Validate headers
            const requiredHeaders = ['name', 'description', 'price', 'category']
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

            if (missingHeaders.length > 0) {
                toast.error(`Missing required columns: ${missingHeaders.join(', ')}`)
                return
            }

            const parsedData = []
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim()) {
                    const values = lines[i].split(',').map(v => v.trim())
                    const product = {}
                    headers.forEach((header, index) => {
                        product[header] = values[index] || ''
                    })
                    parsedData.push(product)
                }
            }

            setPreview(parsedData.slice(0, 5)) // Show first 5 rows
        }
        reader.readAsText(file)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!file) {
            toast.error('Please select a CSV file')
            return
        }

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const token = await getToken()
            const { data } = await axios.post('/api/store/product/bulk-upload', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            })

            toast.success(`Successfully uploaded ${data.successful} products`)
            if (data.errors.length > 0) {
                setErrors(data.errors)
                toast.error(`${data.errors.length} products failed to upload`)
            }

            setFile(null)
            setPreview([])
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setLoading(false)
        }
    }

    const downloadTemplate = () => {
        const csvContent = `name,description,price,category,mrp,sku,stock,promotionType,promotionValue,promotionStart,promotionEnd
Sample Product 1,This is a sample product description,29.99,Electronics,39.99,SAMPLE001,100,percentage,10,2024-01-01T00:00,2024-12-31T23:59
Sample Product 2,Another sample product,19.99,Clothing,24.99,SAMPLE002,50,fixed,5,,`

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'product_upload_template.csv'
        a.click()
        window.URL.revokeObjectURL(url)
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl text-slate-500 mb-6">Bulk <span className="text-slate-800 font-medium">Product Upload</span></h1>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium text-blue-800 mb-2">CSV Upload Instructions</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Maximum 1000 products per upload</li>
                    <li>• Required columns: name, description, price, category</li>
                    <li>• Optional columns: mrp, sku, stock, promotionType, promotionValue, promotionStart, promotionEnd</li>
                    <li>• Images will be uploaded separately after bulk creation</li>
                    <li>• Use the template below to ensure correct formatting</li>
                </ul>
                <button
                    onClick={downloadTemplate}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                    Download CSV Template
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                    <Image
                        width={100}
                        height={100}
                        src={assets.upload_area}
                        alt="Upload"
                        className="mx-auto mb-4 opacity-50"
                    />
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="csv-upload"
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer">
                        <div className="text-slate-600 mb-2">
                            {file ? file.name : 'Click to upload CSV file'}
                        </div>
                        <div className="text-sm text-slate-500">
                            CSV files only, max 1000 products
                        </div>
                    </label>
                </div>

                {preview.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-4">
                        <h3 className="text-lg font-medium mb-3">Preview (First 5 rows)</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100">
                                    <tr>
                                        {Object.keys(preview[0]).map(header => (
                                            <th key={header} className="px-3 py-2 text-left">{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map((row, index) => (
                                        <tr key={index} className="border-t border-slate-200">
                                            {Object.values(row).map((value, i) => (
                                                <td key={i} className="px-3 py-2">{value}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h3 className="text-lg font-medium text-red-800 mb-3">Upload Errors</h3>
                        <ul className="space-y-1">
                            {errors.map((error, index) => (
                                <li key={index} className="text-sm text-red-700">• {error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!file || loading}
                    className="w-full bg-slate-800 text-white py-3 px-6 rounded hover:bg-slate-900 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    {loading ? 'Uploading...' : 'Upload Products'}
                </button>
            </form>
        </div>
    )
}