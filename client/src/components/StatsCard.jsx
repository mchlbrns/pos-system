import React from 'react';

export default function StatsCard({ title, value, icon, change, isPositive }) {
  return (
    <div className="stats-card glass-effect">
      <div className="card-top">
        <span className="stats-icon">{icon}</span>
        <span className={`stats-change ${isPositive ? 'positive' : 'negative'}`}>
          {change}
        </span>
      </div>
      <div className="card-bottom">
        <h4 className="stats-title">{title}</h4>
        <h2 className="stats-value">{value}</h2>
      </div>
    </div>
  );
}
