'use client'
import Image from "next/image"
import { MapPin, Mail, Phone } from "lucide-react"

const StoreInfo = ({store}) => {
    return (
        <div className="flex-1 space-y-2 text-sm">
            <Image width={100} height={100} src={store.logo} alt={store.name} className="max-w-20 max-h-20 object-contain shadow rounded-full max-sm:mx-auto" />
            <div className="flex flex-col sm:flex-row gap-3 items-center">
                <h3 className="text-xl font-semibold text-slate-800"> {store.name} </h3>
                <span className="text-sm">@{store.username}</span>

                {/* Status Badge */}
                <span
                    className={`text-xs font-semibold px-4 py-1 rounded-full ${store.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : store.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                        }`}
                >
                    {store.status}
                </span>
            </div>

            <p className="text-slate-600 my-5 max-w-2xl">{store.description}</p>
            <p className="flex items-center gap-2"> <MapPin size={16} /> {store.address}</p>
            <p className="flex items-center gap-2"><Phone size={16} /> {store.contact}</p>
            <p className="flex items-center gap-2"><Mail size={16} />  {store.email}</p>

            {/* Vendor Profile */}
            {store.vendorProfile && (
                <div className="mt-4 p-4 bg-gray-50 rounded">
                    <h4 className="font-semibold">Business Details</h4>
                    <p><strong>Business Name:</strong> {store.vendorProfile.businessName}</p>
                    <p><strong>Tax ID:</strong> {store.vendorProfile.taxId || 'N/A'}</p>
                    <p><strong>Contact Person:</strong> {store.vendorProfile.contactPerson}</p>
                    <p><strong>Phone:</strong> {store.vendorProfile.phone}</p>
                    <p><strong>Website:</strong> {store.vendorProfile.website || 'N/A'}</p>
                    <p><strong>Business Address:</strong> {store.vendorProfile.businessAddress}</p>
                    {store.vendorProfile.idDocumentType && (
                        <p><strong>ID Type:</strong> {store.vendorProfile.idDocumentType} - {store.vendorProfile.idDocumentNumber}</p>
                    )}
                    {store.vendorProfile.businessLicenseNumber && (
                        <p><strong>Business License:</strong> {store.vendorProfile.businessLicenseNumber}</p>
                    )}
                </div>
            )}

            {/* Vendor Documents */}
            {store.vendorDocuments && store.vendorDocuments.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded">
                    <h4 className="font-semibold">KYC Documents</h4>
                    {store.vendorDocuments.map((doc, index) => (
                        <p key={index}><a href={doc.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{doc.documentType} - {doc.status}</a></p>
                    ))}
                </div>
            )}

            <p className="text-slate-700 mt-5">Applied  on <span className="text-xs">{new Date(store.createdAt).toLocaleDateString()}</span> by</p>
            <div className="flex items-center gap-2 text-sm ">
                <Image width={36} height={36} src={store.user.image} alt={store.user.name} className="w-9 h-9 rounded-full" />
                <div>
                    <p className="text-slate-600 font-medium">{store.user.name}</p>
                    <p className="text-slate-400">{store.user.email}</p>
                </div>
            </div>
        </div>
    )
}

export default StoreInfo