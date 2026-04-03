import React, { useState, useEffect } from 'react';
import { Gift, Plus, Trash2, Edit, Loader2, Search } from 'lucide-react';
import { supabase } from '../supabase';

export default function AdminGiftcode() {
  const [giftcodes, setGiftcodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newCode, setNewCode] = useState({
    code: '',
    reward: 100,
    max_uses: 100,
    expires_at: ''
  });

  useEffect(() => {
    fetchGiftcodes();
  }, []);

  const fetchGiftcodes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('giftcodes')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setGiftcodes(data || []);
    } catch (error: any) {
      if (!error.message?.includes('relation "giftcodes" does not exist')) {
        console.error('Error fetching giftcodes:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGiftcode = async () => {
    if (!newCode.code || newCode.reward <= 0 || newCode.max_uses <= 0) {
      alert('Vui lòng điền đầy đủ thông tin hợp lệ');
      return;
    }

    try {
      const { error } = await supabase
        .from('giftcodes')
        .insert({
          code: newCode.code.toUpperCase(),
          reward: newCode.reward,
          max_uses: newCode.max_uses,
          current_uses: 0,
          expires_at: newCode.expires_at ? new Date(newCode.expires_at).toISOString() : null
        });

      if (error) throw error;
      
      setShowAddModal(false);
      setNewCode({ code: '', reward: 100, max_uses: 100, expires_at: '' });
      fetchGiftcodes();
    } catch (error) {
      console.error('Error adding giftcode:', error);
      alert('Có lỗi xảy ra khi thêm mã giftcode');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mã giftcode này?')) return;

    try {
      const { error } = await supabase
        .from('giftcodes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchGiftcodes();
    } catch (error) {
      console.error('Error deleting giftcode:', error);
      alert('Có lỗi xảy ra khi xóa mã giftcode');
    }
  };

  const filteredCodes = giftcodes.filter(gc => 
    gc.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-black uppercase tracking-widest text-accent">Quản lý Giftcode</h3>
          <p className="text-xs text-gray-400 font-bold uppercase">Tổng cộng: {giftcodes.length} mã</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="TÌM KIẾM MÃ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-accent uppercase"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent/90 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={14} />
            Thêm Mã
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : (
        <div className="glass rounded-3xl border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Mã Code</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Phần Thưởng</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Đã Dùng</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Hết Hạn</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCodes.map((gc) => (
                  <tr key={gc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <span className="text-sm font-bold text-white bg-white/10 px-3 py-1 rounded-lg border border-white/10">
                        {gc.code}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold text-accent">+{gc.reward} XU</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden w-24">
                          <div 
                            className="h-full bg-accent rounded-full"
                            style={{ width: `${Math.min(100, (gc.current_uses / gc.max_uses) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400">
                          {gc.current_uses}/{gc.max_uses}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-gray-400">
                        {gc.expires_at ? new Date(gc.expires_at).toLocaleDateString('vi-VN') : 'Vĩnh viễn'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(gc.id)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Xóa mã"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCodes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-500 italic uppercase font-black tracking-widest">
                      Không tìm thấy mã giftcode nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-black uppercase tracking-widest text-white mb-6">Thêm Giftcode Mới</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Mã Code</label>
                <input
                  type="text"
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-accent uppercase"
                  placeholder="VD: TANTHU2024"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Phần Thưởng (XU)</label>
                  <input
                    type="number"
                    value={newCode.reward}
                    onChange={(e) => setNewCode({ ...newCode, reward: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Giới Hạn Nhập</label>
                  <input
                    type="number"
                    value={newCode.max_uses}
                    onChange={(e) => setNewCode({ ...newCode, max_uses: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Ngày Hết Hạn (Tùy chọn)</label>
                <input
                  type="datetime-local"
                  value={newCode.expires_at}
                  onChange={(e) => setNewCode({ ...newCode, expires_at: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleAddGiftcode}
                className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-accent hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
              >
                Tạo Mã
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
