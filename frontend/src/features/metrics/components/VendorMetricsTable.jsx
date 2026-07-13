import React from 'react';
import '../../../pages/Metrics.css';

const VendorMetricsTable = ({ metrics }) => {
  const isEmpty = !metrics || metrics.length === 0;

  const formatResponseTime = (seconds) => {
    if (seconds === null || seconds === undefined) return 'N/D';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    
    let mins = Math.floor(seconds / 60);
    let secs = Math.round(seconds % 60);
    
    if (secs === 60) {
      mins += 1;
      secs = 0;
    }
    
    if (mins < 60) {
      return `${mins}m ${secs}s`;
    }
    
    let hours = Math.floor(mins / 60);
    mins = mins % 60;
    
    if (hours < 24) {
      return `${hours}h ${mins}m`;
    }
    
    let days = Math.floor(hours / 24);
    hours = hours % 24;
    return `${days}d ${hours}h`;
  };

  const formatPercentage = (rate) => {
    return `${Math.round(rate * 100)}%`;
  };

  return (
    <div className="table-container">
      <table className="metrics-table">
        <thead>
          <tr>
            <th>Asesor</th>
            <th>Chats Atendidos</th>
            <th>Tasa de Resolución</th>
            <th>Tiempo de Respuesta Promedio</th>
            <th>Rendimiento</th>
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td colSpan="5">
                <div className="empty-state">No hay métricas disponibles para este período.</div>
              </td>
            </tr>
          ) : (
            metrics.map((m) => (
              <tr key={m.vendorId}>
                <td>
                  <div className="vendor-name">{m.name}</div>
                  <div className="vendor-email">{m.email}</div>
                </td>
                <td>{m.totalChatsHandled}</td>
                <td>
                  {m.totalChatsHandled === 0 ? (
                    <span className="badge badge-na">
                      N/D
                    </span>
                  ) : (
                    <span className={`badge ${m.resolutionRate >= 0.8 ? 'badge-good' : 'badge-warning'}`}>
                      {formatPercentage(m.resolutionRate)}
                    </span>
                  )}
                </td>
                <td>{formatResponseTime(m.averageResponseTime)}</td>
                <td style={{ width: '12rem' }}>
                  <div className="progress-bar-bg">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${Math.round(m.resolutionRate * 100)}%` }}
                    ></div>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default VendorMetricsTable;
