'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

export default function UserProfile() {
    const { user } = useUser();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await fetch('/api/user/profile');
            const data = await response.json();
            if (response.ok) {
                setProfile(data.user);
            } else {
                setMessage(data.error || 'Failed to load profile');
            }
        } catch (error) {
            setMessage('Error loading profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        const formData = new FormData(e.target);
        const updateData = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            notificationPreferences: {
                email: formData.get('emailNotifications') === 'on',
                sms: formData.get('smsNotifications') === 'on',
                marketing: formData.get('marketingNotifications') === 'on'
            }
        };

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();
            if (response.ok) {
                setProfile(data.user);
                setMessage('Profile updated successfully');
            } else {
                setMessage(data.error || 'Failed to update profile');
            }
        } catch (error) {
            setMessage('Error updating profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-6">User Profile</h2>

            {message && (
                <div className={`p-4 mb-4 rounded ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                        type="text"
                        name="name"
                        defaultValue={profile?.name || ''}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                        type="email"
                        value={profile?.email || ''}
                        className="w-full p-2 border rounded bg-gray-100"
                        readOnly
                    />
                    <p className="text-sm text-gray-600 mt-1">
                        Email verification: {profile?.isEmailVerified ? 'Verified' : 'Not verified'}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <input
                        type="tel"
                        name="phone"
                        defaultValue={profile?.phone || ''}
                        className="w-full p-2 border rounded"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                        Phone verification: {profile?.isPhoneVerified ? 'Verified' : 'Not verified'}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Notification Preferences</label>
                    <div className="space-y-2">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="emailNotifications"
                                defaultChecked={profile?.notificationPreferences?.email}
                                className="mr-2"
                            />
                            Email notifications
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="smsNotifications"
                                defaultChecked={profile?.notificationPreferences?.sms}
                                className="mr-2"
                            />
                            SMS notifications
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="marketingNotifications"
                                defaultChecked={profile?.notificationPreferences?.marketing}
                                className="mr-2"
                            />
                            Marketing notifications
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Role</label>
                    <input
                        type="text"
                        value={profile?.role || ''}
                        className="w-full p-2 border rounded bg-gray-100"
                        readOnly
                    />
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </form>
        </div>
    );
}