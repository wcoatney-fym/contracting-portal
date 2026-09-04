import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { Agent } from '../lib/supabase';

interface SecurityCodeGateProps {
  onSuccess: (agent: Agent) => void;
  formId: string;
}

export const SecurityCodeGate: React.FC<SecurityCodeGateProps> = ({ onSuccess, formId }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Server-side validation via edge function — security_code is validated
      // against the agent_security_codes barrier table (anon-unreadable).
      // The code never leaves the DB until the caller proves they know it.
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-security-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ formId, securityCode: code }),
        },
      );
      const result = await res.json();

      if (!result.valid) {
        if (result.expired) {
          setError('This link has expired. Please contact Contracting@teamfym.com');
        } else {
          setError('Invalid security code. Please try again.');
        }
        setLoading(false);
        return;
      }

      onSuccess(result.agent as Agent);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-navy-600 mr-2" />
          <h2 className="text-2xl font-bold text-navy-600">Enter Security Code</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent text-center text-2xl font-mono tracking-wider"
              maxLength={6}
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-navy-600 text-white py-3 px-4 rounded-md hover:bg-navy-700 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
};
