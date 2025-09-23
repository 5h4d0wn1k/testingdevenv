'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export default function ApiKeysManager() {
    const { getToken } = useAuth();
    const [apiKeys, setApiKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [newKey, setNewKey] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        permissions: []
    });

    useEffect(() => {
        fetchApiKeys();
    }, []);

    const fetchApiKeys = async () => {
        try {
            const token = await getToken();
            const response = await fetch('/api/user/api-keys', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setApiKeys(data.apiKeys);
            } else {
                setMessage(data.error || 'Failed to load API keys');
            }
        } catch (error) {
            setMessage('Error loading API keys');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                permissions: checked
                    ? [...prev.permissions, value]
                    : prev.permissions.filter(p => p !== value)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const openCreateModal = () => {
        setFormData({ name: '', permissions: [] });
        setNewKey(null);
        setShowModal(true);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            const token = await getToken();
            const response = await fetch('/api/user/api-keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (response.ok) {
                setApiKeys([...apiKeys, { ...data.apiKey, key: undefined }]); // Don't store the key
                setNewKey(data.apiKey);
                setMessage('API key generated successfully');
            } else {
                setMessage(data.error || 'Failed to generate API key');
            }
        } catch (error) {
            setMessage('Error generating API key');
        } finally {
            setSaving(false);
        }
    };

    const handleRevoke = async (apiKeyId) => {
        if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) return;

        try {
            const token = await getToken();
            const response = await fetch(`/api/user/api-keys?id=${apiKeyId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setApiKeys(apiKeys.filter(key => key.id !== apiKeyId));
                setMessage('API key revoked successfully');
            } else {
                setMessage(data.error || 'Failed to revoke API key');
            }
        } catch (error) {
            setMessage('Error revoking API key');
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setNewKey(null);
    };

    if (loading) return <div className="text-center py-8">Loading API keys...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">API Keys Management</h2>
                <button
                    onClick={openCreateModal}
                    disabled={apiKeys.length >= 5}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Generate New API Key
                </button>
            </div>

            {message && (
                <div className={`p-4 mb-4 rounded ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">Security Notice</h3>
                <p className="text-sm text-yellow-700">
                    API keys provide access to your account. Keep them secure and never share them publicly.
                    You can have up to 5 active API keys.
                </p>
            </div>

            <div className="space-y-4">
                {apiKeys.map((key) => (
                    <div key={key.id} className="border rounded-lg p-4 flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold">{key.name}</h3>
                            <p className="text-sm text-gray-600">
                                Permissions: {key.permissions.length > 0 ? key.permissions.join(', ') : 'None'}
                            </p>
                            <p className="text-sm text-gray-500">
                                Created: {new Date(key.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <button
                            onClick={() => handleRevoke(key.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                        >
                            Revoke
                        </button>
                    </div>
                ))}
            </div>

            {apiKeys.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No API keys found. Generate your first API key to get started.
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Generate New API Key</h3>

                        {newKey ? (
                            <div className="space-y-4">
                                <div className="bg-green-50 border border-green-200 rounded p-4">
                                    <h4 className="font-semibold text-green-800 mb-2">API Key Generated Successfully!</h4>
                                    <p className="text-sm text-green-700 mb-2">
                                        Copy this key now. It will not be shown again.
                                    </p>
                                    <div className="bg-gray-100 p-2 rounded font-mono text-sm break-all">
                                        {newKey.key}
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600">
                                    <p><strong>Name:</strong> {newKey.name}</p>
                                    <p><strong>Permissions:</strong> {newKey.permissions.join(', ') || 'None'}</p>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Key Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Production API Key"
                                        className="w-full p-2 border rounded"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Permissions</label>
                                    <div className="space-y-2">
                                        {['read', 'write', 'delete'].map((perm) => (
                                            <label key={perm} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    value={perm}
                                                    checked={formData.permissions.includes(perm)}
                                                    onChange={handleInputChange}
                                                    className="mr-2"
                                                />
                                                {perm.charAt(0).toUpperCase() + perm.slice(1)}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 flex-1"
                                    >
                                        {saving ? 'Generating...' : 'Generate Key'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}