'use client'
import { assets } from "@/assets/assets"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import Image from "next/image"
import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"

export default function StoreAddProduct() {

    const categories = ['Electronics', 'Clothing', 'Home & Kitchen', 'Beauty & Health', 'Toys & Games', 'Sports & Outdoors', 'Books & Media', 'Food & Drink', 'Hobbies & Crafts', 'Others']

    const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null })
    const [productInfo, setProductInfo] = useState({
        name: "",
        description: "",
        mrp: 0,
        price: 0,
        category: "",
        sku: "",
        stock: 0,
        hasVariants: false,
        promotionType: "none", // none, percentage, fixed
        promotionValue: 0,
        promotionStart: "",
        promotionEnd: "",
    })
    const [variants, setVariants] = useState([])
    const [loading, setLoading] = useState(false)
    const [aiUsed, setAiUsed] = useState(false)
    const [attributeTemplates, setAttributeTemplates] = useState([])
    const [attributes, setAttributes] = useState({})

    const { getToken } = useAuth()

    const onChangeHandler = (e) => {
        const { name, value, type } = e.target
        setProductInfo({
            ...productInfo,
            [name]: type === 'number' ? Number(value) : value
        })
    }

    const addVariant = () => {
        setVariants([...variants, {
            id: Date.now(),
            name: "",
            sku: "",
            price: 0,
            stock: 0,
            attributes: {}
        }])
    }

    const updateVariant = (id, field, value) => {
        setVariants(variants.map(variant =>
            variant.id === id ? { ...variant, [field]: value } : variant
        ))
    }

    const removeVariant = (id) => {
        setVariants(variants.filter(variant => variant.id !== id))
    }

    const fetchAttributeTemplates = async (category) => {
        if (!category) {
            setAttributeTemplates([])
            return
        }

        try {
            const token = await getToken()
            const { data } = await axios.get(`/api/store/attribute-templates?category=${encodeURIComponent(category)}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setAttributeTemplates(data.templates)
        } catch (error) {
            console.error('Failed to fetch attribute templates:', error)
            setAttributeTemplates([])
        }
    }

    const handleAttributeChange = (templateId, value) => {
        setAttributes(prev => ({
            ...prev,
            [templateId]: value
        }))
    }

    const handleImageUpload = async (key, file) => {
        setImages(prev => ({ ...prev, [key]: file }))

        if (key === "1" && file && !aiUsed) {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onloadend = async () => {
                const base64String = reader.result.split(",")[1]
                const mimeType = file.type
                const token = await getToken()

                try {
                    await toast.promise(
                        axios.post(
                            "/api/store/ai",
                            { base64Image: base64String, mimeType },
                            { headers: { Authorization: `Bearer ${token}` } }
                        ),
                        {
                            loading: "Analyzing image with AI...",
                            success: (res) => {
                                console.log(res);
                                
                                const data = res.data
                                if (data.name && data.description) {
                                    setProductInfo(prev => ({
                                        ...prev,
                                        name: data.name,
                                        description: data.description
                                    }))
                                    setAiUsed(true)
                                    return "AI filled product info 🎉"
                                }
                                return "AI could not analyze the image"
                            },
                            error: (err) =>
                                err?.response?.data?.error || err.message
                        }
                    )
                } catch (error) {
                    console.error(error)
                }
            }
        }
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        try {
            if (!images[1] && !images[2] && !images[3] && !images[4]) {
                return toast.error('Please upload at least one image')
            }

            if (productInfo.hasVariants && variants.length === 0) {
                return toast.error('Please add at least one variant or disable variants')
            }

            setLoading(true)

            const formData = new FormData()
            formData.append('name', productInfo.name)
            formData.append('description', productInfo.description)
            formData.append('mrp', productInfo.mrp)
            formData.append('price', productInfo.price)
            formData.append('category', productInfo.category)
            formData.append('sku', productInfo.sku)
            formData.append('stock', productInfo.stock)
            formData.append('hasVariants', productInfo.hasVariants)
            formData.append('promotionType', productInfo.promotionType)
            formData.append('promotionValue', productInfo.promotionValue)
            formData.append('promotionStart', productInfo.promotionStart)
            formData.append('promotionEnd', productInfo.promotionEnd)

            if (productInfo.hasVariants) {
                formData.append('variants', JSON.stringify(variants))
            }

            if (Object.keys(attributes).length > 0) {
                formData.append('attributes', JSON.stringify(attributes))
            }

            Object.keys(images).forEach((key) => {
                images[key] && formData.append('images', images[key])
            })

            const token = await getToken()
            const { data } = await axios.post('/api/store/product', formData, { headers: { Authorization: `Bearer ${token}` } })
            toast.success(data.message)

            setProductInfo({
                name: "", description: "", mrp: 0, price: 0, category: "",
                sku: "", stock: 0, hasVariants: false,
                promotionType: "none", promotionValue: 0, promotionStart: "", promotionEnd: ""
            })
            setVariants([])
            setImages({ 1: null, 2: null, 3: null, 4: null })
            setAttributes({})
            setAttributeTemplates([])
            setAiUsed(false)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAttributeTemplates(productInfo.category)
    }, [productInfo.category])

    return (
        <form onSubmit={e => toast.promise(onSubmitHandler(e), { loading: "Adding Product..." })} className="text-slate-500 mb-28">
            <h1 className="text-2xl">Add New <span className="text-slate-800 font-medium">Products</span></h1>
            <p className="mt-7">Product Images</p>

            <div className="flex gap-3 mt-4">
                {Object.keys(images).map((key) => (
                    <label key={key} htmlFor={`images${key}`}>
                        <Image
                            width={300}
                            height={300}
                            className='h-15 w-auto border border-slate-200 rounded cursor-pointer'
                            src={images[key] ? URL.createObjectURL(images[key]) : assets.upload_area}
                            alt=""
                        />
                        <input
                            type="file"
                            accept='image/*'
                            id={`images${key}`}
                            onChange={e => handleImageUpload(key, e.target.files[0])}
                            hidden
                        />
                    </label>
                ))}
            </div>

            <label className="flex flex-col gap-2 my-6 ">
                Name
                <input type="text" name="name" onChange={onChangeHandler} value={productInfo.name} placeholder="Enter product name" className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded" required />
            </label>

            <label className="flex flex-col gap-2 my-6 ">
                Description
                <textarea name="description" onChange={onChangeHandler} value={productInfo.description} placeholder="Enter product description" rows={5} className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded resize-none" required />
            </label>

            <div className="flex gap-5">
                <label className="flex flex-col gap-2 ">
                    Actual Price ($)
                    <input type="number" name="mrp" onChange={onChangeHandler} value={productInfo.mrp} placeholder="0" className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded" required />
                </label>
                <label className="flex flex-col gap-2 ">
                    Offer Price ($)
                    <input type="number" name="price" onChange={onChangeHandler} value={productInfo.price} placeholder="0" className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded" required />
                </label>
            </div>

            <div className="flex gap-5">
                <label className="flex flex-col gap-2 ">
                    SKU
                    <input type="text" name="sku" onChange={onChangeHandler} value={productInfo.sku} placeholder="Enter SKU" className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded" />
                </label>
                <label className="flex flex-col gap-2 ">
                    Stock Quantity
                    <input type="number" name="stock" onChange={onChangeHandler} value={productInfo.stock} placeholder="0" className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded" min="0" />
                </label>
            </div>

            <select onChange={e => setProductInfo({ ...productInfo, category: e.target.value })} value={productInfo.category} className="w-full max-w-sm p-2 px-4 my-6 outline-none border border-slate-200 rounded" required>
                <option value="">Select a category</option>
                {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                ))}
            </select>

            {attributeTemplates.length > 0 && (
                <div className="my-6 p-4 border border-slate-200 rounded">
                    <h3 className="text-lg font-medium mb-4">Category Attributes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {attributeTemplates.map((template) => (
                            <div key={template.id} className="flex flex-col gap-2">
                                <label className="text-sm font-medium">
                                    {template.name} {template.required && <span className="text-red-500">*</span>}
                                    {template.unit && <span className="text-slate-400">({template.unit})</span>}
                                </label>
                                {template.type === 'text' && (
                                    <input
                                        type="text"
                                        value={attributes[template.id] || ''}
                                        onChange={(e) => handleAttributeChange(template.id, e.target.value)}
                                        placeholder={`Enter ${template.name.toLowerCase()}`}
                                        className="p-2 px-4 outline-none border border-slate-200 rounded"
                                        required={template.required}
                                    />
                                )}
                                {template.type === 'number' && (
                                    <input
                                        type="number"
                                        value={attributes[template.id] || ''}
                                        onChange={(e) => handleAttributeChange(template.id, Number(e.target.value))}
                                        placeholder={`Enter ${template.name.toLowerCase()}`}
                                        className="p-2 px-4 outline-none border border-slate-200 rounded"
                                        min={template.validation?.min || 0}
                                        max={template.validation?.max}
                                        required={template.required}
                                    />
                                )}
                                {template.type === 'select' && (
                                    <select
                                        value={attributes[template.id] || ''}
                                        onChange={(e) => handleAttributeChange(template.id, e.target.value)}
                                        className="p-2 px-4 outline-none border border-slate-200 rounded"
                                        required={template.required}
                                    >
                                        <option value="">Select {template.name.toLowerCase()}</option>
                                        {template.options?.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                )}
                                {template.type === 'boolean' && (
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={attributes[template.id] || false}
                                            onChange={(e) => handleAttributeChange(template.id, e.target.checked)}
                                            className="rounded"
                                        />
                                        {template.name}
                                    </label>
                                )}
                                {template.type === 'date' && (
                                    <input
                                        type="date"
                                        value={attributes[template.id] || ''}
                                        onChange={(e) => handleAttributeChange(template.id, e.target.value)}
                                        className="p-2 px-4 outline-none border border-slate-200 rounded"
                                        required={template.required}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="my-6">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={productInfo.hasVariants}
                        onChange={(e) => setProductInfo({ ...productInfo, hasVariants: e.target.checked })}
                    />
                    This product has variants (sizes, colors, etc.)
                </label>
            </div>

            {productInfo.hasVariants && (
                <div className="my-6 p-4 border border-slate-200 rounded">
                    <h3 className="text-lg font-medium mb-4">Product Variants</h3>
                    {variants.map((variant, index) => (
                        <div key={variant.id} className="mb-4 p-3 border border-slate-100 rounded">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">Variant {index + 1}</span>
                                <button
                                    type="button"
                                    onClick={() => removeVariant(variant.id)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    Remove
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Variant name (e.g., Small, Red)"
                                    value={variant.name}
                                    onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                                    className="p-2 px-4 outline-none border border-slate-200 rounded"
                                />
                                <input
                                    type="text"
                                    placeholder="SKU"
                                    value={variant.sku}
                                    onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                                    className="p-2 px-4 outline-none border border-slate-200 rounded"
                                />
                                <input
                                    type="number"
                                    placeholder="Price"
                                    value={variant.price}
                                    onChange={(e) => updateVariant(variant.id, 'price', Number(e.target.value))}
                                    className="p-2 px-4 outline-none border border-slate-200 rounded"
                                    min="0"
                                />
                                <input
                                    type="number"
                                    placeholder="Stock"
                                    value={variant.stock}
                                    onChange={(e) => updateVariant(variant.id, 'stock', Number(e.target.value))}
                                    className="p-2 px-4 outline-none border border-slate-200 rounded"
                                    min="0"
                                />
                            </div>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addVariant}
                        className="bg-slate-500 text-white px-4 py-2 hover:bg-slate-600 rounded transition"
                    >
                        Add Variant
                    </button>
                </div>
            )}

            <div className="my-6 p-4 border border-slate-200 rounded">
                <h3 className="text-lg font-medium mb-4">Promotions</h3>
                <div className="grid grid-cols-2 gap-4">
                    <select
                        name="promotionType"
                        value={productInfo.promotionType}
                        onChange={onChangeHandler}
                        className="p-2 px-4 outline-none border border-slate-200 rounded"
                    >
                        <option value="none">No Promotion</option>
                        <option value="percentage">Percentage Discount</option>
                        <option value="fixed">Fixed Amount Discount</option>
                    </select>
                    {productInfo.promotionType !== 'none' && (
                        <input
                            type="number"
                            name="promotionValue"
                            value={productInfo.promotionValue}
                            onChange={onChangeHandler}
                            placeholder={productInfo.promotionType === 'percentage' ? 'Discount %' : 'Discount amount'}
                            className="p-2 px-4 outline-none border border-slate-200 rounded"
                            min="0"
                        />
                    )}
                </div>
                {productInfo.promotionType !== 'none' && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <input
                            type="datetime-local"
                            name="promotionStart"
                            value={productInfo.promotionStart}
                            onChange={onChangeHandler}
                            className="p-2 px-4 outline-none border border-slate-200 rounded"
                        />
                        <input
                            type="datetime-local"
                            name="promotionEnd"
                            value={productInfo.promotionEnd}
                            onChange={onChangeHandler}
                            className="p-2 px-4 outline-none border border-slate-200 rounded"
                        />
                    </div>
                )}
            </div>

            <br />

            <button disabled={loading} className="bg-slate-800 text-white px-6 mt-7 py-2 hover:bg-slate-900 rounded transition">Add Product</button>
        </form>
    )
}
