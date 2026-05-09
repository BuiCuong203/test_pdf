import { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import toast, { Toaster } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import './App.css';

import BarChartWidget from './components/BarChartWidget';
import AreaChartWidget from './components/AreaChartWidget';
import PieChartWidget from './components/PieChartWidget';
import LineChartWidget from './components/LineChartWidget';
import TableWidget from './components/TableWidget';
import EmailModal from './EmailModal';
import EmailProviderManager from './EmailProviderManager';

const BACKEND_URL = 'http://localhost:8000';

function App() {
  const [showModal, setShowModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showProviderManager, setShowProviderManager] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const dashboardRef = useRef(null);

  const handlePreview = async () => {
    if (!dashboardRef.current) return;

    const liveContainer = dashboardRef.current;

    // Tạo clone để không làm nháy màn hình thật
    const clone = liveContainer.cloneNode(true);

    // Copy dữ liệu canvas (Echarts) sang clone
    const originalCanvases = liveContainer.querySelectorAll('canvas');
    const clonedCanvases = clone.querySelectorAll('canvas');
    originalCanvases.forEach((canvas, i) => {
      const destCtx = clonedCanvases[i].getContext('2d');
      destCtx.drawImage(canvas, 0, 0);
    });

    // Copy trạng thái các ô select
    const originalSelects = liveContainer.querySelectorAll('select');
    const clonedSelects = clone.querySelectorAll('select');
    originalSelects.forEach((select, i) => {
      clonedSelects[i].value = select.value;
    });

    // Thêm class is-capturing vào bản clone
    clone.classList.add('is-capturing');

    // Tạo một container ẩn để chứa bản clone
    const offscreen = document.createElement('div');
    offscreen.style.position = 'absolute';
    offscreen.style.top = '-9999px';
    offscreen.style.left = '-9999px';
    offscreen.style.width = `${liveContainer.offsetWidth}px`;
    offscreen.appendChild(clone);
    document.body.appendChild(offscreen);

    try {
      const dataUrl = await toPng(clone, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: 'rgba(0,0,0,0)',
        filter: (node) => {
          if (node.classList && node.classList.contains('no-capture')) {
            return false;
          }
          return true;
        }
      });
      setPreviewImage(dataUrl);
      setShowModal(true);
    } catch (err) {
      console.error("Capture error:", err);
    } finally {
      document.body.removeChild(offscreen);
    }
  };

  const handleDownloadPDF = async () => {
    if (!previewImage) return;

    try {
      setIsDownloading(true);

      const img = new Image();
      img.src = previewImage;
      img.onload = () => {
        // Chia 2 kích thước vật lý của ảnh để ra kích thước trang PDF chuẩn
        const pdfWidth = img.width / 4;
        const pdfHeight = img.height / 4;

        const pdf = new jsPDF({
          orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
          unit: 'px',
          format: [pdfWidth, pdfHeight]
        });

        // Đổ nền cho PDF giống màu popup
        pdf.setFillColor('#1e1e24');
        pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

        pdf.addImage(previewImage, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        pdf.save('dashboard.pdf');
        setIsDownloading(false);
        toast.success("Tải xuống PDF thành công!");
      };

      img.onerror = () => {
        console.error("Error loading image for PDF generation");
        setIsDownloading(false);
        toast.error("Không thể tải ảnh để tạo file PDF");
      };
    } catch (err) {
      console.error("Download error:", err);
      setIsDownloading(false);
      toast.error("Lỗi khi tạo file PDF");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setPreviewImage(null);
  };

  return (
    <div className="dashboard-container">
      <Toaster position="top-right" />
      <div ref={dashboardRef} className="dashboard-capture-wrapper" style={{ width: '100%', height: '100%' }}>
        <header className="dashboard-header">
          <h1>SOCP Dashboard</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="export-btn no-capture" style={{ backgroundColor: '#4b5563' }} onClick={() => setShowProviderManager(true)}>
              ⚙️ Quản lý Email Provider
            </button>
            <button className="export-btn no-capture" onClick={handlePreview}>
              Export PDF
            </button>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="filter-wrapper" style={{ display: 'flex', alignItems: 'flex-start', borderBottom: '1px solid #333' }}>
          <div className={`filter-bar ${isFiltersExpanded ? 'expanded' : ''}`} style={{ flex: 1, minWidth: 0, borderBottom: 'none' }}>
            <button className="filter-btn no-capture">+ Generate new filter</button>
            <select className="filter-select"><option>abc1</option></select>
            <select className="filter-select"><option>abc2</option></select>
            <select className="filter-select"><option>abc</option></select>
            <select className="filter-select"><option>abc1a</option></select>
            <select className="filter-select"><option>thang</option></select>
            <select className="filter-select"><option>sadasdddddddddddddddddddd...</option></select>
            <select className="filter-select"><option>sad</option></select>
            {Array.from({ length: 25 }).map((_, i) => (
              <select key={i} className="filter-select">
                <option>Test Filter {i + 1}</option>
              </select>
            ))}
            <button className="filter-btn no-capture">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
              Sync all filter
            </button>
            <button className="filter-btn no-capture">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              Remove filters
            </button>
          </div>
          <div className="no-capture" style={{ padding: '16px 24px 16px 0' }}>
            <button className="filter-btn" onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}>
              {isFiltersExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        <main className="dashboard-grid">
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
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>PDF Preview</h2>
              <div className="modal-actions">
                <button
                  className="btn-primary"
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                >
                  {isDownloading ? 'Processing...' : 'Download'}
                </button>
                <button className="btn-primary" style={{ backgroundColor: '#e91e63' }} onClick={() => setShowEmailModal(true)}>Send Email</button>
                <button className="btn-secondary" onClick={closeModal}>Close</button>
              </div>
            </div>
            <div className="modal-body">
              {/* Hiển thị ảnh Base64 trực tiếp */}
              <img src={previewImage} alt="Preview" className="preview-img-base64" />
            </div>
          </div>
        </div>
      )}

      {/* Email Modal Overlay */}
      {showEmailModal && (
        <EmailModal
          previewImage={previewImage}
          onClose={() => setShowEmailModal(false)}
          onEmailSent={closeModal} // Close everything once email is sent and file is deleted
        />
      )}

      {/* Provider Manager Overlay */}
      {showProviderManager && (
        <EmailProviderManager onClose={() => setShowProviderManager(false)} />
      )}
    </div>
  );
}

export default App;