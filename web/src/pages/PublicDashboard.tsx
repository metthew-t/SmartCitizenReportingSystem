import React from 'react';
import { Activity, Map, Trophy, Target, ArrowRight } from 'lucide-react';

export default function PublicDashboard() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      color: 'white',
      fontFamily: "'Inter', sans-serif",
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, marginBottom: 16, background: 'linear-gradient(135deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Adama Transparency Dashboard
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 18, maxWidth: 600, margin: '0 auto' }}>
            See how your city is responding to citizen reports in real-time. We believe in open data, accountability, and rewarding civic engagement.
          </p>
        </div>

        {/* Feature 1: Transparency Map & AI Triage Stats */}
        <div style={{ marginBottom: 60 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Map color="#38bdf8" /> City-Wide Issue Heatmap
          </h2>
          <div style={{ 
            background: 'rgba(30,41,59,0.5)', 
            border: '1px solid rgba(148,163,184,0.1)', 
            borderRadius: 24, 
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            gap: 24
          }}>
            <div style={{ height: 400, background: '#0f172a', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1e293b' }}>
              {/* Placeholder for actual Map integration */}
              <div style={{ textAlign: 'center', color: '#64748b' }}>
                <Map size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <p>Interactive Map Loading...</p>
                <p style={{ fontSize: 12 }}>Showing 142 public reports powered by AI Triage</p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Reports Today', value: '24', icon: Activity, color: '#38bdf8' },
                { label: 'AI Auto-Routed', value: '98%', icon: Target, color: '#10b981' },
                { label: 'Avg Resolution', value: '1.2 Days', icon: Activity, color: '#f59e0b' },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'rgba(15,23,42,0.6)', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <stat.icon color={stat.color} size={24} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 4 }}>{stat.value}</div>
                  <div style={{ color: '#94a3b8', fontSize: 14 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature 2: Gamification & Rewards */}
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Trophy color="#f59e0b" /> Top Civic Contributors
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {[
              { name: 'Abebe B.', points: 1250, level: 'Gold Citizen', reports: 42 },
              { name: 'Chala D.', points: 980, level: 'Silver Citizen', reports: 31 },
              { name: 'Martha T.', points: 850, level: 'Silver Citizen', reports: 28 },
            ].map((user, i) => (
              <div key={user.name} style={{
                background: i === 0 ? 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))' : 'rgba(30,41,59,0.5)',
                border: `1px solid ${i === 0 ? 'rgba(245,158,11,0.3)' : 'rgba(148,163,184,0.1)'}`,
                padding: 24,
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 20
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: i === 0 ? '#f59e0b' : '#334155',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, fontWeight: 800, color: i === 0 ? 'white' : '#94a3b8'
                }}>
                  #{i + 1}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 18, color: 'white' }}>{user.name}</h3>
                  <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#94a3b8' }}>
                    <span style={{ color: i === 0 ? '#fcd34d' : '#94a3b8' }}>{user.level}</span>
                    <span>•</span>
                    <span>{user.points} pts</span>
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
