'use client'
import { assets } from "@/assets/assets"
import { useEffect, useState } from "react"
import Image from "next/image"
import toast from "react-hot-toast"
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import axios from "axios"
import imagekit from "@/configs/imageKit"

export default function CreateStore() {

    const {user} = useUser()
    const router = useRouter()
    const {getToken} = useAuth()

    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [status, setStatus] = useState("")
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState("")
    const [step, setStep] = useState(1)
    const [uploading, setUploading] = useState(false)

    const [formData, setFormData] = useState({
        // Store info
        name: "",
        username: "",
        description: "",
        email: "",
        contact: "",
        address: "",
        logo: null,
        // Business details
        businessName: "",
        taxId: "",
        businessAddress: "",
        contactPerson: "",
        phone: user?.phoneNumbers?.[0]?.phoneNumber || "",
        website: "",
        businessDescription: "",
        // KYC
        idDocumentType: "",
        idDocumentNumber: "",
        businessLicenseNumber: "",
        kycDocuments: [],
        // Terms
        termsAccepted: false
    })

    const steps = [
        { title: 'Store Information', description: 'Basic store details' },
        { title: 'Business Details', description: 'Your business information' },
        { title: 'KYC Verification', description: 'Upload identification documents' },
        { title: 'Terms & Conditions', description: 'Accept terms to continue' }
    ]

    const onChangeHandler = (e) => {
        const { name, value } = e.target
        setFormData({ ...formData, [name]: value })
    }

    const handleFileChange = (e) => {
        const { name, files } = e.target
        if (name === 'logo') {
            setFormData({ ...formData, logo: files[0] })
        }
    }

    const handleKycUpload = async (e) => {
        const files = Array.from(e.target.files)
        setUploading(true)
        try {
            const uploadedDocs = []
            for (const file of files) {
                const response = await imagekit.upload({
                    file: file,
                    fileName: file.name,
                    folder: '/kyc'
                })
                uploadedDocs.push({
                    documentType: 'kyc',
                    documentUrl: response.url,
                    status: 'pending'
                })
            }
            setFormData(prev => ({ ...prev, kycDocuments: [...prev.kycDocuments, ...uploadedDocs] }))
            toast.success('Documents uploaded successfully')
        } catch (error) {
            toast.error('Upload failed')
        }
        setUploading(false)
    }

    const fetchSellerStatus = async () => {
        const token = await getToken()
        try {
            const { data } = await axios.get('/api/store/create', {headers: {Authorization: `Bearer ${token}`}})
            if(['approved', 'rejected', 'pending'].includes(data.status)){
                setStatus(data.status)
                setAlreadySubmitted(true)
                switch (data.status) {
                    case "approved":
                        setMessage("Your store has been approved, you can now add products to your store from dashboard")
                        setTimeout(()=>router.push("/store"), 5000)
                        break;
                    case "rejected":
                        setMessage("Your store request has been rejected, contact the admin for more details")
                        break;
                    case "pending":
                        setMessage("Your store request is pending, please wait for admin to approve your store")
                        break;

                    default:
                        break;
                }
            }else{
                setAlreadySubmitted(false)
            }
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const handleSubmit = async () => {
        if (step < 4) {
            setStep(step + 1)
            return
        }

        // Final submit
        if(!user){
            return toast('Please login to continue')
        }
        try {
            const token = await getToken()
            const submitData = new FormData()

            // Store info
            submitData.append("name", formData.name)
            submitData.append("username", formData.username)
            submitData.append("description", formData.description)
            submitData.append("email", formData.email)
            submitData.append("contact", formData.contact)
            submitData.append("address", formData.address)
            if (formData.logo) submitData.append("logo", formData.logo)

            // Business details
            submitData.append("businessName", formData.businessName)
            submitData.append("taxId", formData.taxId)
            submitData.append("businessAddress", formData.businessAddress)
            submitData.append("contactPerson", formData.contactPerson)
            submitData.append("phone", formData.phone)
            submitData.append("website", formData.website)
            submitData.append("businessDescription", formData.businessDescription)

            // KYC
            submitData.append("idDocumentType", formData.idDocumentType)
            submitData.append("idDocumentNumber", formData.idDocumentNumber)
            submitData.append("businessLicenseNumber", formData.businessLicenseNumber)
            submitData.append("kycDocuments", JSON.stringify(formData.kycDocuments))

            // Terms
            submitData.append("termsAccepted", formData.termsAccepted)

            const { data } = await axios.post('/api/store/create', submitData, {headers: {Authorization: `Bearer ${token}`}})
            toast.success(data.message)
            await fetchSellerStatus()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const canProceed = () => {
        if (step === 1) {
            return formData.name && formData.username && formData.email && formData.contact && formData.address && formData.logo
        }
        if (step === 2) {
            return formData.businessName && formData.businessAddress && formData.contactPerson && formData.phone
        }
        if (step === 3) {
            return formData.kycDocuments.length > 0
        }
        if (step === 4) {
            return formData.termsAccepted
        }
        return false
    }

    useEffect(() => {
        if(user){
            fetchSellerStatus()
        }
    }, [user])

    if(!user){
        return (
            <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
                <h1 className="text-2xl sm:text-4xl font-semibold">Please <span className="text-slate-500">Login</span> to continue</h1>
            </div>
        )
    }

    return !loading ? (
        <>
            {!alreadySubmitted ? (
                <div className="mx-6 min-h-[70vh] my-16">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-3xl text-center mb-8">Create Your Store</h1>

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
                                <label className="cursor-pointer block">
                                    Store Logo
                                    <Image src={formData.logo ? URL.createObjectURL(formData.logo) : assets.upload_area} className="rounded-lg mt-2 h-16 w-auto" alt="" width={150} height={100} />
                                    <input type="file" accept="image/*" onChange={handleFileChange} name="logo" hidden />
                                </label>
                                <input name="username" onChange={onChangeHandler} value={formData.username} type="text" placeholder="Store Username" className="w-full p-3 border rounded" required />
                                <input name="name" onChange={onChangeHandler} value={formData.name} type="text" placeholder="Store Name" className="w-full p-3 border rounded" required />
                                <textarea name="description" onChange={onChangeHandler} value={formData.description} rows={3} placeholder="Store Description" className="w-full p-3 border rounded" />
                                <input name="email" onChange={onChangeHandler} value={formData.email} type="email" placeholder="Store Email" className="w-full p-3 border rounded" required />
                                <input name="contact" onChange={onChangeHandler} value={formData.contact} type="text" placeholder="Contact Number" className="w-full p-3 border rounded" required />
                                <textarea name="address" onChange={onChangeHandler} value={formData.address} rows={3} placeholder="Store Address" className="w-full p-3 border rounded" required />
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold">{steps[1].title}</h2>
                                <input name="businessName" onChange={onChangeHandler} value={formData.businessName} type="text" placeholder="Business Name" className="w-full p-3 border rounded" required />
                                <input name="taxId" onChange={onChangeHandler} value={formData.taxId} type="text" placeholder="Tax ID (optional)" className="w-full p-3 border rounded" />
                                <textarea name="businessAddress" onChange={onChangeHandler} value={formData.businessAddress} rows={3} placeholder="Business Address" className="w-full p-3 border rounded" required />
                                <input name="contactPerson" onChange={onChangeHandler} value={formData.contactPerson} type="text" placeholder="Contact Person" className="w-full p-3 border rounded" required />
                                <input name="phone" onChange={onChangeHandler} value={formData.phone} type="tel" placeholder="Phone Number" className="w-full p-3 border rounded" required />
                                <input name="website" onChange={onChangeHandler} value={formData.website} type="url" placeholder="Website (optional)" className="w-full p-3 border rounded" />
                                <textarea name="businessDescription" onChange={onChangeHandler} value={formData.businessDescription} rows={3} placeholder="Business Description" className="w-full p-3 border rounded" />
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold">{steps[2].title}</h2>
                                <p>Upload KYC documents (ID, business license, etc.)</p>
                                <input type="file" multiple onChange={handleKycUpload} className="w-full p-3 border rounded" accept="image/*,.pdf" />
                                {uploading && <p>Uploading...</p>}
                                <div className="space-y-2">
                                    {formData.kycDocuments.map((doc, index) => (
                                        <p key={index} className="text-sm">{doc.documentUrl}</p>
                                    ))}
                                </div>
                                <input name="idDocumentType" onChange={onChangeHandler} value={formData.idDocumentType} type="text" placeholder="ID Document Type (e.g., Passport, Driver's License)" className="w-full p-3 border rounded" />
                                <input name="idDocumentNumber" onChange={onChangeHandler} value={formData.idDocumentNumber} type="text" placeholder="ID Document Number" className="w-full p-3 border rounded" />
                                <input name="businessLicenseNumber" onChange={onChangeHandler} value={formData.businessLicenseNumber} type="text" placeholder="Business License Number" className="w-full p-3 border rounded" />
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold">{steps[3].title}</h2>
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
                                onClick={() => toast.promise(handleSubmit(), { loading: step === 4 ? "Submitting..." : "Next" })}
                                disabled={!canProceed()}
                                className="px-6 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 ml-auto"
                            >
                                {step === 4 ? 'Submit Application' : 'Next'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="min-h-[80vh] flex flex-col items-center justify-center">
                    <p className="sm:text-2xl lg:text-3xl mx-5 font-semibold text-slate-500 text-center max-w-2xl">{message}</p>
                    {status === "approved" && <p className="mt-5 text-slate-400">redirecting to dashboard in <span className="font-semibold">5 seconds</span></p>}
                </div>
            )}
        </>
    ) : (<Loading />)
}