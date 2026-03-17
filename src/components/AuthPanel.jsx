function AuthPanel({
  authForm,
  authStatusText,
  currentUserLabel,
  busyAction,
  onChange,
  onLogin,
  onRegister,
  onLogout,
}) {
  return (
    <section className="panel auth-panel">
      <div className="section-heading">
        <div>
          <p className="section-heading__eyebrow">Authentication</p>
          <h2>Account Access</h2>
        </div>
        <span className="user-pill">{currentUserLabel}</span>
      </div>

      <div className="auth-grid">
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            value={authForm.email}
            onChange={onChange}
            placeholder="you@example.com"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            value={authForm.password}
            onChange={onChange}
            placeholder="Minimum 6 characters"
          />
        </label>
      </div>

      <div className="action-row">
        <button
          type="button"
          className="btn btn--primary"
          onClick={onLogin}
          disabled={busyAction !== null}
        >
          {busyAction === 'login' ? 'Logging in...' : 'Login'}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onRegister}
          disabled={busyAction !== null}
        >
          {busyAction === 'register' ? 'Registering...' : 'Register'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onLogout}
          disabled={busyAction !== null}
        >
          Logout
        </button>
      </div>

      <p className="helper-text">{authStatusText}</p>
    </section>
  )
}

export default AuthPanel
