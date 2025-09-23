import { getMetadata } from "@/lib/seo";
import PublicLayoutClient from "@/components/PublicLayoutClient";

export const metadata = await getMetadata();

export default function PublicLayout({ children }) {
    return <PublicLayoutClient>{children}</PublicLayoutClient>;
}
