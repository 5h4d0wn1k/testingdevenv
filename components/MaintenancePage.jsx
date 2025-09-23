import { useSelector } from 'react-redux';

const MaintenancePage = () => {
    const { maintenanceMessage } = useSelector((state) => state.settings.publicData);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Maintenance Mode</h1>
                <p className="text-gray-600">{maintenanceMessage || 'The site is currently under maintenance. Please check back later.'}</p>
            </div>
        </div>
    );
};

export default MaintenancePage;