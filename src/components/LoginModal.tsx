import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginModal: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginFailed(false);
    setIsLoggingIn(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid credentials or unable to connect to database. Please try again.');
        setLoginFailed(true);
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
      setLoginFailed(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-navy-600 mr-2" />
          <h2 className="text-2xl font-bold text-navy-600">Contracting Portal Login</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="space-y-2">
              <div className="text-red-600 text-sm">{error}</div>
              {loginFailed && (
                <a
                  href="mailto:support@teamfym.com?subject=Portal%20Password%20Reset%20Request"
                  className="block text-sm text-navy-600 hover:text-navy-700 hover:underline transition-colors"
                >
                  Forgot password?
                </a>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-navy-600 text-white py-2 px-4 rounded-md hover:bg-navy-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};
