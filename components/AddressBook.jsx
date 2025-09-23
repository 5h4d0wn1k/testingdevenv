'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export default function AddressBook() {
    const { getToken } = useAuth();
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        phone: ''
    });

    useEffect(() => {
        fetchAddresses();
    }, []);

    const fetchAddresses = async () => {
        try {
            const token = await getToken();
            const response = await fetch('/api/address', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setAddresses(data.addresses);
            } else {
                setMessage(data.error || 'Failed to load addresses');
            }
        } catch (error) {
            setMessage('Error loading addresses');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const openAddModal = () => {
        setEditingAddress(null);
        setFormData({
            name: '',
            email: '',
            street: '',
            city: '',
            state: '',
            zip: '',
            country: '',
            phone: ''
        });
        setShowModal(true);
    };

    const openEditModal = (address) => {
        setEditingAddress(address);
        setFormData({
            name: address.name,
            email: address.email,
            street: address.street,
            city: address.city,
            state: address.state,
            zip: address.zip,
            country: address.country,
            phone: address.phone
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            const token = await getToken();
            let response;
            if (editingAddress) {
                response = await fetch('/api/address', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ addressId: editingAddress.id, address: formData })
                });
            } else {
                response = await fetch('/api/address', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ address: formData })
                });
            }

            const data = await response.json();
            if (response.ok) {
                if (editingAddress) {
                    setAddresses(addresses.map(addr => addr.id === editingAddress.id ? data.address : addr));
                    setMessage('Address updated successfully');
                } else {
                    setAddresses([...addresses, data.newAddress]);
                    setMessage('Address added successfully');
                }
                setShowModal(false);
            } else {
                setMessage(data.error || 'Failed to save address');
            }
        } catch (error) {
            setMessage('Error saving address');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (addressId) => {
        if (!confirm('Are you sure you want to delete this address?')) return;

        try {
            const token = await getToken();
            const response = await fetch(`/api/address?id=${addressId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setAddresses(addresses.filter(addr => addr.id !== addressId));
                setMessage('Address deleted successfully');
            } else {
                setMessage(data.error || 'Failed to delete address');
            }
        } catch (error) {
            setMessage('Error deleting address');
        }
    };

    if (loading) return <div className="text-center py-8">Loading addresses...</div>;

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Address Book</h2>
                <button
                    onClick={openAddModal}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Add New Address
                </button>
            </div>

            {message && (
                <div className={`p-4 mb-4 rounded ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {addresses.map((address) => (
                    <div key={address.id} className="border rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold text-lg mb-2">{address.name}</h3>
                        <p className="text-gray-600 mb-1">{address.street}</p>
                        <p className="text-gray-600 mb-1">{address.city}, {address.state} {address.zip}</p>
                        <p className="text-gray-600 mb-1">{address.country}</p>
                        <p className="text-gray-600 mb-2">{address.phone}</p>
                        <p className="text-gray-600 text-sm">{address.email}</p>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => openEditModal(address)}
                                className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(address.id)}
                                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {addresses.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No addresses found. Add your first address.
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">
                            {editingAddress ? 'Edit Address' : 'Add New Address'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="Full Name"
                                className="w-full p-2 border rounded"
                                required
                            />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="Email"
                                className="w-full p-2 border rounded"
                                required
                            />
                            <input
                                type="text"
                                name="street"
                                value={formData.street}
                                onChange={handleInputChange}
                                placeholder="Street Address"
                                className="w-full p-2 border rounded"
                                required
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    placeholder="City"
                                    className="p-2 border rounded"
                                    required
                                />
                                <input
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleInputChange}
                                    placeholder="State"
                                    className="p-2 border rounded"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    name="zip"
                                    value={formData.zip}
                                    onChange={handleInputChange}
                                    placeholder="ZIP Code"
                                    className="p-2 border rounded"
                                    required
                                />
                                <input
                                    type="text"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleInputChange}
                                    placeholder="Country"
                                    className="p-2 border rounded"
                                    required
                                />
                            </div>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                placeholder="Phone Number"
                                className="w-full p-2 border rounded"
                                required
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 flex-1"
                                >
                                    {saving ? 'Saving...' : (editingAddress ? 'Update' : 'Add')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}