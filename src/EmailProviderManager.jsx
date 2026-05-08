import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { X, Plus, Edit2, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import './EmailModal.css';

const API_BASE = 'http://localhost:8000/api/email-providers';

const EmailProviderManager = ({ onClose }) => {
  const [providers, setProviders] = useState([]);
  const [editingProvider, setEditingProvider] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    host: '127.0.0.1',
    port: 1025,
    username: '',
    password: '',
    from_address: '',
    from_name: ''
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_BASE);
      setProviders(res.data);
    } catch (e) {
      toast.error('Lỗi khi tải danh sách provider');
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingProvider(null);
    setFormData({
      host: '127.0.0.1',
      port: 1025,
      username: '',
      password: '',
      from_address: '',
      from_name: ''
    });
    setIsFormOpen(true);
  };

  const openEditForm = (provider) => {
    setEditingProvider(provider);
    setFormData({ ...provider });
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa provider này?')) return;
    try {
      await axios.delete(`${API_BASE}/${id}`);
      toast.success('Xóa thành công');
      fetchProviders();
    } catch (e) {
      toast.error('Xóa thất bại');
    }
  };

  const handleTestConnection = async () => {
    if (!formData.host || !formData.port) {
      toast.error("Vui lòng nhập đủ Host và Port");
      return;
    }
    setTesting(true);
    try {
      await axios.post(`${API_BASE}/test-connection`, formData);
      toast.success('Kết nối thành công!');
    } catch (e) {
      toast.error(`Kết nối thất bại: ${e.response?.data?.detail || e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.host || !formData.port || !formData.from_address || !formData.from_name) {
      toast.error("Vui lòng nhập đủ thông tin bắt buộc");
      return;
    }
    try {
      if (editingProvider) {
        await axios.put(`${API_BASE}/${editingProvider.id}`, formData);
        toast.success('Cập nhật thành công');
      } else {
        await axios.post(API_BASE, formData);
        toast.success('Thêm mới thành công');
      }
      setIsFormOpen(false);
      fetchProviders();
    } catch (e) {
      toast.error('Lưu thất bại');
    }
  };

  return (
    <div className="email-modal-overlay" onClick={onClose}>
      <div className="email-modal-content" style={{ width: '800px', maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
        <div className="email-modal-header">
          <h2>Quản lý Email Provider</h2>
          <button className="close-btn" onClick={onClose} style={{ border: 'none' }}>
            <X size={16} />
          </button>
        </div>

        <div className="email-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {!isFormOpen ? (
            <>
              <button className="btn-primary" onClick={openAddForm} style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} /> Thêm Provider mới
              </button>
              
              {loading ? (
                <p>Đang tải...</p>
              ) : providers.length === 0 ? (
                <p>Chưa có cấu hình nào.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#f0f0f0' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                      <th style={{ padding: '12px 8px' }}>Tên gửi (From)</th>
                      <th style={{ padding: '12px 8px' }}>Email (Address)</th>
                      <th style={{ padding: '12px 8px' }}>Host</th>
                      <th style={{ padding: '12px 8px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #333' }}>
                        <td style={{ padding: '12px 8px' }}>{p.from_name}</td>
                        <td style={{ padding: '12px 8px' }}>{p.from_address}</td>
                        <td style={{ padding: '12px 8px' }}>{p.host}:{p.port}</td>
                        <td style={{ padding: '12px 8px', display: 'flex', gap: '16px' }}>
                          <button onClick={() => openEditForm(p)} style={{ background: 'transparent', border: 'none', color: '#2ab7ff', cursor: 'pointer' }}><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(p.id)} style={{ background: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <div className="provider-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Host <span className="required">*</span></label>
                  <input type="text" className="form-control" value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})} placeholder="e.g. smtp.gmail.com" />
                </div>
                <div className="form-group">
                  <label>Port <span className="required">*</span></label>
                  <input type="number" className="form-control" value={formData.port} onChange={e => setFormData({...formData, port: parseInt(e.target.value) || ''})} placeholder="e.g. 587 or 1025" />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input type="text" className="form-control" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="Tùy chọn (nếu cần auth)" />
                </div>
                <div className="form-group">
                  <label>App Password</label>
                  <input type="password" className="form-control" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Tùy chọn (nếu cần auth)" />
                </div>
                <div className="form-group">
                  <label>Tên người gửi (From Name) <span className="required">*</span></label>
                  <input type="text" className="form-control" value={formData.from_name} onChange={e => setFormData({...formData, from_name: e.target.value})} placeholder="e.g. Admin System" />
                </div>
                <div className="form-group">
                  <label>Email gửi (From Address) <span className="required">*</span></label>
                  <input type="email" className="form-control" value={formData.from_address} onChange={e => setFormData({...formData, from_address: e.target.value})} placeholder="e.g. admin@example.com" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button className="btn-secondary" onClick={() => setIsFormOpen(false)}>Quay lại</button>
                <button className="btn-secondary" style={{ backgroundColor: '#ff9800', color: '#fff', border: 'none' }} onClick={handleTestConnection} disabled={testing}>
                  {testing ? 'Đang test...' : 'Test Connect'}
                </button>
                <button className="btn-primary" onClick={handleSave}>Lưu Cấu Hình</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailProviderManager;
