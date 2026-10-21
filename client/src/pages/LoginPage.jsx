import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Shield, ArrowRight, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, switchUser, demoUsers } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dynamically populate default email when demo users load from API
  React.useEffect(() => {
    if (demoUsers && demoUsers.length > 0 && !email) {
      setEmail(demoUsers[0].email);
    }
  }, [demoUsers, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = async (userId) => {
    setLoading(true);
    setError(null);
    try {
      await switchUser(userId);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white shadow-sm mb-3">
          <Layers className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to OpsFlow</h2>
        <p className="mt-1 text-xs text-slate-500">
          Internal operational work management platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xs border border-slate-200 rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Work Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Sign In
            </Button>
          </form>

          {/* Quick Demo Switcher Section */}
          {demoUsers?.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Instant Demo Login (Reviewer Accounts)</span>
              </div>
              <div className="space-y-2">
                {demoUsers.map((u) => {
                  const roleSummary = u.memberships
                    ?.map((m) => `${m.teamName} (${m.role})`)
                    .join(', ');
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleDemoSelect(u.id)}
                      disabled={loading}
                      className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600">
                          {u.name}
                        </p>
                        <p className="text-[11px] text-slate-400">{roleSummary}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
