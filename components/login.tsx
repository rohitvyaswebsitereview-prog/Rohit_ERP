'use client';
import { useState } from 'react';
import {
  ArrowRight,
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { api, Field } from './erp-ui';
export default function Login({
  setup,
  onLogin,
  message,
}: {
  setup: boolean;
  onLogin: (u: any) => void;
  message?: string;
}) {
  const [email, setEmail] = useState(''),
    [name, setName] = useState(''),
    [password, setPassword] = useState(''),
    [show, setShow] = useState(false),
    [remember, setRemember] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(message || ''),
    [help, setHelp] = useState(false);
  return (
    <main className="login-page">
      <div className="login-brand">
        <span className="brand-symbol">
          R<span>↗</span>
        </span>
        <span>Rohit's ERP</span>
      </div>
      <div className="login-layout">
        <section className="login-intro">
          <span className="eyebrow">YOUR BUSINESS. CONNECTED.</span>
          <h1>
            A clear view.
            <br />A confident
            <br />
            <span>next move.</span>
          </h1>
          <p>
            Orders, inventory, finance and exports.
            <br />
            One place to keep business moving.
          </p>
          <div className="login-domains">
            <span>OPERATIONS</span>
            <i />
            <span>FINANCE</span>
            <i />
            <span>CONTROL</span>
          </div>
          <div className="login-year">
            FY 2026–27 <span>Built around your business</span>
          </div>
        </section>
        <section className="login-card">
          <div className="login-icon">
            <LockKeyhole size={23} />
          </div>
          <h2>{setup ? 'Set up your workspace' : 'Welcome back'}</h2>
          <p>
            {setup
              ? 'Create your administrator account to begin.'
              : 'Sign in to continue to your ERP.'}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                const r = await api(setup ? 'setup' : 'login', {
                  email,
                  password,
                  name,
                  remember,
                });
                onLogin(r.user);
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {setup && (
              <Field label="Your name" value={name} onChange={setName} />
            )}
            <Field
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@company.com"
            />
            <div className="password-field">
              <Field
                label="Password"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder={
                  setup ? 'At least 12 characters' : 'Enter your password'
                }
              />
              <button
                type="button"
                aria-label={show ? 'Hide password' : 'Show password'}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {!setup && (
              <div className="login-options">
                <label>
                  <Checkbox
                    checked={remember}
                    onCheckedChange={(v) => setRemember(v === true)}
                  />{' '}
                  Remember me
                </label>
                <button type="button" onClick={() => setHelp(!help)}>
                  Forgot password?
                </button>
              </div>
            )}
            {help && (
              <p className="note">
                Email recovery is not configured for this local installation.
                Ask your administrator for account recovery; setup instructions
                are in the project guide.
              </p>
            )}
            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}
            <Button type="submit" disabled={busy} className="login-submit">
              {busy ? 'Please wait…' : setup ? 'Create workspace' : 'Sign in'}
              <ArrowRight size={18} />
            </Button>
          </form>
          <div className="login-secure">
            <ShieldCheck size={15} />{' '}
            {setup
              ? 'Your password is stored as a secure hash.'
              : 'Secure access to your workspace'}
          </div>
        </section>
      </div>
      <footer className="login-footer">
        <span>Rohit's ERP</span>
        <span>Local workspace · Your data stays on this computer</span>
      </footer>
    </main>
  );
}
