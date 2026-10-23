import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthShell, Field, CO2 } from './PublicKit';

const DEMO_PASSWORD = 'DemoPass123!';
const DEMO_ACCOUNTS = [
  { role: 'admin', label: 'Use demo admin', email: 'admin@demo.local' },
  { role: 'driver', label: 'Use demo driver', email: 'driver@demo.local' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login({ email, password });
      navigate(data.role === 'admin' ? '/admin' : '/driver', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message;
      const status = err.response?.data?.status;
      if (status === 'pending') {
        setError('Your account is waiting for admin approval. Please check back later.');
      } else if (status === 'rejected') {
        setError('Your registration was rejected. Please contact your fleet administrator.');
      } else {
        setError(msg || 'Could not sign in. Check your connection and credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setError('');
  };

  return (
    <AuthShell sign={<LoginSign />}>
      <h1 className="font-display text-4xl font-bold">Sign in</h1>
      <p className="mt-2 text-sm text-[color:var(--gg-muted)]">Fleet admins and approved drivers use the same sign-in.</p>

      {error && (
        <div className="pub-alert pub-alert-error mt-6" role="alert">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <Field id="login-email" label="Email" type="email" autoComplete="email"
               value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus
               aria-invalid={Boolean(error) || undefined} />
        <Field id="login-password" label="Password" type="password" autoComplete="current-password"
               value={password} onChange={(e) => setPassword(e.target.value)} required
               aria-invalid={Boolean(error) || undefined} />
        <button type="submit" className="pub-btn pub-btn-primary mt-1 w-full" disabled={loading}>
          {loading ? <><Loader className="animate-spin" size={16} /> Signing in…</> : 'Sign in'}
        </button>
      </form>

      <DemoAccounts onPick={fillDemo} />

      <p className="mt-8 text-sm text-[color:var(--gg-muted)]">
        New driver?{' '}
        <Link to="/register" className="font-semibold text-[color:var(--gg-sign)] hover:underline">Register for approval</Link>
      </p>
    </AuthShell>
  );
}

function DemoAccounts({ onPick }) {
  return (
    <div className="mt-6 rounded-[10px] border border-dashed border-[color:var(--gg-line-strong)] p-4">
      <p className="pub-eyebrow">Demo workspace</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <button key={account.role} type="button" onClick={() => onPick(account)} className="pub-btn pub-btn-ghost min-h-[36px] px-3 text-[13px]">
            {account.label}
          </button>
        ))}
      </div>
      <p className="mt-3 font-mono text-xs text-[color:var(--gg-muted)]">
        admin@demo.local · driver@demo.local · {DEMO_PASSWORD}
      </p>
    </div>
  );
}

function LoginSign() {
  return (
    <div>
      <p className="font-display text-3xl leading-tight font-bold sm:text-4xl lg:text-5xl">
        Plan every delivery for time and <CO2 />.
      </p>
      <div className="mt-6 hidden lg:block">
        <div className="pub-sign-row">
          <span className="text-sm text-white/75">Greenest order, 5-stop round</span>
          <span className="font-mono text-2xl font-semibold">−4.9% CO₂</span>
        </div>
        <div className="pub-sign-row">
          <span className="text-sm text-white/75">Extra time for it</span>
          <span className="font-mono text-2xl font-semibold">+4.2 min</span>
        </div>
        <p className="mt-4 text-xs text-white/60">Live Bengaluru run, 6.5 t diesel truck, heaviest drop first.</p>
      </div>
    </div>
  );
}
