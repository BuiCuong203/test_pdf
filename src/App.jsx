import React, { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import './App.css';

import BarChartWidget from './components/BarChartWidget';
import AreaChartWidget from './components/AreaChartWidget';
import PieChartWidget from './components/PieChartWidget';
import LineChartWidget from './components/LineChartWidget';
import TableWidget from './components/TableWidget';
import EmailModal from './EmailModal';

const BACKEND_URL = 'http://localhost:8000';

function App() {
  const [exporting, setExporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [exportId, setExportId] = useState(null);

  const dashboardRef = useRef(null);

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;

    try {
      setExporting(true);

      // Capture the dashboard grid
      const dataUrl = await toPng(dashboardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#1e1e24',
      });

      // Send to backend
      const response = await axios.post(`${BACKEND_URL}/api/dashboard/export-pdf`, {
        imageDataUrl: dataUrl
      });

      const { exportId: id } = response.data;
      setExportId(id);

      // Start polling
      const interval = setInterval(async () => {
        try {
          const statusRes = await axios.get(`${BACKEND_URL}/api/dashboard/export-pdf/${id}/status`);
          if (statusRes.data.status === 'ready') {
            clearInterval(interval);
            setExporting(false);
            setShowModal(true);
          } else if (statusRes.data.status === 'failed') {
            clearInterval(interval);
            setExporting(false);
            alert("Failed to generate PDF on the server.");
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 2000);

    } catch (err) {
      console.error('Error exporting PDF:', err);
      setExporting(false);
      alert("Error capturing dashboard.");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setExportId(null);
  };

  const handleDownloadComplete = () => {
    // Backend deletes the file after download, so we must close the preview
    // We use a slight timeout to let the browser initiate the download first
    setTimeout(() => {
      closeModal();
    }, 1000);
  };

  return (
    <div className="dashboard-container">
      <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      <header className="dashboard-header">
        <div>
          <h1>Dashboard of SOCP Department</h1>
          <div className="subtitle">Last update 20:22 22/11/2025 • Nguyễn Văn A</div>
        </div>
        <div className="header-actions">
          <button
            className="export-btn"
            onClick={handleExportPDF}
            disabled={exporting}
          >
            {exporting ? 'Generating PDF...' : 'Export PDF'}
          </button>
          <button className="close-btn" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="filter-bar">
        <button className="filter-btn">+ Generate new filter</button>
        <select className="filter-select"><option>abc1</option></select>
        <select className="filter-select"><option>abc2</option></select>
        <select className="filter-select"><option>abc</option></select>
        <select className="filter-select"><option>abc1a</option></select>
        <select className="filter-select"><option>thang</option></select>
        <select className="filter-select"><option>sadasdddddddddddddddddddd...</option></select>
        <select className="filter-select"><option>sad</option></select>
        <button className="filter-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
          Sync all filter
        </button>
        <button className="filter-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          Remove filters
        </button>
      </div>

      <main className="dashboard-grid" ref={dashboardRef}>
        {/* Row 1 */}
        <BarChartWidget />
        <AreaChartWidget />
        <PieChartWidget />
        <LineChartWidget />
        <TableWidget />

        {/* Row 2 */}
        <AreaChartWidget />
        <BarChartWidget />
        <TableWidget />
        <PieChartWidget />
        <LineChartWidget />

        {/* Row 3 */}
        <LineChartWidget />
        <PieChartWidget />
        <AreaChartWidget />
        <TableWidget />
        <BarChartWidget />

        {/* Row 4 */}
        <TableWidget />
        <LineChartWidget />
        <BarChartWidget />
        <PieChartWidget />
        <AreaChartWidget />
      </main>

      {/* PDF Preview Modal */}
      {showModal && exportId && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>PDF Preview</h2>
              <div className="modal-actions">
                <a
                  href={`${BACKEND_URL}/api/dashboard/export-pdf/${exportId}/download`}
                  className="btn-primary"
                  download
                  onClick={handleDownloadComplete}
                >
                  Download PDF
                </a>
                <button className="btn-primary" style={{ backgroundColor: '#e91e63' }} onClick={() => setShowEmailModal(true)}>Send Email</button>
                <button className="btn-secondary" onClick={closeModal}>Close</button>
              </div>
            </div>
            <div className="modal-body">
              <iframe
                src={`${BACKEND_URL}/api/dashboard/export-pdf/${exportId}/preview`}
                className="pdf-iframe"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Email Modal Overlay */}
      {showEmailModal && (
        <EmailModal
          exportId={exportId}
          onClose={() => setShowEmailModal(false)}
          onEmailSent={closeModal} // Close everything once email is sent and file is deleted
        />
      )}
    </div>
  );
}

export default App;
