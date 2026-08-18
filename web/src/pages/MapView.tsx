import React, { useEffect, useState } from 'react'

interface Feature {
  geometry: { coordinates: [number, number] }
  properties: {
    id: number
    case_number: string
    status: string
    priority: string
    category: string
    department: string
  }
}

// Priority color mapping
const priorityColor: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
}

export default function MapView() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [selected, setSelected] = useState<Feature | null>(null)

  // In production, fetch from /api/v1/analytics/geojson/
  useEffect(() => {
    setFeatures([
      {
        geometry: { coordinates: [39.2743, 8.5400] },
        properties: { id: 1, case_number: 'AD-0001', status: 'IN_PROGRESS', priority: 'HIGH', category: 'Water Leak', department: "Waajjira Bishaan Dhugaatii fi Dhangala'aa" }
      },
      {
        geometry: { coordinates: [39.2800, 8.5350] },
        properties: { id: 2, case_number: 'AD-0002', status: 'SUBMITTED', priority: 'CRITICAL', category: 'Road Damage', department: 'Abbaa Taayitaa Konistiraakshinii' }
      },
      {
        geometry: { coordinates: [39.2700, 8.5450] },
        properties: { id: 3, case_number: 'AD-0003', status: 'RESOLVED', priority: 'LOW', category: 'Waste', department: 'Abbaa Taayitaa Eegumsa Naannoo' }
      },
    ])
  }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">GIS Map – Report Locations</h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Feature List Panel */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-auto max-h-[600px]">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700">Reports on Map</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {features.map((f) => (
              <li
                key={f.properties.id}
                className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${selected?.properties.id === f.properties.id ? 'bg-blue-50' : ''}`}
                onClick={() => setSelected(f)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: priorityColor[f.properties.priority] }}
                  />
                  <span className="text-sm font-medium text-gray-800">{f.properties.case_number}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-5">{f.properties.category}</p>
                <p className="text-xs text-gray-400 ml-5">{f.properties.status}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Map Placeholder + Selected Detail */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-gray-200 rounded-xl h-[440px] flex flex-col items-center justify-center relative border border-gray-300">
            <p className="text-gray-500 text-lg font-semibold">Interactive Map (Leaflet + OpenStreetMap)</p>
            <p className="text-gray-400 text-sm mt-2">Data will be fetched from /api/v1/analytics/geojson/</p>
            {/* Report pins mockup */}
            <div className="absolute inset-0 flex items-center justify-center gap-8">
              {features.map((f) => (
                <button
                  key={f.properties.id}
                  onClick={() => setSelected(f)}
                  className="w-6 h-6 rounded-full border-2 border-white shadow-lg"
                  style={{ background: priorityColor[f.properties.priority] }}
                  title={f.properties.case_number}
                />
              ))}
            </div>
          </div>

          {selected && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-lg font-bold text-gray-900">{selected.properties.case_number}</h3>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div><span className="font-medium text-gray-600">Status: </span>{selected.properties.status}</div>
                <div><span className="font-medium text-gray-600">Priority: </span>
                  <span style={{ color: priorityColor[selected.properties.priority] }}>{selected.properties.priority}</span>
                </div>
                <div><span className="font-medium text-gray-600">Category: </span>{selected.properties.category}</div>
                <div className="col-span-2"><span className="font-medium text-gray-600">Department: </span>{selected.properties.department}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <span className="text-sm font-semibold text-gray-600">Priority Legend:</span>
        {Object.entries(priorityColor).map(([level, color]) => (
          <div key={level} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-sm text-gray-700">{level}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
