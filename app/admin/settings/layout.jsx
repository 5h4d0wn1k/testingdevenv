export const metadata = {
    title: "Platform Settings - DavCreations. Admin",
    description: "Manage platform settings",
};

export default function SettingsLayout({ children }) {
    return (
        <div className="p-6">
            {children}
        </div>
    );
}