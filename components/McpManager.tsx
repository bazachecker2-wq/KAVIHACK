
import React, { useState } from 'react';
import { X, Plus, Github, Server, Trash2, Search, ExternalLink } from 'lucide-react';
import { MCPAgent, KawaiiConfig } from '../types';
import { FEATURED_MCP_AGENTS } from '../constants';

interface McpManagerProps {
  config: KawaiiConfig;
  setConfig: React.Dispatch<React.SetStateAction<KawaiiConfig>>;
  onClose: () => void;
}

const McpManager: React.FC<McpManagerProps> = ({ config, setConfig, onClose }) => {
  const [activeTab, setActiveTab] = useState<'installed' | 'discover'>('installed');
  const [customRepo, setCustomRepo] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const toggleAgent = (id: string) => {
    setConfig(prev => ({
      ...prev,
      mcpAgents: prev.mcpAgents.map(a => a.id === id ? { ...a, isEnabled: !a.isEnabled } : a)
    }));
  };

  const removeAgent = (id: string) => {
    setConfig(prev => ({
      ...prev,
      mcpAgents: prev.mcpAgents.filter(a => a.id !== id)
    }));
  };

  const addFeaturedAgent = (agent: any) => {
    if (config.mcpAgents.find(a => a.id === agent.id)) return;
    setConfig(prev => ({
      ...prev,
      mcpAgents: [...prev.mcpAgents, { ...agent, isEnabled: true }]
    }));
  };

  const addCustomAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRepo) return;
    
    // Simulate fetching repo details
    const name = customRepo.split('/').pop() || 'Custom Agent';
    const newAgent: MCPAgent = {
      id: `custom-${Date.now()}`,
      name: name,
      description: 'Custom MCP Agent from GitHub',
      repoUrl: customRepo,
      isEnabled: true,
      isOfficial: false
    };

    setConfig(prev => ({
      ...prev,
      mcpAgents: [...prev.mcpAgents, newAgent]
    }));
    setCustomRepo('');
    setIsAdding(false);
  };

  const searchGithub = () => {
     window.open('https://github.com/search?q=topic%3Amcp-server+OR+topic%3Amodel-context-protocol', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${config.mode === 'ssh' ? 'bg-gray-900 border border-green-500 text-green-500' : 'text-gray-800'}`}>
        
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${config.mode === 'ssh' ? 'border-green-800 bg-gray-950' : 'border-gray-100 bg-gray-50'}`}>
          <div className="flex items-center gap-2">
            <Server size={20} className={config.mode === 'ssh' ? 'text-green-500' : 'text-purple-500'} />
            <h2 className="font-bold text-lg">MCP Agents Manager</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button 
            onClick={() => setActiveTab('installed')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'installed' ? (config.mode === 'ssh' ? 'border-b-2 border-green-500 bg-green-900/20' : 'border-b-2 border-purple-500 bg-purple-50 text-purple-600') : 'opacity-60 hover:bg-gray-50'}`}
          >
            Installed Agents ({config.mcpAgents.length})
          </button>
          <button 
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'discover' ? (config.mode === 'ssh' ? 'border-b-2 border-green-500 bg-green-900/20' : 'border-b-2 border-purple-500 bg-purple-50 text-purple-600') : 'opacity-60 hover:bg-gray-50'}`}
          >
            Discover
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-opacity-50">
          
          {activeTab === 'installed' && (
            <div className="space-y-3">
              {config.mcpAgents.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                  <Server size={48} className="mx-auto mb-3 opacity-20" />
                  <p>No agents installed.</p>
                  <button onClick={() => setActiveTab('discover')} className="text-blue-500 hover:underline text-sm mt-2">Find agents to add</button>
                </div>
              ) : (
                config.mcpAgents.map(agent => (
                  <div key={agent.id} className={`flex items-center justify-between p-3 rounded-xl border ${config.mode === 'ssh' ? 'border-green-900 bg-black' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${agent.isEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        <Server size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-sm flex items-center gap-2">
                          {agent.name}
                          {agent.isOfficial && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded-full">Official</span>}
                        </div>
                        <div className="text-xs opacity-60 max-w-[250px] truncate">{agent.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleAgent(agent.id)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${agent.isEnabled ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}
                      >
                        {agent.isEnabled ? 'ON' : 'OFF'}
                      </button>
                      <button onClick={() => removeAgent(agent.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}

              <div className="pt-4 border-t border-gray-100 mt-4">
                 {!isAdding ? (
                   <button onClick={() => setIsAdding(true)} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-purple-300 hover:text-purple-500 transition-all flex items-center justify-center gap-2">
                     <Plus size={18} /> Add Custom Repo
                   </button>
                 ) : (
                   <form onSubmit={addCustomAgent} className="flex gap-2">
                     <input 
                       autoFocus
                       type="text" 
                       placeholder="https://github.com/user/repo" 
                       className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                       value={customRepo}
                       onChange={(e) => setCustomRepo(e.target.value)}
                     />
                     <button type="submit" className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold">Add</button>
                     <button type="button" onClick={() => setIsAdding(false)} className="bg-gray-200 text-gray-600 px-3 py-2 rounded-lg"><X size={18} /></button>
                   </form>
                 )}
              </div>
            </div>
          )}

          {activeTab === 'discover' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl flex items-center gap-4 ${config.mode === 'ssh' ? 'bg-green-900/20' : 'bg-blue-50'}`}>
                <div className="bg-white p-2 rounded-full shadow-sm"><Github size={24} className="text-black" /></div>
                <div className="flex-1">
                   <h3 className="font-bold text-sm">Explore Community Agents</h3>
                   <p className="text-xs opacity-70">Search GitHub for open-source MCP servers</p>
                </div>
                <button onClick={searchGithub} className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors">
                  <Search size={14} /> Search GitHub
                </button>
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider opacity-50 mt-4">Featured Agents</h3>
              <div className="grid gap-3">
                {FEATURED_MCP_AGENTS.map(agent => {
                   const isInstalled = config.mcpAgents.some(a => a.id === agent.id);
                   return (
                     <div key={agent.id} className={`p-3 rounded-xl border flex items-center justify-between hover:shadow-md transition-all ${config.mode === 'ssh' ? 'border-green-900' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                             {agent.name.substring(0, 2).toUpperCase()}
                           </div>
                           <div>
                             <div className="font-bold text-sm">{agent.name}</div>
                             <div className="text-xs opacity-60">{agent.description}</div>
                           </div>
                        </div>
                        <button 
                          onClick={() => addFeaturedAgent(agent)}
                          disabled={isInstalled}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${isInstalled ? 'bg-green-100 text-green-600' : 'bg-black text-white hover:bg-gray-800'}`}
                        >
                          {isInstalled ? 'Installed' : <><Plus size={12} /> Install</>}
                        </button>
                     </div>
                   );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default McpManager;
