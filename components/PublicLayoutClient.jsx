'use client'
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MaintenancePage from "@/components/MaintenancePage";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts } from "@/lib/features/product/productSlice";
import { useUser, useAuth } from "@clerk/nextjs";
import { fetchCart, uploadCart } from "@/lib/features/cart/cartSlice";
import { fetchAddress } from "@/lib/features/address/addressSlice";
import { fetchUserRatings } from "@/lib/features/rating/ratingSlice";
import { fetchPublicSettings } from "@/lib/features/settings/settingsSlice";

export default function PublicLayoutClient({ children }) {

    const dispatch = useDispatch()
    const {user} = useUser()
    const {getToken} = useAuth()

    const {cartItems} = useSelector((state)=>state.cart)
    const { publicData } = useSelector((state) => state.settings)

    useEffect(()=>{
        dispatch(fetchProducts({}))
    },[])

    useEffect(() => {
        dispatch(fetchPublicSettings())
    }, [])

    useEffect(()=>{
        if(user){
            dispatch(fetchCart({getToken}))
            dispatch(fetchAddress({getToken}))
            dispatch(fetchUserRatings({getToken}))
        }
    },[user])

    useEffect(()=>{
        if(user){
            dispatch(uploadCart({getToken}))
        }
    },[cartItems])

    if (publicData?.maintenanceEnabled) {
        return <MaintenancePage />;
    }

    return (
        <>
            <Banner />
            <Navbar />
            {children}
            <Footer />
        </>
    );
}