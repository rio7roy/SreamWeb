import React from 'react';

export default function FormAnalytics({ form, responses, onBack }) {
  if (!form || !responses) return null;

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-surface-container rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-3xl font-bold font-hanken">{form.title} - Responses</h1>
          <p className="text-secondary">{responses.length} responses collected</p>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="bg-surface-container-low rounded-3xl p-12 text-center border border-outline/10">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl">inbox</span>
          </div>
          <h3 className="text-xl font-bold mb-2">Waiting for responses</h3>
          <p className="text-secondary">This form hasn't received any submissions yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-outline/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline/10">
                  <th className="p-4 font-bold text-sm text-secondary whitespace-nowrap">Submitted At</th>
                  {form.fields.map(field => (
                    <th key={field.id} className="p-4 font-bold text-sm text-secondary min-w-[200px]">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/5">
                {responses.map((response, idx) => (
                  <tr key={response.id || idx} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="p-4 text-sm text-secondary whitespace-nowrap">
                      {new Date(response.submittedAt).toLocaleString()}
                    </td>
                    {form.fields.map(field => {
                      const ans = response.answers[field.id];
                      let displayAns = ans;
                      if (Array.isArray(ans)) {
                        displayAns = ans.join(', ');
                      } else if (ans === undefined || ans === null) {
                        displayAns = <span className="text-secondary/50 italic">No answer</span>;
                      }
                      return (
                        <td key={field.id} className="p-4 text-sm">
                          {displayAns}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
