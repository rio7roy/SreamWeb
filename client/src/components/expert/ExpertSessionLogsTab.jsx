import React from 'react';

const ACTIVITY_LOG = [
  { task: 'Stock Verification', time: '2 Hours Ago', status: 'Completed', color: 'bg-green-100 text-green-700' },
  { task: 'Attendance Sync', time: 'Yesterday', status: 'Processing', color: 'bg-amber-100 text-amber-700' },
  { task: 'Inventory Update: Microcontrollers', time: '2 Days Ago', status: 'Completed', color: 'bg-green-100 text-green-700' },
  { task: 'Observation Form #302', time: 'Last Week', status: 'Submitted', color: 'bg-blue-100 text-blue-700' },
];

export default function ExpertSessionLogsTab() {
  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header Section */}
      <section className="border-b border-on-surface/10 pb-6">
        <h2 className="text-4xl text-on-surface tracking-wide mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          Session Logs
        </h2>
        <p className="text-secondary" style={{ fontFamily: "'Julius Sans One', sans-serif" }}>
          A complete history of your additions, modifications, and system interactions.
        </p>
      </section>

      {/* Logs Table */}
      <section>
        <div className="bg-white border border-on-surface/10 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low border-b border-on-surface/5">
              <tr>
                <th className="px-8 py-5 text-sm font-bold uppercase tracking-wider text-secondary">Task / Action</th>
                <th className="px-8 py-5 text-sm font-bold uppercase tracking-wider text-secondary">Timestamp</th>
                <th className="px-8 py-5 text-sm font-bold uppercase tracking-wider text-secondary">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-on-surface/5">
              {ACTIVITY_LOG.map((entry, idx) => (
                <tr key={idx} className="hover:bg-surface-bright transition-colors group">
                  <td className="px-8 py-5 font-semibold text-on-surface">{entry.task}</td>
                  <td className="px-8 py-5 text-secondary text-sm font-medium">{entry.time}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 ${entry.color} rounded-full text-[10px] font-bold uppercase tracking-widest`}>
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
