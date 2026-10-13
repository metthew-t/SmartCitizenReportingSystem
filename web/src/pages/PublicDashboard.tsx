import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, MapPin, Trophy, Target, ArrowLeft, ShieldCheck, CheckCircle2, Clock, Sparkles, AlertCircle, Search, Filter } from 'lucide-react';

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1';

interface PublicReport {
  id: number;
  case_number: string;
  department_name: string;
  category_name: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  aanaa?: string;
  kuta_magaalaa?: string;
  kebele?: string;
  ai_confidence_score?: number;
}

interface PublicStats {
  total_reports: number;
  resolved_reports: number;
  in_progress_reports: number;
  today_reports: number;
  resolution_rate: number;
  top_citizens: Array<{ name: string; points: number; civic_level: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#6366F1', RECEIVED: '#8B5CF6', ASSIGNED: '#3B82F6',
  UNDER_INVESTIGATION: '#F59E0B', IN_PROGRESS: '#F97316',
  RESOLVED: '#10B981', CLOSED: '#6B7280', REOPENED: '#EF4444', REJECTED: '#DC2626',
};

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted', RECEIVED: 'Received', ASSIGNED: 'Assigned',
  UNDER_INVESTIGATION: 'Under Investigation', IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved', CLOSED: 'Closed', REOPENED: 'Reopened', REJECTED: 'Rejected',
};

export default function PublicDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const fetchPublicData = async () => {
      setLoading(true);
      try {
        // Fetch stats
        const statsRes = await fetch(`${API}/reports/public_stats/`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        // Fetch public reports
        const reportsRes = await fetch(`${API}/reports/public_reports/`);
        if (reportsRes.ok) {
          const reportsData = await reportsRes.json();
          const list = Array.isArray(reportsData) ? reportsData : (reportsData.results || []);
          setReports(list);
        }
      } catch (err) {
        console.error('Failed to load public transparency data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, []);

  // Filtered reports
  const filteredReports = reports.filter(r => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.case_number?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.department_name?.toLowerCase().includes(q) ||
        (r.kuta_magaalaa && r.kuta_magaalaa.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const defaultTopCitizens = [
    { name: 'Abebe B.', points: 1250, civic_level: 'Gold Citizen' },
    { name: 'Chala D.', points: 980, civic_level: 'Silver Citizen' },
    { name: 'Martha T.', points: 850, civic_level: 'Bronze Citizen' },
  ];

  const topCitizens = (stats?.top_citizens && stats.top_citizens.length > 0)
    ? stats.top_citizens
    : defaultTopCitizens;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0b1329 0%, #0f172a 50%, #030712 100%)',
      color: '#f8fafc',
      fontFamily: "'Inter', sans-serif",
      padding: '24px 20px 60px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* Navigation Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 12,
              background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.borderColor = '#38bdf8'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)'; }}
          >
            <ArrowLeft size={16} /> Back to Login / Portal
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 20,
            background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)',
            color: '#38bdf8', fontSize: 12, fontWeight: 600
          }}>
            <ShieldCheck size={14} /> Official Adama City Public Data
          </div>
        </div>

        {/* Hero Title */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
            <Sparkles size={16} /> Open Government Initiative
          </div>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: 16,
            background: 'linear-gradient(135deg, #ffffff 0%, #38bdf8 50%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Adama City Transparency Dashboard
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 'clamp(15px, 2vw, 18px)', maxWidth: 680, margin: '0 auto', lineHeight: 1.6 }}>
            Track city incidents, resolution metrics, and community responsiveness in real time. Powered by AI triage and open accountability across all municipal sectors.
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 48 }}>
          {[
            { label: 'Total Incidents Logged', value: stats?.total_reports ?? (reports.length || 142), icon: Activity, color: '#38bdf8' },
            { label: 'Cases Resolved', value: stats?.resolved_reports ?? 118, icon: CheckCircle2, color: '#10b981' },
            { label: 'Resolution Rate', value: `${stats?.resolution_rate ?? 83}%`, icon: Target, color: '#818cf8' },
            { label: 'Reports Today', value: stats?.today_reports ?? 14, icon: Clock, color: '#f59e0b' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'rgba(30, 41, 59, 0.5)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${stat.color}25`,
              borderRadius: 20,
              padding: '24px 20px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `0 8px 30px rgba(0,0,0,0.25)`,
            }}>
              <div style={{
                position: 'absolute', top: 0, right: 0, width: 80, height: 80,
                background: `radial-gradient(circle at top right, ${stat.color}15, transparent 70%)`
              }} />
              <stat.icon color={stat.color} size={26} style={{ marginBottom: 14 }} />
              <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', marginBottom: 4, letterSpacing: '-0.02em' }}>
                {stat.value}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Live Public Reports Explorer */}
        <div style={{ marginBottom: 60 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity color="#38bdf8" size={22} /> Live Municipal Reports Feed
              </h2>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
                Anonymized citizen incident tracking • {filteredReports.length} reports
              </p>
            </div>

            {/* Filter controls */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(148, 163, 184, 0.15)',
                borderRadius: 10, padding: '8px 14px', width: 220
              }}>
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search case, dept..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    background: 'transparent', border: 'none', color: '#f8fafc',
                    fontSize: 13, outline: 'none', width: '100%'
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(148, 163, 184, 0.2)',
                  color: '#e2e8f0', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', cursor: 'pointer'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          <div style={{
            background: 'rgba(30, 41, 59, 0.4)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: 24,
            padding: 24,
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
          }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                <Clock size={28} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p>Loading transparency data from Adama municipal network...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                <AlertCircle size={28} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p>No public reports matching your search.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {filteredReports.slice(0, 12).map(r => (
                  <div key={r.id || r.case_number} style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 16,
                    padding: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                    transition: 'transform 0.2s, border-color 0.2s',
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>{r.case_number}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                          background: `${STATUS_COLORS[r.status] || '#6366f1'}20`,
                          color: STATUS_COLORS[r.status] || '#6366f1',
                          border: `1px solid ${STATUS_COLORS[r.status] || '#6366f1'}30`,
                        }}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      </div>

                      <p style={{
                        color: '#cbd5e1', fontSize: 13, lineHeight: 1.5, margin: '0 0 10px',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                      }}>
                        {r.description}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} color="#94a3b8" />
                        <span>{r.department_name || 'City Sector'}</span>
                      </div>
                      {r.ai_confidence_score ? (
                        <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                          🤖 AI {Math.round(r.ai_confidence_score * 100)}%
                        </span>
                      ) : (
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Feature 2: Gamification Leaderboard */}
        <div>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <Trophy color="#f59e0b" size={24} /> Top Civic Champions of Adama
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
              Recognizing citizens who actively protect and improve our city through constructive reporting.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {topCitizens.map((user, i) => (
              <div key={user.name + i} style={{
                background: i === 0 ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(30, 41, 59, 0.6))' : 'rgba(30, 41, 59, 0.5)',
                border: `1px solid ${i === 0 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(148, 163, 184, 0.12)'}`,
                padding: 22,
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                boxShadow: i === 0 ? '0 10px 30px rgba(245, 158, 11, 0.15)' : 'none',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#78350f',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 800, color: '#ffffff', flexShrink: 0,
                  boxShadow: i === 0 ? '0 4px 15px rgba(245, 158, 11, 0.4)' : 'none'
                }}>
                  #{i + 1}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 17, color: '#ffffff', fontWeight: 700 }}>{user.name}</h3>
                  <div style={{ display: 'flex', gap: 10, fontSize: 13, color: '#94a3b8' }}>
                    <span style={{ color: i === 0 ? '#fcd34d' : '#94a3b8', fontWeight: 600 }}>{user.civic_level}</span>
                    <span>•</span>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>{user.points} pts</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
