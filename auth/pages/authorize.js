import { useState } from 'react';
import { useRouter } from 'next/router';

const styles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .container {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 500px;
    padding: 40px;
  }

  .header {
    margin-bottom: 30px;
    text-align: center;
  }

  .header h1 {
    color: #333;
    font-size: 28px;
    margin-bottom: 10px;
  }

  .header p {
    color: #666;
    font-size: 14px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    color: #333;
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 14px;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .button {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  }

  .button:active {
    transform: translateY(0);
  }

  .button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .toggle-link {
    text-align: center;
    margin-top: 20px;
  }

  .toggle-link button {
    background: none;
    border: none;
    color: #667eea;
    cursor: pointer;
    font-size: 14px;
    text-decoration: underline;
  }

  .toggle-link button:hover {
    color: #764ba2;
  }

  .error {
    background-color: #fee;
    color: #c33;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 20px;
    font-size: 14px;
    border: 1px solid #fcc;
  }

  .success {
    background-color: #efe;
    color: #3c3;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 20px;
    font-size: 14px;
    border: 1px solid #cfc;
  }

  .sauna-form {
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .divider {
    margin: 30px 0;
    border-top: 1px solid #eee;
    position: relative;
  }

  .divider-text {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 0 10px;
    color: #999;
    font-size: 13px;
  }

  .loading {
    opacity: 0.6;
  }

  .hidden {
    display: none;
  }
`;

export default function AuthorizePage() {
  const router = useRouter();
  const { client_id, redirect_uri, response_type, state } = router.query;

  // State management
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState('auth'); // 'auth' or 'credentials'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auth form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sauna credentials form
  const [saunaProvider, setSaunaProvider] = useState('Huum');
  const [saunaEmail, setSaunaEmail] = useState('');
  const [saunaPassword, setSaunaPassword] = useState('');

  /**
   * Handle authentication (signup or login)
   */
  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/signin' : '/api/auth/signup';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Authentication failed');
        setLoading(false);
        return;
      }

      // Store user ID temporarily for credentials submission
      sessionStorage.setItem('userId', data.userId);
      setSuccess(
        isLogin ? 'Logged in successfully!' : 'Account created successfully!'
      );

      // Move to credentials form
      setTimeout(() => {
        setStep('credentials');
        setSuccess('');
      }, 500);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle sauna credentials submission
   */
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const userId = sessionStorage.getItem('userId');

      if (!userId) {
        setError('Session lost. Please authenticate again.');
        setStep('auth');
        setLoading(false);
        return;
      }

      // Validate OAuth parameters
      if (!client_id || !redirect_uri) {
        setError('Invalid OAuth parameters');
        setLoading(false);
        return;
      }

      // Call endpoint to store credentials and get auth code
      const response = await fetch('/api/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          clientId: client_id,
          redirectUri: redirect_uri,
          provider: saunaProvider,
          saunaEmail,
          saunaPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to process credentials');
        setLoading(false);
        return;
      }

      // Clear session
      sessionStorage.removeItem('userId');

      // Redirect back to Alexa with authorization code
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.append('code', data.authCode);
      redirectUrl.searchParams.append('state', state || '');

      window.location.href = redirectUrl.toString();
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Credentials error:', err);
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
  };

  const handleBackToAuth = () => {
    sessionStorage.removeItem('userId');
    setStep('auth');
    setError('');
    setSuccess('');
    setSaunaProvider('Huum');
    setSaunaEmail('');
    setSaunaPassword('');
  };

  return (
    <>
      <style>{styles}</style>
      <div className="container">
        {step === 'auth' && (
          <>
            <div className="header">
              <h1>Sauna Control</h1>
              <p>Link your account with Alexa</p>
            </div>

            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

            <form onSubmit={handleAuth}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="you@example.com"
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="button"
                disabled={loading}
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                {loading
                  ? 'Loading...'
                  : isLogin
                  ? 'Sign In'
                  : 'Create Account'}
              </button>
            </form>

            <div className="toggle-link">
              <button type="button" onClick={toggleAuthMode} disabled={loading}>
                {isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </>
        )}

        {step === 'credentials' && (
          <>
            <div className="header">
              <h1>Sauna Credentials</h1>
              <p>Enter your sauna provider credentials</p>
            </div>

            {error && <div className="error">{error}</div>}

            <form onSubmit={handleCredentialsSubmit} className="sauna-form">
              <div className="form-group">
                <label>Sauna Provider</label>
                <select
                  value={saunaProvider}
                  onChange={(e) => setSaunaProvider(e.target.value)}
                  disabled={loading}
                >
                  <option value="Huum">Huum</option>
                </select>
              </div>

              <div className="form-group">
                <label>{saunaProvider} Email</label>
                <input
                  type="email"
                  value={saunaEmail}
                  onChange={(e) => setSaunaEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="your@saunaprovider.com"
                />
              </div>

              <div className="form-group">
                <label>{saunaProvider} Password</label>
                <input
                  type="password"
                  value={saunaPassword}
                  onChange={(e) => setSaunaPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="button"
                disabled={loading}
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Processing...' : 'Link Account'}
              </button>
            </form>

            <div className="toggle-link">
              <button
                type="button"
                onClick={handleBackToAuth}
                disabled={loading}
              >
                Use different account
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
