'use client'
import { useState } from "react"
import TicketList from "@/components/store/support/TicketList"
import TicketForm from "@/components/store/support/TicketForm"
import KnowledgeBase from "@/components/store/support/KnowledgeBase"
import Announcements from "@/components/store/support/Announcements"
import { MessageSquare, BookOpen, Bell } from "lucide-react"

export default function SupportPage() {
    const [activeTab, setActiveTab] = useState('tickets')
    const [showTicketForm, setShowTicketForm] = useState(false)

    const tabs = [
        { id: 'tickets', label: 'Support Tickets', icon: MessageSquare },
        { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
        { id: 'announcements', label: 'Announcements', icon: Bell }
    ]

    return (
        <div className="text-slate-500 mb-28">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl">Store <span className="text-slate-800 font-medium">Support</span></h1>
                {activeTab === 'tickets' && !showTicketForm && (
                    <button
                        onClick={() => setShowTicketForm(true)}
                        className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        Create Ticket
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id)
                                setShowTicketForm(false)
                            }}
                            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === tab.id
                                    ? 'border-slate-800 text-slate-800'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {activeTab === 'tickets' && (
                    <>
                        {showTicketForm ? (
                            <TicketForm onCancel={() => setShowTicketForm(false)} />
                        ) : (
                            <TicketList />
                        )}
                    </>
                )}

                {activeTab === 'knowledge' && <KnowledgeBase />}

                {activeTab === 'announcements' && <Announcements />}
            </div>
        </div>
    )
}