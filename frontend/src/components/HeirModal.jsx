import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';

export default function HeirModal({ onClose, onSuccess }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91');
  const [relationship, setRelationship] = useState('Sister (Primary Nominee)');
  const [permissions, setPermissions] = useState('FULL_TRANSFER');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/heirs', {
        full_name: fullName,
        email,
        phone,
        relationship,
        permissions
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to create heir:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0A140E] border border-[#16291C] rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#16291C] pb-3">
          <h2 className="text-base font-bold text-white">Add Trusted Nominee</h2>
          <button onClick={onClose} className="text-[#5D7765] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[#8A9E91] mb-1 font-mono">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Priya Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#34D399]"
            />
          </div>

          <div>
            <label className="block text-[#8A9E91] mb-1 font-mono">Email Address</label>
            <input
              type="email"
              required
              placeholder="priya@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#34D399]"
            />
          </div>

          <div>
            <label className="block text-[#8A9E91] mb-1 font-mono">WhatsApp Phone (with Country Code)</label>
            <input
              type="text"
              required
              placeholder="+919876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#34D399]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8A9E91] mb-1 font-mono">Relationship</label>
              <input
                type="text"
                required
                placeholder="e.g. Sister"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#34D399]"
              />
            </div>
            <div>
              <label className="block text-[#8A9E91] mb-1 font-mono">Permissions</label>
              <select
                value={permissions}
                onChange={(e) => setPermissions(e.target.value)}
                className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#34D399]"
              >
                <option value="FULL_TRANSFER">Full Transfer</option>
                <option value="READ_ONLY">Read Only</option>
                <option value="MEMORIAL_ONLY">Memorial Only</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#16291C] text-[#8A9E91] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-[#34D399] text-black font-semibold hover:bg-[#2EB885]"
            >
              {loading ? 'Adding...' : 'Add Nominee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
