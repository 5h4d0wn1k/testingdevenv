'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import Loading from '@/components/Loading'
import imagekit from '@/configs/imageKit'

export default function Onboarding() {
    const { getToken, user } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        businessName: '',
        taxId: '',
        businessAddress: '',
        contactPerson: '',
        phone: user?.phoneNumbers?.[0]?.phoneNumber || '',
        website: '',
        description: '',
        documents: [],
        termsAccepted: false
    })

    const [uploading, setUploading] = useState(false)

    const steps = [
        { title: 'Business Information', description: 'Provide your business details' },
        { title: 'KYC Documents', description: 'Upload required documents' },
        { title: 'Terms & Conditions', description: 'Accept terms to continue' }
    ]

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files)
        setUploading(true)
        try {
            const uploadedDocs = []
            for (const file of files) {
                const formDataUpload = new FormData()
                formDataUpload.append('file', file)
                formDataUpload.append('fileName', file.name)

                const response = await imagekit.upload({
                    file: file,
                    fileName: file.name,
                    folder: '/kyc'
                })

                uploadedDocs.push({
                    documentType: 'kyc', // or specific type
                    documentUrl: response.url,
                    status: 'pending'
                })
            }
            setFormData(prev => ({ ...prev, documents: [...prev.documents, ...uploadedDocs] }))
            toast.success('Documents uploaded successfully')
        } catch (error) {
            toast.error('Upload failed')
        }
        setUploading(false)
    }

    const handleSubmit = async () => {
        if (step < 3) {
            setStep(step + 1)
            return
        }

        // Final submit
        setLoading(true)
        try {
            const token = await getToken()
            await axios.post('/api/store/onboarding', formData, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success('Onboarding completed!')
            router.push('/store')
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Error completing onboarding')
        }
        setLoading(false)
    }

    const canProceed = () => {
        if (step === 1) {
            return formData.businessName && formData.businessAddress && formData.contactPerson && formData.phone
        }
        if (step === 2) {
            return formData.documents.length > 0
        }
        if (step === 3) {
            return formData.termsAccepted
        }
        return false
    }

    if (loading) return <Loading />

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-center mb-8">Vendor Onboarding</h1>

            {/* Progress Indicator */}
            <div className="flex justify-between mb-8">
                {steps.map((s, index) => (
                    <div key={index} className={`flex-1 text-center ${index + 1 <= step ? 'text-green-600' : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 mx-auto rounded-full border-2 ${index + 1 <= step ? 'border-green-600 bg-green-600 text-white' : 'border-gray-400'}`}>
                            {index + 1}
                        </div>
                        <p className="mt-2 text-sm">{s.title}</p>
                    </div>
                ))}
            </div>

            {/* Step Content */}
            {step === 1 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">{steps[0].title}</h2>
                    <input
                        type="text"
                        name="businessName"
                        placeholder="Business Name"
                        value={formData.businessName}
                        onChange={handleInputChange}
                        className="w-full p-3 border rounded"
                        required
                    />
                    <input
                        type="text"
                        name="taxId"
                        placeholder="Tax ID (optional)"
                        value={formData.taxId}
                        onChange={handleInputChange}
                        className="w-full p-3 border rounded"
                    />
                    <textarea
                        name="businessAddress"
                        placeholder="Business Address"
                        value={formData.businessAddress}
                        onChange={handleInputChange}
                        className="w-full p-3 border rounded"
                        required
                    />
                    <input
                        type="text"
                        name="contactPerson"
                        placeholder="Contact Person"
                        value={formData.contactPerson}
                        onChange={handleInputChange}
                        className="w-full p-3 border rounded"
                        required
                    />
                    <input
                        type="tel"
                        name="phone"
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full p-3 border rounded"
                        required
                    />
                    <input
                        type="url"
                        name="website"
                        placeholder="Website (optional)"
                        value={formData.website}
                        onChange={handleInputChange}
                        className="w-full p-3 border rounded"
                    />
                    <textarea
                        name="description"
                        placeholder="Business Description (optional)"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full p-3 border rounded"
                    />
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">{steps[1].title}</h2>
                    <p>Upload KYC documents (ID, business license, etc.)</p>
                    <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="w-full p-3 border rounded"
                        accept="image/*,.pdf"
                    />
                    {uploading && <p>Uploading...</p>}
                    <div className="space-y-2">
                        {formData.documents.map((doc, index) => (
                            <p key={index} className="text-sm">{doc.documentUrl}</p>
                        ))}
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">{steps[2].title}</h2>
                    <div className="border p-4 rounded max-h-60 overflow-y-auto">
                        <p>Terms and Conditions content here...</p>
                        {/* Add actual terms */}
                    </div>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={formData.termsAccepted}
                            onChange={(e) => setFormData(prev => ({ ...prev, termsAccepted: e.target.checked }))}
                            className="mr-2"
                        />
                        I accept the terms and conditions
                    </label>
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
                {step > 1 && (
                    <button
                        onClick={() => setStep(step - 1)}
                        className="px-6 py-2 bg-gray-500 text-white rounded"
                    >
                        Previous
                    </button>
                )}
                <button
                    onClick={handleSubmit}
                    disabled={!canProceed()}
                    className="px-6 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
                >
                    {step === 3 ? 'Complete Onboarding' : 'Next'}
                </button>
            </div>
        </div>
    )
}