'use client'
import { useState } from "react"
import { Search, BookOpen, ChevronRight, FileText } from "lucide-react"

export default function KnowledgeBase() {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('all')

    // Dummy knowledge base data
    const categories = [
        { id: 'all', name: 'All Articles', count: 24 },
        { id: 'policies', name: 'Policies', count: 8 },
        { id: 'best-practices', name: 'Best Practices', count: 6 },
        { id: 'troubleshooting', name: 'Troubleshooting', count: 10 }
    ]

    const articles = [
        {
            id: 1,
            title: 'How to set up your store profile',
            category: 'best-practices',
            categoryName: 'Best Practices',
            summary: 'Complete guide to configuring your store profile for maximum visibility and customer trust.',
            readTime: '5 min read',
            lastUpdated: '2024-09-15'
        },
        {
            id: 2,
            title: 'Refund policy and procedures',
            category: 'policies',
            categoryName: 'Policies',
            summary: 'Understanding our refund policy and how to process refunds for your customers.',
            readTime: '3 min read',
            lastUpdated: '2024-09-10'
        },
        {
            id: 3,
            title: 'Order fulfillment best practices',
            category: 'best-practices',
            categoryName: 'Best Practices',
            summary: 'Tips and strategies for efficient order processing and timely delivery.',
            readTime: '7 min read',
            lastUpdated: '2024-09-12'
        },
        {
            id: 4,
            title: 'Troubleshooting payment issues',
            category: 'troubleshooting',
            categoryName: 'Troubleshooting',
            summary: 'Common payment problems and how to resolve them quickly.',
            readTime: '4 min read',
            lastUpdated: '2024-09-08'
        },
        {
            id: 5,
            title: 'Product listing guidelines',
            category: 'policies',
            categoryName: 'Policies',
            summary: 'Requirements and best practices for creating effective product listings.',
            readTime: '6 min read',
            lastUpdated: '2024-09-14'
        },
        {
            id: 6,
            title: 'Shipping and delivery policies',
            category: 'policies',
            categoryName: 'Policies',
            summary: 'Complete overview of shipping options, rates, and delivery expectations.',
            readTime: '5 min read',
            lastUpdated: '2024-09-11'
        },
        {
            id: 7,
            title: 'Handling customer complaints',
            category: 'best-practices',
            categoryName: 'Best Practices',
            summary: 'Strategies for effectively managing and resolving customer complaints.',
            readTime: '8 min read',
            lastUpdated: '2024-09-13'
        },
        {
            id: 8,
            title: 'Inventory management tips',
            category: 'best-practices',
            categoryName: 'Best Practices',
            summary: 'Best practices for maintaining accurate inventory and avoiding stockouts.',
            readTime: '6 min read',
            lastUpdated: '2024-09-09'
        }
    ]

    const filteredArticles = articles.filter(article => {
        const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             article.summary.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    return (
        <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search articles..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <div className="md:w-64">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {categories.map(category => (
                                <option key={category.id} value={category.id}>
                                    {category.name} ({category.count})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Categories Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.slice(1).map(category => (
                    <div
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`bg-white p-4 rounded-lg shadow border cursor-pointer transition-colors ${
                            selectedCategory === category.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <BookOpen size={24} className="text-blue-600" />
                            <div>
                                <h3 className="font-medium text-gray-900">{category.name}</h3>
                                <p className="text-sm text-gray-600">{category.count} articles</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Articles List */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <FileText size={20} />
                        Knowledge Base Articles
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found
                    </p>
                </div>

                {filteredArticles.length === 0 ? (
                    <div className="text-center py-12">
                        <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">No articles found matching your search</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredArticles.map((article) => (
                            <div key={article.id} className="p-6 hover:bg-gray-50 transition-colors cursor-pointer">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors">
                                                {article.title}
                                            </h4>
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                                {article.categoryName}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 mb-3">{article.summary}</p>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span>{article.readTime}</span>
                                            <span>Updated {article.lastUpdated}</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-400 mt-1" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Popular Articles */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Most Viewed Articles</h3>
                <div className="space-y-3">
                    {articles.slice(0, 5).map((article, index) => (
                        <div key={article.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                                {index + 1}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                                    {article.title}
                                </h4>
                                <p className="text-sm text-gray-600">{article.categoryName}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}