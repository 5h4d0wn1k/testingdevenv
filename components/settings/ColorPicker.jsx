const ColorPicker = ({ value, onChange, label }) => {
    return (
        <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={value || '#007bff'}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                />
                <input
                    type="text"
                    value={value || '#007bff'}
                    onChange={(e) => onChange(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#007bff"
                />
            </div>
        </div>
    )
}

export default ColorPicker