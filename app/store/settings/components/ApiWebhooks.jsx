'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import { Key, Webhook, Plus, Trash2, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react'

const ApiWebhooks = ({ onUpdate }) => {
    const { getToken } = useAuth()
    const [loading, setLoading] = useState(false)
    const [apiKeys, setApiKeys] = useState([])
    const [webhooks, setWebhooks] = useState([])
    const [showCreateKey, setShowCreateKey] = useState(false)
    const [showCreateWebhook, setShowCreateWebhook] = useState(false)
    const [message, setMessage] = useState('')
    const [newKeyName, setNewKeyName] = useState('')
    const [newWebhook, setNewWebhook] = useState({
        name: '',
        url: '',
        events: []
    })

    const availableEvents = [
        'order.created',
        'order.updated',
        'order.cancelled',
        'fulfillment.shipped',
        'fulfillment.delivered',
        'return.requested',
        'return.approved',
        'refund.processed'
    ]

    const fetchData = async () => {
        try {
            const token = await getToken()

            const [keysResponse, webhooksResponse] = await Promise.all([
                axios.get('/api/store/api-keys', { headers: { Authorization: `Bearer ${token}` }}),
                axios.get('/api/store/webhooks', { headers: { Authorization: `Bearer ${token}` }})
            ])

            setApiKeys(keysResponse.data.apiKeys)
            setWebhooks(webhooksResponse.data.webhooks)
        } catch (error) {
            console.error('Error fetching data:', error)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const createApiKey = async () => {
        if (!newKeyName.trim()) return

        setLoading(true)
        try {
            const token = await getToken()
            await axios.post('/api/store/api-keys', {
                name: newKeyName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })

            setNewKeyName('')
            setShowCreateKey(false)
            setMessage('API key created successfully!')
            fetchData()
        } catch (error) {
            console.error('Error creating API key:', error)
            setMessage(error.response?.data?.error || 'Failed to create API key')
        } finally {
            setLoading(false)
        }
    }

    const deleteApiKey = async (keyId) => {
        if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return

        setLoading(true)
        try {
            const token = await getToken()
            await axios.delete(`/api/store/api-keys/${keyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            setMessage('API key deleted successfully!')
            fetchData()
        } catch (error) {
            console.error('Error deleting API key:', error)
            setMessage(error.response?.data?.error || 'Failed to delete API key')
        } finally {
            setLoading(false)
        }
    }

    const createWebhook = async () => {
        if (!newWebhook.name.trim() || !newWebhook.url.trim() || newWebhook.events.length === 0) return

        setLoading(true)
        try {
            const token = await getToken()
            await axios.post('/api/store/webhooks', newWebhook, {
                headers: { Authorization: `Bearer ${token}` }
            })

            setNewWebhook({ name: '', url: '', events: [] })
            setShowCreateWebhook(false)
            setMessage('Webhook created successfully!')
            fetchData()
        } catch (error) {
            console.error('Error creating webhook:', error)
            setMessage(error.response?.data?.error || 'Failed to create webhook')
        } finally {
            setLoading(false)
        }
    }

    const deleteWebhook = async (webhookId) => {
        if (!confirm('Are you sure you want to delete this webhook? This action cannot be undone.')) return

        setLoading(true)
        try {
            const token = await getToken()
            await axios.delete(`/api/store/webhooks/${webhookId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            setMessage('Webhook deleted successfully!')
            fetchData()
        } catch (error) {
            console.error('Error deleting webhook:', error)
            setMessage(error.response?.data?.error || 'Failed to delete webhook')
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
        setMessage('Copied to clipboard!')
        setTimeout(() => setMessage(''), 2000)
    }

    const toggleEvent = (event) => {
        setNewWebhook(prev => ({
            ...prev,
            events: prev.events.includes(event)
                ? prev.events.filter(e => e !== event)
                : [...prev.events, event]
        }))
    }

    return (
        <div className="space-y-6">
            {/* Message */}
            {message && (
                <div className={`p-4 rounded-md ${message.includes('successfully') || message.includes('Copied') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        {message}
                    </div>
                </div>
            )}

            {/* API Keys Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                        <Key className="h-6 w-6 text-blue-600" />
                        API Keys
                    </h2>
                    <button
                        onClick={() => setShowCreateKey(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Create API Key
                    </button>
                </div>

                {/* Create API Key Form */}
                {showCreateKey && (
                    <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                placeholder="API Key Name"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                                onClick={createApiKey}
                                disabled={loading || !newKeyName.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                Create
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateKey(false)
                                    setNewKeyName('')
                                }}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* API Keys List */}
                <div className="space-y-3">
                    {apiKeys.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No API keys found. Create your first API key to get started.</p>
                    ) : (
                        apiKeys.map((key) => (
                            <div key={key.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{key.name}</p>
                                    <p className="text-sm text-gray-500">Created {new Date(key.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => copyToClipboard(key.key)}
                                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
                                        title="Copy API Key"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => deleteApiKey(key.id)}
                                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                                        title="Delete API Key"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Webhooks Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                        <Webhook className="h-6 w-6 text-blue-600" />
                        Webhooks
                    </h2>
                    <button
                        onClick={() => setShowCreateWebhook(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Webhook
                    </button>
                </div>

                {/* Create Webhook Form */}
                {showCreateWebhook && (
                    <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Webhook Name
                            </label>
                            <input
                                type="text"
                                value={newWebhook.name}
                                onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="My Webhook"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Webhook URL
                            </label>
                            <input
                                type="url"
                                value={newWebhook.url}
                                onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                                placeholder="https://example.com/webhook"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Events to Listen For
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {availableEvents.map((event) => (
                                    <label key={event} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={newWebhook.events.includes(event)}
                                            onChange={() => toggleEvent(event)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">{event}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={createWebhook}
                                disabled={loading || !newWebhook.name.trim() || !newWebhook.url.trim() || newWebhook.events.length === 0}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                Create Webhook
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateWebhook(false)
                                    setNewWebhook({ name: '', url: '', events: [] })
                                }}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Webhooks List */}
                <div className="space-y-3">
                    {webhooks.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No webhooks configured. Create a webhook to receive real-time notifications.</p>
                    ) : (
                        webhooks.map((webhook) => (
                            <div key={webhook.id} className="p-4 border border-gray-200 rounded-md">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-medium text-gray-900">{webhook.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 text-xs rounded-full ${webhook.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {webhook.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                        <button
                                            onClick={() => deleteWebhook(webhook.id)}
                                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                            title="Delete Webhook"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{webhook.url}</p>
                                <div className="flex flex-wrap gap-1">
                                    {webhook.events.map((event) => (
                                        <span key={event} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                            {event}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Created {new Date(webhook.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

export default ApiWebhooks