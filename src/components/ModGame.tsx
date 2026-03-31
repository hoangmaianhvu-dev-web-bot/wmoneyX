import React, { useState, useEffect } from 'react';
import { Gamepad2, Download, Search, Loader2, ExternalLink, Filter, Plus, Trash2, Edit3, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { useNotification } from '../context/NotificationContext';

interface Mod {
  id: string;
  title: string;
  description: string;
  image_url: string;
  download_url: string;
  download_count?: number;
  source_name?: string;
  category: string;
  version: string;
  created_at: string;
}

interface ModGameProps {
  isAdmin: boolean;
}

const ModGame: React.FC<ModGameProps> = ({ isAdmin }) => {
  const { showNotification } = useNotification();
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Admin state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMod, setEditingMod] = useState<Mod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMod, setNewMod] = useState({
    title: "",
    description: "",
    image_url: "",
    download_url: "",
    source_name: "",
    category: "Tất cả",
    version: "1.0.0"
  });

  useEffect(() => {
    fetchMods();
  }, []);

  const fetchMods = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mods')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMods(data || []);
    } catch (error) {
      console.error('Error fetching mods:', error);
      showNotification({ title: "Lỗi", message: "Không thể tải danh sách Mod.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMod = async (e: React.FormEvent) => {
    e.preventDefault();
    const modData = editingMod ? editingMod : newMod;
    
    if (!modData.title || !modData.download_url) {
      showNotification({ title: "Lỗi", message: "Vui lòng điền đầy đủ thông tin bắt buộc.", type: "error" });
      return;
    }

    if (!isAdmin) {
      showNotification({ title: "Lỗi", message: "Bạn không có quyền thực hiện hành động này.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: modData.title,
        description: modData.description,
        image_url: modData.image_url,
        download_url: modData.download_url,
        source_name: modData.source_name,
        category: modData.category,
        version: modData.version
      };

      if (editingMod) {
        const { error } = await supabase
          .from('mods')
          .update(payload)
          .eq('id', editingMod.id);

        if (error) throw error;
        showNotification({ title: "Thành công", message: "Đã cập nhật bản Mod!", type: "success" });
      } else {
        const { error } = await supabase
          .from('mods')
          .insert([payload]);

        if (error) throw error;
        showNotification({ title: "Thành công", message: "Đã thêm bản Mod mới!", type: "success" });
      }

      setShowAddModal(false);
      setEditingMod(null);
      setNewMod({
        title: "",
        description: "",
        image_url: "",
        download_url: "",
        source_name: "",
        category: "Tất cả",
        version: "1.0.0"
      });
      fetchMods();
    } catch (error: any) {
      console.error('Error saving mod:', error);
      showNotification({ 
        title: "Lỗi", 
        message: error.message || "Không thể lưu Mod. Vui lòng kiểm tra lại kết nối hoặc cấu hình bảng.", 
        type: "error" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMod = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bản Mod này?")) return;

    try {
      const { error } = await supabase
        .from('mods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showNotification({ title: "Thành công", message: "Đã xóa bản Mod.", type: "success" });
      fetchMods();
    } catch (error) {
      console.error('Error deleting mod:', error);
      showNotification({ title: "Lỗi", message: "Không thể xóa Mod.", type: "error" });
    }
  };

  const handleDownload = async (mod: Mod) => {
    try {
      // Increment download count in Supabase
      const { error } = await supabase
        .from('mods')
        .update({ download_count: (mod.download_count || 0) + 1 })
        .eq('id', mod.id);
      
      if (error) console.error('Error incrementing download count:', error);
      
      // Update local state
      setMods(prev => prev.map(m => m.id === mod.id ? { ...m, download_count: (m.download_count || 0) + 1 } : m));
      
      // Open download link
      window.open(mod.download_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Download error:', err);
      // Fallback: just open the link
      window.open(mod.download_url, '_blank', 'noopener,noreferrer');
    }
  };

  const filteredMods = mods.filter(mod => {
    const matchesSearch = mod.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         mod.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black uppercase tracking-[0.2em] ocean-glow flex items-center gap-3">
            <Gamepad2 className="text-accent" /> Mod Game Miễn Phí
          </h2>
          <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Kho ứng dụng và trò chơi đã được MOD</p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform"
          >
            <Plus size={16} /> Thêm Mod Mới
          </button>
        )}
      </div>

      {/* Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm game mod..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-slate-900 focus:border-accent/50 outline-none transition-all"
          />
        </div>
      </div>

      {/* Mod List Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="animate-spin mx-auto text-accent mb-4" size={32} />
          <p className="text-xs text-slate-600 uppercase font-bold tracking-widest">Đang tải kho ứng dụng...</p>
        </div>
      ) : filteredMods.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMods.map((mod) => (
            <motion.div 
              key={mod.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass group relative overflow-hidden rounded-[2.5rem] border-white/10 bg-white/5 hover:bg-accent/5 hover:border-accent/30 transition-all shadow-lg"
            >
              <div className="aspect-video w-full overflow-hidden relative">
                <img 
                  src={mod.image_url || `https://picsum.photos/seed/${mod.id}/800/450`} 
                  alt={mod.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-[8px] font-black text-accent uppercase rounded-full border border-accent/20">
                    MOD GAME
                  </span>
                </div>
                <div className="absolute top-4 right-4 flex gap-2">
                  {isAdmin && (
                    <>
                      <button 
                        onClick={() => {
                          const normalizedMod = {
                            ...mod,
                            title: mod.title || "",
                            description: mod.description || "",
                            image_url: mod.image_url || "",
                            download_url: mod.download_url || "",
                            source_name: mod.source_name || "",
                            category: mod.category || "Tất cả",
                            version: mod.version || "1.0.0"
                          };
                          setEditingMod(normalizedMod);
                          setShowAddModal(true);
                        }}
                        className="p-2 bg-accent/80 backdrop-blur-md text-black rounded-full hover:bg-accent transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteMod(mod.id)}
                        className="p-2 bg-red-500/80 backdrop-blur-md text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight">{mod.title}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-accent font-bold">Phiên bản: {mod.version}</p>
                      {mod.source_name && (
                        <span className="text-[10px] text-slate-500 font-bold">• Nguồn: {mod.source_name}</span>
                      )}
                    </div>
                  </div>
                  <Download className="text-slate-600 group-hover:text-accent transition-colors" size={20} />
                </div>

                <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                  {mod.description || "Bản mod tuyệt vời cho trải nghiệm chơi game mới lạ."}
                </p>

                <div className="pt-2">
                  <button 
                    onClick={() => handleDownload(mod)}
                    className="w-full py-3 bg-white/5 hover:bg-accent hover:text-black rounded-2xl flex items-center justify-center gap-2 transition-all font-black text-[10px] uppercase tracking-[0.2em]"
                  >
                    Tải Về Ngay <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center glass rounded-[3rem]">
          <Gamepad2 className="mx-auto text-slate-400 mb-4" size={48} />
          <p className="text-sm text-slate-600 font-bold uppercase tracking-widest">Không tìm thấy bản mod nào</p>
        </div>
      )}

      {/* Add Mod Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddModal(false);
                setEditingMod(null);
              }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass w-full max-w-md p-8 space-y-6 relative z-10 rounded-[2.5rem] border-accent/20"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black uppercase tracking-widest text-accent">
                  {editingMod ? "Chỉnh Sửa Mod" : "Thêm Mod Mới"}
                </h3>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingMod(null);
                  }} 
                  className="text-slate-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddMod} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Tên Game/App</label>
                  <input 
                    type="text" 
                    required
                    value={(editingMod ? editingMod.title : newMod.title) || ""}
                    onChange={(e) => editingMod 
                      ? setEditingMod({...editingMod, title: e.target.value})
                      : setNewMod({...newMod, title: e.target.value})
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-900 outline-none focus:border-accent/50"
                    placeholder="Ví dụ: Minecraft Mod"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Phiên bản</label>
                    <input 
                      type="text" 
                      value={(editingMod ? editingMod.version : newMod.version) || ""}
                      onChange={(e) => editingMod
                        ? setEditingMod({...editingMod, version: e.target.value})
                        : setNewMod({...newMod, version: e.target.value})
                      }
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-900 outline-none focus:border-accent/50"
                      placeholder="1.0.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Danh mục</label>
                    <select 
                      value={(editingMod ? editingMod.category : newMod.category) || "Tất cả"}
                      onChange={(e) => editingMod
                        ? setEditingMod({...editingMod, category: e.target.value})
                        : setNewMod({...newMod, category: e.target.value})
                      }
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-900 outline-none focus:border-accent/50 appearance-none"
                    >
                      <option value="Tất cả">Tất cả</option>
                      <option value="Game">Game</option>
                      <option value="App">App</option>
                      <option value="Công cụ">Công cụ</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Link Ảnh (URL)</label>
                  <input 
                    type="url" 
                    value={(editingMod ? editingMod.image_url : newMod.image_url) || ""}
                    onChange={(e) => editingMod
                      ? setEditingMod({...editingMod, image_url: e.target.value})
                      : setNewMod({...newMod, image_url: e.target.value})
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-900 outline-none focus:border-accent/50"
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Nguồn Link (Ví dụ: Link4M)</label>
                  <input 
                    type="text" 
                    value={(editingMod ? editingMod.source_name : newMod.source_name) || ""}
                    onChange={(e) => editingMod
                      ? setEditingMod({...editingMod, source_name: e.target.value})
                      : setNewMod({...newMod, source_name: e.target.value})
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-900 outline-none focus:border-accent/50"
                    placeholder="Link4M, Google Drive, Mega..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Link Tải (URL)</label>
                  <input 
                    type="url" 
                    required
                    value={(editingMod ? editingMod.download_url : newMod.download_url) || ""}
                    onChange={(e) => editingMod
                      ? setEditingMod({...editingMod, download_url: e.target.value})
                      : setNewMod({...newMod, download_url: e.target.value})
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-900 outline-none focus:border-accent/50"
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Mô tả</label>
                  <textarea 
                    value={(editingMod ? editingMod.description : newMod.description) || ""}
                    onChange={(e) => editingMod
                      ? setEditingMod({...editingMod, description: e.target.value})
                      : setNewMod({...newMod, description: e.target.value})
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-900 outline-none focus:border-accent/50 h-24 resize-none"
                    placeholder="Mô tả các tính năng mod..."
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-accent text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-[1.02] transition-transform disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : (editingMod ? "Cập Nhật Mod" : "Lưu Bản Mod")}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModGame;
