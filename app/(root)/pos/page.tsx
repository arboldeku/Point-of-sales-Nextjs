'use client'

import { useState } from 'react'
import SalesTab from './tabs/SalesTab'
import SearchTab from './tabs/SearchTab'
import LabelsTab from './tabs/LabelsTab'
import CardmarketTab from './tabs/CardmarketTab'

const TABS = [
  { id: 'sales',      label: '🛒 Ventas',      component: SalesTab },
  { id: 'search',     label: '🔍 Buscador',    component: SearchTab },
  { id: 'labels',     label: '🏷️ Etiquetas',  component: LabelsTab },
  { id: 'cardmarket', label: '📦 Cardmarket',  component: CardmarketTab },
]

export default function POSPage() {
  const [activeTab, setActiveTab] = useState('sales')
  const ActiveComponent = TABS.find(t => t.id === activeTab)!.component

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 bg-gray-900 px-4 pt-3 gap-1 shrink-0">
        <span className="text-purple-400 font-bold mr-4 self-end pb-2">⚡ Prisma POS</span>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-950 text-white border-t border-x border-gray-700'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <div className="flex-1 overflow-hidden">
        <ActiveComponent />
      </div>
    </div>
  )
}
