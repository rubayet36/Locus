import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import Library from './pages/Library';
import Paper from './pages/Paper';
import Assignments from './pages/Assignments';
import Profile from './pages/Profile';
import { LayoutDashboard, Search as SearchIcon, Library as LibIcon, Kanban, LogOut, Loader2, Sparkles, Menu, X, User } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [activePage, setActivePage] = useState(() => {
    const savedPage = localStorage.getItem('paperhub_active_page');
    return savedPage && savedPage !== 'null' && savedPage !== 'undefined' ? savedPage : 'dashboard';
  });
  const [activePaperId, setActivePaperId] = useState(() => {
    const savedId = localStorage.getItem('paperhub_active_paper_id');
    return savedId && savedId !== 'null' && savedId !== 'undefined' ? savedId : null;
  });
  const [groupId, setGroupId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  useEffect(() => {
    // Check if recovery link is in URL
    if (window.location.hash.includes('type=recovery') || window.location.href.includes('type=recovery')) {
      setIsRecoveryMode(true);
    }

    // 1. Fetch current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        ensureUserGroup(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
      setSession(session);
      if (session) {
        ensureUserGroup(session.user.id);
      } else {
        setGroupId(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Automatically ensures the user belongs to the shared research group
  const ensureUserGroup = async (userId) => {
    try {
      setLoading(true);
      const sharedInviteCode = 'LOCUS-SHARED';

      // 1. Try to find the shared group
      let { data: sharedGroup, error: findErr } = await supabase
        .from('groups')
        .select('id')
        .eq('invite_code', sharedInviteCode)
        .maybeSingle();

      if (findErr) throw findErr;

      if (!sharedGroup) {
        // Shared group doesn't exist yet (first user). Create it.
        const { data: newGroup, error: createErr } = await supabase
          .from('groups')
          .insert({
            name: 'Locus Scholars',
            invite_code: sharedInviteCode,
            created_by: userId
          })
          .select()
          .single();

        if (createErr) throw createErr;
        sharedGroup = newGroup;
      }

      // 2. Check if user is already a member of this shared group
      const { data: memberships, error: memErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('group_id', sharedGroup.id)
        .eq('user_id', userId);

      if (memErr) throw memErr;

      if (!memberships || memberships.length === 0) {
        // User is not in the shared group. Join them as a member.
        const { error: joinErr } = await supabase
          .from('group_members')
          .insert({
            group_id: sharedGroup.id,
            user_id: userId,
            role: 'member'
          });
        if (joinErr) throw joinErr;
      }

      setGroupId(sharedGroup.id);
    } catch (err) {
      console.error('Error ensuring group membership:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      setAuthError(err.message || 'Failed to send reset link.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    if (newPassword !== confirmPassword) {
      setAuthError("Passwords do not match.");
      setAuthLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordUpdated(true);
      // Clean up recovery flag in URL hash if present
      if (window.location.hash) {
        window.location.hash = '';
      }
    } catch (err) {
      setAuthError(err.message || 'Failed to update password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      setAuthError(err.message || 'Google Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('paperhub_active_page');
    localStorage.removeItem('paperhub_active_paper_id');
    supabase.auth.signOut();
  };

  const navigateToPage = (page, paperId = null) => {
    setActivePage(page);
    localStorage.setItem('paperhub_active_page', page);
    
    setActivePaperId(paperId);
    if (paperId) {
      localStorage.setItem('paperhub_active_paper_id', paperId);
    } else {
      localStorage.removeItem('paperhub_active_paper_id');
    }
  };

  // Render subpage content
  const renderPageContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Loader2 size={36} className="spin" style={{ color: 'var(--accent-gold)' }} />
        </div>
      );
    }

    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard 
            currentUserId={session.user.id} 
            groupId={groupId} 
            onNavigate={navigateToPage} 
          />
        );
      case 'search':
        return (
          <Search 
            currentUserId={session.user.id} 
            groupId={groupId} 
          />
        );
      case 'library':
        return (
          <Library 
            currentUserId={session.user.id} 
            groupId={groupId} 
            onNavigate={navigateToPage} 
          />
        );
      case 'assignments':
        return (
          <Assignments 
            currentUserId={session.user.id} 
            groupId={groupId} 
            onNavigate={navigateToPage} 
          />
        );
      case 'profile':
        return (
          <Profile 
            currentUserId={session.user.id} 
            currentUserEmail={session.user.email}
            groupId={groupId} 
            onNavigate={navigateToPage} 
          />
        );
      case 'paper':
        return (
          <Paper 
            paperId={activePaperId} 
            currentUserId={session.user.id} 
            onNavigate={navigateToPage} 
          />
        );
      default:
        return <div>Page not found.</div>;
    }
  };

  // 1. Auth view if no active session or if in password recovery mode
  if (!session || isRecoveryMode) {
    return (
      <div className="auth-container">
        <div className="card auth-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '32px', color: 'var(--accent-gold)', marginBottom: '8px' }}>
              Locus
            </h1>
            <p className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Collaborative Scholar Network
            </p>
          </div>

          {isRecoveryMode ? (
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '18px', textAlign: 'center', color: 'var(--accent-gold)' }}>Update Password</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.4' }}>
                Enter a strong new password to secure your academic account.
              </p>
              
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">New Password</label>
                <input 
                  type="password" 
                  className="input-field" 
                  required 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Confirm Password</label>
                <input 
                  type="password" 
                  className="input-field" 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {passwordUpdated && (
                <p style={{ color: '#4ade80', fontSize: '14px', textAlign: 'center', lineHeight: '1.4' }}>
                  ✓ Password updated successfully!
                </p>
              )}

              {authError && (
                <p style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center' }}>
                  {authError}
                </p>
              )}

              {passwordUpdated ? (
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ width: '100%' }} 
                  onClick={() => {
                    setIsRecoveryMode(false);
                    setPasswordUpdated(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setAuthError(null);
                  }}
                >
                  Proceed to Portal
                </button>
              ) : (
                <>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={authLoading}>
                    {authLoading ? <Loader2 size={16} className="spin" /> : 'Save Password'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ width: '100%' }} 
                    onClick={() => {
                      setIsRecoveryMode(false);
                      setAuthError(null);
                      supabase.auth.signOut();
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </form>
          ) : isForgotPassword ? (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '18px', textAlign: 'center', color: 'var(--accent-gold)' }}>Reset Password</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.4' }}>
                Enter your registered email address below, and we will send you a secure link to reset your credentials.
              </p>
              
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Email Address</label>
                <input 
                  type="email" 
                  className="input-field" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="researcher@academia.edu"
                />
              </div>

              {resetSent && (
                <p style={{ color: '#4ade80', fontSize: '14px', textAlign: 'center', lineHeight: '1.4' }}>
                  ✓ Reset link sent! Check your inbox for instructions to access your portal.
                </p>
              )}

              {authError && (
                <p style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center' }}>
                  {authError}
                </p>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={authLoading}>
                {authLoading ? <Loader2 size={16} className="spin" /> : 'Send Reset Link'}
              </button>

              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ width: '100%' }} 
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetSent(false);
                  setAuthError(null);
                }}
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Email Address</label>
                <input 
                  type="email" 
                  className="input-field" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="researcher@academia.edu"
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Password</label>
                <input 
                  type="password" 
                  className="input-field" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {!isSignUp && (
                <div style={{ textAlign: 'right', marginTop: '-8px' }}>
                  <button 
                    type="button" 
                    className="btn btn-text" 
                    onClick={() => {
                      setIsForgotPassword(true);
                      setAuthError(null);
                    }}
                    style={{ fontSize: '12px' }}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {authError && (
                <p style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center' }}>
                  {authError}
                </p>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={authLoading}>
                {authLoading ? <Loader2 size={16} className="spin" /> : (isSignUp ? 'Create Scholar Profile' : 'Access Portal')}
              </button>

              {/* Or Divider */}
              <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }}></div>
                <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }}></div>
              </div>

              {/* Google OAuth Button */}
              <button 
                type="button" 
                onClick={handleGoogleSignIn} 
                className="btn btn-secondary" 
                style={{ width: '100%', gap: '10px', background: 'rgba(255,255,255,0.02)', borderColor: 'var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                disabled={authLoading}
              >
                {authLoading ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 18 18" style={{ display: 'block' }}>
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.783 5.482 18 9 18z" fill="#34A853"/>
                      <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.579c1.32 0 2.507.454 3.44 1.347l2.58-2.58C13.463.896 11.426 0 9 0 5.482 0 2.438 2.217.957 5.173L3.964 7.5c.708-2.127 2.692-3.711 5.036-3.711z" fill="#EA4335"/>
                    </svg>
                    <span>Sign In with Google</span>
                  </>
                )}
              </button>
            </form>
          )}

          {!isForgotPassword && !isRecoveryMode && (
            <div style={{ textAlign: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
              <button 
                className="btn btn-text" 
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError(null);
                }}
                style={{ fontSize: '13px' }}
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Full Application View
  return (
    <div className="app-container">
      {/* Mobile Top Header (visible on mobile only) */}
      <div className="mobile-header">
        <button className="menu-toggle-btn" onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}>
          <Menu size={22} style={{ color: 'var(--accent-gold)' }} />
        </button>
        <span className="mobile-logo">Locus</span>
        <div style={{ width: '22px' }}></div> {/* Spacer */}
      </div>
      
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
        {/* Close button for mobile sidebar drawer */}
        <button className="sidebar-close-btn" onClick={() => setIsMobileSidebarOpen(false)}>
          <X size={20} />
        </button>

        <div className="sidebar-logo">
          <Sparkles size={20} /> Locus
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="sidebar-menu">
            <li>
              <button 
                onClick={() => {
                  navigateToPage('dashboard');
                  setIsMobileSidebarOpen(false);
                }}
                className={`btn sidebar-link ${activePage === 'dashboard' ? 'active' : ''}`}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <LayoutDashboard size={16} /> Dashboard
              </button>
            </li>
            <li>
              <button 
                onClick={() => {
                  navigateToPage('search');
                  setIsMobileSidebarOpen(false);
                }}
                className={`btn sidebar-link ${activePage === 'search' ? 'active' : ''}`}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <SearchIcon size={16} /> Paper Search
              </button>
            </li>
            <li>
              <button 
                onClick={() => {
                  navigateToPage('library');
                  setIsMobileSidebarOpen(false);
                }}
                className={`btn sidebar-link ${activePage === 'library' || activePage === 'paper' ? 'active' : ''}`}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <LibIcon size={16} /> Library
              </button>
            </li>
            <li>
              <button 
                onClick={() => {
                  navigateToPage('assignments');
                  setIsMobileSidebarOpen(false);
                }}
                className={`btn sidebar-link ${activePage === 'assignments' ? 'active' : ''}`}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <Kanban size={16} /> Assignments
              </button>
            </li>
            <li>
              <button 
                onClick={() => {
                  navigateToPage('profile');
                  setIsMobileSidebarOpen(false);
                }}
                className={`btn sidebar-link ${activePage === 'profile' ? 'active' : ''}`}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <User size={16} /> Profile
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span>SCHOLAR:</span>
            <span className="user-email" title={session.user.email} style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {session.user.email}
            </span>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={handleSignOut}
            style={{ width: '100%', padding: '10px 0', gap: '8px', fontSize: '11px' }}
          >
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main View Area */}
      <main className="main-content">
        {renderPageContent()}
      </main>

    </div>
  );
}
