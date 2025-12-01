import React, { useState } from 'react';

const AdminDashboard = ({ users, courses, responses, onSelectUser }) => {
    const [selectedTeam, setSelectedTeam] = useState('all');

    // Get unique teams from the user list
    const availableTeams = Array.from(new Set([
        ...users.map(u => u.team).filter(t => t)
    ])).sort();

    // Filter users based on selection
    const filteredUsers = users.filter(u => 
        !u.disabled && (selectedTeam === 'all' || u.team === selectedTeam)
    );

    return (
        <div className="p-8 bg-slate-50 min-h-full">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-extrabold text-slate-900">Team Progress</h1>
                
                {/* Team Filter Dropdown */}
                <select
                    className="border border-slate-300 p-2 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-600 uppercase text-sm tracking-wide"
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                >
                    <option value="all">All Teams</option>
                    {availableTeams.map(team => (
                        <option key={team} value={team}>{team.toUpperCase()} TEAM</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map(user => {
                    const assignedIds = user.assignedCourses || [];
                    const userResponses = responses.filter(r => r.userId === user.uid);
                    
                    const pendingCourses = courses.filter(c => {
                        if (!assignedIds.includes(c.id)) return false;
                        if (!c.modules || c.modules.length === 0) return false;
                        const lastModId = c.modules[c.modules.length - 1].id;
                        const hasFinished = userResponses.some(r => r.moduleId === lastModId && r.courseId === c.id);
                        return !hasFinished;
                    });

                    return (
                        <div 
                            key={user.uid} 
                            onClick={() => onSelectUser(user)} 
                            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-lg hover:border-rose-200 transition-all group"
                        >
                            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center group-hover:bg-rose-50 transition-colors">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-rose-700 transition-colors">{user.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${user.team === 'service' ? 'bg-cyan-100 text-cyan-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                            {user.team || 'Sales'}
                                        </span>
                                        <p className="text-xs text-slate-500">{user.email}</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full font-bold ${pendingCourses.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                    {pendingCourses.length > 0 ? `${pendingCourses.length} Pending` : 'All Done'}
                                </span>
                            </div>
                            <div className="p-4">
                                {pendingCourses.length === 0 ? (
                                    <div className="text-emerald-600 text-sm font-bold flex items-center gap-2"><span>✓ All caught up!</span></div>
                                ) : (
                                    <ul className="space-y-2">
                                        {pendingCourses.map(c => (
                                            <li key={c.id} className="text-sm flex items-center gap-2 text-slate-600">
                                                <span className="w-2 h-2 rounded-full bg-rose-400"></span>{c.title}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {filteredUsers.length === 0 && (
                    <p className="text-slate-400 col-span-full text-center py-10 italic">No active agents found in this team.</p>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;