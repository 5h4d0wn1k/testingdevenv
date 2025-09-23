'use client'
import ProductCard from "@/components/ProductCard"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { MailIcon, MapPinIcon, InfoIcon } from "lucide-react"
import Loading from "@/components/Loading"
import Image from "next/image"
import axios from "axios"
import toast from "react-hot-toast"
import DynamicHead from "@/components/DynamicHead"

export default function StoreShop() {

    const { username } = useParams()
    const [products, setProducts] = useState([])
    const [storeInfo, setStoreInfo] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchStoreData = async () => {
        try {
            const { data } = await axios.get(`/api/store/data?username=${username}`)
            setStoreInfo(data.store)
            setProducts(data.store.Product)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchStoreData()
    }, [])

    const profile = storeInfo?.vendorProfile
    const primaryColor = profile?.primaryColor || '#007bff'
    const secondaryColor = profile?.secondaryColor || '#6c757d'

    return !loading ? (
        <>
            <DynamicHead
                title={profile?.seoTitle || storeInfo?.name}
                description={profile?.seoDescription || storeInfo?.description}
                keywords={profile?.seoKeywords?.join(', ') || ''}
            />
            <div className="min-h-[70vh] mx-6">

                {/* Store Banner */}
                {profile?.bannerUrl && (
                    <div className="max-w-7xl mx-auto mt-6 rounded-xl overflow-hidden shadow-xs">
                        <Image
                            src={profile.bannerUrl}
                            alt={`${storeInfo.name} banner`}
                            width={1200}
                            height={300}
                            className="w-full h-48 object-cover"
                        />
                    </div>
                )}

                {/* Store Info Banner */}
                {storeInfo && (
                    <div className="max-w-7xl mx-auto bg-slate-50 rounded-xl p-6 md:p-10 mt-6 flex flex-col md:flex-row items-center gap-6 shadow-xs" style={{ borderColor: primaryColor }}>
                        <Image
                            src={profile?.logoUrl || storeInfo.logo}
                            alt={storeInfo.name}
                            className="size-32 sm:size-38 object-cover border-2 rounded-md"
                            width={200}
                            height={200}
                            style={{ borderColor: primaryColor }}
                        />
                        <div className="text-center md:text-left">
                            <h1 className="text-3xl font-semibold" style={{ color: primaryColor }}>{storeInfo.name}</h1>
                            <p className="text-sm text-slate-600 mt-2 max-w-lg">{storeInfo.description}</p>
                            <div className="text-xs text-slate-500 mt-4 space-y-1"></div>
                            <div className="space-y-2 text-sm text-slate-500">
                                <div className="flex items-center">
                                    <MapPinIcon className="w-4 h-4 mr-2" style={{ color: secondaryColor }} />
                                    <span>{storeInfo.address}</span>
                                </div>
                                <div className="flex items-center">
                                    <MailIcon className="w-4 h-4 mr-2" style={{ color: secondaryColor }} />
                                    <span>{storeInfo.email}</span>
                                </div>
                                {profile?.aboutPage && (
                                    <div className="flex items-center">
                                        <InfoIcon className="w-4 h-4 mr-2" style={{ color: secondaryColor }} />
                                        <a href="#about" className="hover:underline" style={{ color: primaryColor }}>About Us</a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* About Section */}
                {profile?.aboutPage && (
                    <div id="about" className="max-w-7xl mx-auto mt-12 bg-white rounded-xl p-6 shadow-xs">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: primaryColor }}>About Us</h2>
                        <div dangerouslySetInnerHTML={{ __html: profile.aboutPage.replace(/\n/g, '<br>') }} />
                    </div>
                )}

                {/* Products */}
                <div className=" max-w-7xl mx-auto mb-40">
                    <h1 className="text-2xl mt-12">Shop <span className="font-medium" style={{ color: primaryColor }}>Products</span></h1>
                    <div className="mt-5 grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto">
                        {products.map((product) => <ProductCard key={product.id} product={product} />)}
                    </div>
                </div>
            </div>
        </>
    ) : <Loading />
}