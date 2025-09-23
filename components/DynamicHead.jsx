'use client'
import { useEffect } from "react";
import { useSelector } from "react-redux";

export default function DynamicHead() {
    const { publicData } = useSelector((state) => state.settings);

    useEffect(() => {
        if (publicData?.siteName) {
            document.title = `${publicData.siteName} - Shop smarter`;
        }
        if (publicData?.faviconUrl) {
            const link = document.querySelector("link[rel='icon']") || document.createElement('link');
            link.rel = 'icon';
            link.href = publicData.faviconUrl;
            document.head.appendChild(link);
        }
    }, [publicData]);

    return null;
}