import React, { useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Paperclip, X } from 'lucide-react';
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

const EmailModal = ({ exportId, onClose, onEmailSent }) => {
  const [smtpAccount, setSmtpAccount] = useState('Gmail Công Ty (hainl@vcs.vn)');
  const [emails, setEmails] = useState([{ value: 'Sondt@vcs.vn', label: 'Sondt@vcs.vn' }]);
  const [subject, setSubject] = useState('[Báo cáo] Dashboard Q1/2025 - Khu vực HN');
  const [body, setBody] = useState('Gửi anh/chị,\nĐính kèm là báo cáo PDF Dashboard Quý 1 năm 2025 cập nhật mới nhất.\nTrân trọng,');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (emails.length === 0) {
      toast.error('Vui lòng nhập ít nhất 1 email nhận');
      return;
    }

    setSending(true);
    const to = emails.map(e => e.value);

    try {
      await axios.post(`http://localhost:8000/api/dashboard/export-pdf/${exportId}/send-email`, {
        smtpAccount,
        to,
        subject,
        body
      });
      toast.success('Email gửi thành công');
      if (onEmailSent) onEmailSent();
      onClose();
    } catch (e) {
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
              value={smtpAccount}
              onChange={e => setSmtpAccount(e.target.value)}
            >
              <option>buimanhcuong2510@gmail.com</option>
              <option>Cá nhân (test@gmail.com)</option>
            </select>
            <div style={{ fontSize: '0.8rem', color: '#2ab7ff', marginTop: '4px' }}>
              Quản lý tài khoản tại Setting Page &gt; Email Provider
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
                value={`Dashboard_Report_${exportId ? exportId.substring(0, 8) : ''}.pdf`} 
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
