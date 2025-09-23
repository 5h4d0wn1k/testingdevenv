'use client'
import { useState } from "react"
import { Bell, AlertTriangle, Info, CheckCircle, X, Calendar, Clock } from "lucide-react"

export default function Announcements() {
    const [dismissedAnnouncements, setDismissedAnnouncements] = useState([])

    // Dummy announcements data
    const announcements = [
        {
            id: 1,
            type: 'maintenance',
            priority: 'high',
            title: 'Scheduled Platform Maintenance',
            message: 'The platform will undergo scheduled maintenance on October 1st from 2:00 AM to 4:00 AM UTC. During this time, the store dashboard may be temporarily unavailable. We apologize for any inconvenience.',
            date: '2024-09-25',
            time: '14:00',
            expiresAt: '2024-10-01T04:00:00Z',
            isActive: true
        },
        {
            id: 2,
            type: 'policy',
            priority: 'medium',
            title: 'Updated Return Policy',
            message: 'We have updated our return policy to provide better protection for both vendors and customers. The new policy allows returns within 30 days for most items. Please review the updated policy in your vendor dashboard.',
            date: '2024-09-20',
            time: '10:30',
            expiresAt: '2024-10-20T00:00:00Z',
            isActive: true
        },
        {
            id: 3,
            type: 'feature',
            priority: 'low',
            title: 'New Analytics Features Available',
            message: 'We\'ve added new analytics features to help you better understand your store performance. Check out the enhanced reporting tools in your analytics dashboard.',
            date: '2024-09-18',
            time: '09:15',
            expiresAt: '2024-10-18T00:00:00Z',
            isActive: true
        },
        {
            id: 4,
            type: 'info',
            priority: 'medium',
            title: 'Holiday Season Preparation',
            message: 'As we approach the holiday season, please ensure your inventory levels are updated and shipping times are accurate. High demand is expected starting mid-November.',
            date: '2024-09-15',
            time: '16:45',
            expiresAt: '2024-11-15T00:00:00Z',
            isActive: true
        },
        {
            id: 5,
            type: 'alert',
            priority: 'high',
            title: 'Security Update Required',
            message: 'A critical security update has been released. Please update your store settings immediately to ensure continued secure operation. Failure to update may result in temporary suspension.',
            date: '2024-09-22',
            time: '08:00',
            expiresAt: '2024-09-30T00:00:00Z',
            isActive: true
        }
    ]

    const getAnnouncementIcon = (type) => {
        const icons = {
            maintenance: <AlertTriangle size={20} className="text-orange-600" />,
            policy: <Info size={20} className="text-blue-600" />,
            feature: <CheckCircle size={20} className="text-green-600" />,
            info: <Bell size={20} className="text-gray-600" />,
            alert: <AlertTriangle size={20} className="text-red-600" />
        }
        return icons[type] || <Bell size={20} className="text-gray-600" />
    }

    const getAnnouncementStyle = (priority) => {
        const styles = {
            high: 'border-red-200 bg-red-50',
            medium: 'border-yellow-200 bg-yellow-50',
            low: 'border-blue-200 bg-blue-50'
        }
        return styles[priority] || 'border-gray-200 bg-gray-50'
    }

    const dismissAnnouncement = (id) => {
        setDismissedAnnouncements(prev => [...prev, id])
    }

    const activeAnnouncements = announcements.filter(
        announcement => announcement.isActive && !dismissedAnnouncements.includes(announcement.id)
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                    <Bell size={24} className="text-blue-600" />
                    <h3 className="text-lg font-medium text-gray-900">System Announcements</h3>
                </div>
                <p className="text-gray-600">
                    Stay informed about platform updates, maintenance schedules, and important notices.
                </p>
            </div>

            {/* Active Announcements */}
            {activeAnnouncements.length === 0 ? (
                <div className="bg-white p-12 rounded-lg shadow border border-gray-200 text-center">
                    <Bell size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Announcements</h3>
                    <p className="text-gray-600">You&apos;re all caught up! Check back later for new announcements.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {activeAnnouncements.map((announcement) => (
                        <div
                            key={announcement.id}
                            className={`border-l-4 rounded-lg shadow border p-6 ${getAnnouncementStyle(announcement.priority)}`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="mt-1">
                                        {getAnnouncementIcon(announcement.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="text-lg font-semibold text-gray-900">
                                                {announcement.title}
                                            </h4>
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                                announcement.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                announcement.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {announcement.priority.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 mb-4 leading-relaxed">
                                            {announcement.message}
                                        </p>
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {announcement.date}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock size={14} />
                                                {announcement.time}
                                            </div>
                                            <div className="text-gray-500">
                                                Expires: {new Date(announcement.expiresAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => dismissAnnouncement(announcement.id)}
                                    className="text-gray-400 hover:text-gray-600 p-1"
                                    title="Dismiss announcement"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Announcement Archive */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Announcement Archive</h3>
                <p className="text-gray-600 mb-4">
                    View previously dismissed or expired announcements.
                </p>
                <button className="text-blue-600 hover:text-blue-800 font-medium">
                    View Archive →
                </button>
            </div>

            {/* Subscription Settings */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
                <p className="text-gray-600 mb-4">
                    Choose which types of announcements you want to receive.
                </p>
                <div className="space-y-3">
                    {['Maintenance', 'Policy Updates', 'New Features', 'Security Alerts', 'General Information'].map((type) => (
                        <label key={type} className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                defaultChecked
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-gray-700">{type}</span>
                        </label>
                    ))}
                </div>
                <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Save Preferences
                </button>
            </div>
        </div>
    )
}