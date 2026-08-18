import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function ReportDetails() {
  const { id } = useParams()

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/reports" className="p-2 bg-white rounded-full shadow hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Report Details #{id || '123'}</h2>
      </div>

      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Water Pipe Burst on Main Street</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Submitted on Aug 18, 2026</p>
          </div>
          <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
            In Progress
          </span>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Category</dt>
              <dd className="mt-1 text-sm text-gray-900">Infrastructure</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Department</dt>
              <dd className="mt-1 text-sm text-gray-900">Waajjira Bishaan Dhugaatii fi Dhangala'aa</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900">
                Large water leak near the central roundabout. It has been flowing for 3 hours and is flooding the road.
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Location</dt>
              <dd className="mt-1 text-sm text-gray-900">Lat: 8.5412, Lng: 39.2680</dd>
              {/* Map Placeholder */}
              <div className="mt-2 h-48 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 border border-gray-200">
                Map View Placeholder
              </div>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Attached Media</dt>
              <div className="mt-2 flex space-x-4">
                 <div className="w-32 h-32 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center text-gray-400">Image 1</div>
              </div>
            </div>
          </dl>
        </div>
        <div className="bg-gray-50 px-4 py-4 sm:px-6 border-t border-gray-200 flex justify-end space-x-3">
          <button type="button" className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            Reject
          </button>
          <button type="button" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
            Resolve Issue
          </button>
        </div>
      </div>
    </div>
  )
}
