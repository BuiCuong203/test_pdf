import React, { useState, useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Paperclip, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import './EmailModal.css';

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: '#1e1e24',
    borderColor: state.isFocused ? '#2ab7ff' : '#383a42',
    color: '#f0f0f0',
    minHeight: '40px',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: '#25262c',
    border: '1px solid #383a42'
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? '#333' : '#25262c',
    color: '#f0f0f0',
    '&:active': {
      backgroundColor: '#444'
    }
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: '#333',
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: '#f0f0f0',
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: '#9aa0a6',
    ':hover': {
      backgroundColor: '#e91e63',
      color: 'white',
    },
  }),
  input: (provided) => ({
    ...provided,
    color: '#f0f0f0'
  })
};

const EmailModal = ({ onClose, onEmailSent, previewImage }) => {
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState('');
  const [emails, setEmails] = useState([{ value: 'Sondt@vcs.vn', label: 'Sondt@vcs.vn' }]);
  const [subject, setSubject] = useState('[Báo cáo] Dashboard Q1/2025 - Khu vực HN');
  const [body, setBody] = useState('Gửi anh/chị,\nĐính kèm là báo cáo PDF Dashboard Quý 1 năm 2025 cập nhật mới nhất.\nTrân trọng,');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    axios.get('http://localhost:8000/api/email-providers')
      .then(res => {
        setProviders(res.data);
        if (res.data.length > 0) {
          setProviderId(res.data[0].id);
        }
      })
      .catch(err => console.error("Lỗi tải danh sách provider:", err));
  }, []);

  const handleSend = async () => {
    if (emails.length === 0) {
      toast.error('Vui lòng nhập ít nhất 1 email nhận');
      return;
    }

    if (!providerId) {
      toast.error('Vui lòng cấu hình và chọn Email Provider');
      return;
    }

    if (!previewImage) {
      toast.error('Không tìm thấy ảnh báo cáo để đính kèm');
      return;
    }

    setSending(true);
    const to = emails.map(e => e.value);

    try {
      // 1. Tạo PDF Blob từ previewImage (Base64 URL)
      const generatePdfBlob = (dataUrl) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = dataUrl;
          img.onload = () => {
            // Chia 2 kích thước vật lý của ảnh để ra kích thước trang PDF chuẩn (100% zoom)
            const pdfWidth = img.width / 4;
            const pdfHeight = img.height / 4;
            const pdf = new jsPDF({
              orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
              unit: 'px',
              format: [pdfWidth, pdfHeight]
            });
            pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            resolve(pdf.output('blob'));
          };
          img.onerror = (err) => reject(new Error('Lỗi load ảnh để tạo PDF'));
        });
      };

      const pdfBlob = await generatePdfBlob(previewImage);

      // 2. Tạo FormData
      const formData = new FormData();
      formData.append("providerId", providerId);
      formData.append("to", to.join(","));
      formData.append("subject", subject);
      formData.append("body", body);
      formData.append("pdfBlob", pdfBlob, "Dashboard_Report.pdf");

      // 3. Gửi lên backend FastAPI
      await axios.post('http://localhost:8000/api/dashboard/send-email-with-blob', formData);

      toast.success('Email gửi thành công');
      if (onEmailSent) onEmailSent();
      onClose();
    } catch (e) {
      console.error("Lỗi khi gửi email:", e);
      toast.error('Lỗi khi gửi email: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="email-modal-overlay" onClick={onClose}>
      <div className="email-modal-content" onClick={e => e.stopPropagation()}>
        <div className="email-modal-header">
          <h2>Send Email Report</h2>
          <button className="close-btn" onClick={onClose} style={{ border: 'none' }}>
            <X size={16} />
          </button>
        </div>
        <div className="email-modal-body">
          <div className="form-group">
            <label>Gửi từ (Tài khoản SMTP của bạn)</label>
            <select
              className="form-control"
              value={providerId}
              onChange={e => setProviderId(e.target.value)}
            >
              {providers.length === 0 ? (
                <option value="">Chưa có cấu hình nào...</option>
              ) : (
                providers.map(p => (
                  <option key={p.id} value={p.id}>{p.from_name} ({p.from_address})</option>
                ))
              )}
            </select>
            <div style={{ fontSize: '0.8rem', color: '#9aa0a6', marginTop: '4px' }}>
              (Quản lý bằng nút "Quản lý Email Provider" ở màn hình chính)
            </div>
          </div>

          <div className="form-group">
            <label>Đến (To) <span className="required">*</span></label>
            <CreatableSelect
              isMulti
              styles={customSelectStyles}
              value={emails}
              onChange={setEmails}
              placeholder="Nhập email và ấn Enter..."
            />
          </div>

          <div className="form-group">
            <label>Chủ đề (Subject) <span className="required">*</span></label>
            <input
              type="text"
              className="form-control"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Nội dung (Body)</label>
            <textarea
              className="form-control"
              value={body}
              onChange={e => setBody(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>File đính kèm tự động</label>
            <div style={{ position: 'relative' }}>
              <Paperclip size={16} color="#9aa0a6" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                className="form-control"
                value={`Dashboard_Report.pdf`}
                readOnly
                disabled
                style={{ paddingLeft: '36px', cursor: 'not-allowed', color: '#9aa0a6' }}
              />
            </div>
          </div>
        </div>
        <div className="email-modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={sending}>Hủy</button>
          <button className="btn-danger" onClick={handleSend} disabled={sending}>
            {sending ? 'Đang gửi...' : 'Gửi Email'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;
