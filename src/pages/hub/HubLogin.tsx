import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Shield, LogIn, AlertCircle, Loader2 } from 'lucide-react';

export const HubLogin: React.FC = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [npn, setNpn] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim() || !npn.trim()) {
      setError('All fields are required.');
      return;
    }

    if (attempts >= 5) {
      setError('Too many attempts. Please contact Contracting@teamfym.com for help.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Find agent by first_name + last_name + npn
      // Check agents table first (canonical NPN after migration)
      const { data: agent } = await supabase
        .from('agents')
        .select('id, first_name, last_name, npn')
        .ilike('first_name', firstName.trim())
        .ilike('last_name', lastName.trim())
        .eq('npn', npn.trim())
        .maybeSingle();

      let agentId = agent?.id;

      // Fallback: check agent_intake if no match on agents.npn (pre-backfill agents)
      if (!agentId) {
        const { data: intake } = await supabase
          .from('agent_intake')
          .select('agent_id, npn')
          .eq('npn', npn.trim())
          .maybeSingle();

        if (intake?.agent_id) {
          // Verify name matches via agents table
          const { data: agentCheck } = await supabase
            .from('agents')
            .select('id')
            .eq('id', intake.agent_id)
            .ilike('first_name', firstName.trim())
            .ilike('last_name', lastName.trim())
            .maybeSingle();

          if (agentCheck) {
            agentId = agentCheck.id;
          }
        }
      }

      if (!agentId) {
        setAttempts(prev => prev + 1);
        setError('We couldn\'t find your account. Please check your name and NPN, or contact Contracting@teamfym.com for help.');
        setLoading(false);
        return;
      }

      // Step 2: Find or create hub token for this agent
      const { data: existingToken } = await supabase
        .from('agent_hub_tokens')
        .select('token')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .maybeSingle();

      if (existingToken?.token) {
        navigate(`/hub/${existingToken.token}`);
        return;
      }

      // No token exists — create one
      const agentSlug = [firstName, lastName, npn]
        .map(s => s.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
        .filter(Boolean)
        .join('-');

      const { data: newToken } = await supabase
        .from('agent_hub_tokens')
        .insert({
          agent_id: agentId,
          npn: npn.trim(),
          agent_slug: agentSlug || null,
        })
        .select('token')
        .maybeSingle();

      if (newToken?.token) {
        navigate(`/hub/${newToken.token}`);
      } else {
        setError('Something went wrong. Please try again or contact Contracting@teamfym.com.');
      }
    } catch (err) {
      console.error('[HubLogin] Error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Agent Hub</h1>
          <p className="text-sm text-slate-400 mt-1">FYM Financial — Training & Contracting Portal</p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Sign In</h2>
            <p className="text-sm text-gray-500 mt-0.5">Enter your name and NPN to access your hub.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                autoComplete="given-name"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Smith"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                autoComplete="family-name"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="npn" className="block text-sm font-medium text-gray-700 mb-1">NPN</label>
              <input
                id="npn"
                type="text"
                value={npn}
                onChange={e => setNpn(e.target.value.replace(/\D/g, ''))}
                placeholder="12345678"
                inputMode="numeric"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !firstName.trim() || !lastName.trim() || !npn.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-navy-700 text-white font-semibold text-sm hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
            ) : (
              <><LogIn className="w-4 h-4" /> Sign In</>
            )}
          </button>

          <p className="text-xs text-center text-gray-400">
            Don't know your NPN? Contact{' '}
            <a href="mailto:Contracting@teamfym.com" className="text-navy-600 hover:underline">
              Contracting@teamfym.com
            </a>
          </p>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} FYM Financial. All rights reserved.
        </p>
      </div>
    </div>
  );
};
