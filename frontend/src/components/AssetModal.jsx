import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';

export default function AssetModal({ heirs, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Social media');
  const [platform, setPlatform] = useState('');
  const [actionType, setActionType] = useState('Transfer');
  const [description, setDescription] = useState('');
  const [accessInstructions, setAccessInstructions] = useState('');
  const [assignedHeirId, setAssignedHeirId] = useState(heirs[0]?.id || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/assets', {
        name,
        category,
        platform,
        action_type: actionType,
        description,
        access_instructions: accessInstructions,
        assigned_heir_id: assignedHeirId || null
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to create asset:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0A140E] border border-[#16291C] rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#16291C] pb-3">
          <h2 className="text-base font-bold text-white">Add Digital Asset</h2>
          <button onClick={onClose} className="text-[#5D7765] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[#8A9E91] mb-1 font-mono">Asset Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Proton Drive Vault / GitHub Org"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#34D399]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8A9E91] mb-1 font-mono">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#34D399]"
              >
                <option value="Social media">Social media</option>
                <option value="Crypto & finance">Crypto & finance</option>
                <option value="Memories">Memories</option>
                <option value="Cloud storage">Cloud storage</option>
                <option value="Important documents">Important documents</option>
                <option value="Email accounts">Email accounts</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[#8A9E91] mb-1 font-mono">Desired Action</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#34D399]"
              >
                <option value="Transfer">Transfer</option>
                <option value="Archive">Archive</option>
                <option value="Memorialize">Memorialize</option>
                <option value="Delete">Delete</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#8A9E91] mb-1 font-mono">Assigned Nominee</label>
            <select
              value={assignedHeirId}
              onChange={(e) => setAssignedHeirId(e.target.value)}
              className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#34D399]"
            >
              <option value="">Unassigned</option>
              {heirs.map(h => (
                <option key={h.id} value={h.id}>{h.full_name} ({h.relationship})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#8A9E91] mb-1 font-mono">Handover Note</label>
            <input
              type="text"
              placeholder="e.g. Preserve photo archive for family."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#34D399]"
            />
          </div>

          <div>
            <label className="block text-[#8A9E91] mb-1 font-mono">
              Access Directive (Strictly No Plain Passwords)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Recovery keys in bank safe deposit box #41. Linked to Shamir Share 01."
              value={accessInstructions}
              onChange={(e) => setAccessInstructions(e.target.value)}
              className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#34D399]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              {loading ? 'Saving...' : 'Create Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
