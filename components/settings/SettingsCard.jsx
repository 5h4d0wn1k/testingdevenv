const SettingsCard = ({ title, children, className = "" }) => {
    return (
        <div className={`bg-white border border-slate-200 rounded-lg p-6 shadow-sm ${className}`}>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
            <div className="space-y-4">
                {children}
            </div>
        </div>
    )
}

export default SettingsCard