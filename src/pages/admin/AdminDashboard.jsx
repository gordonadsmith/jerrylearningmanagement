import React from 'react';

const AdminDashboard = ({ users, courses, responses, onSelectUser }) => {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Team Progress</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.filter(u => !u.disabled).map(user => {
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
                            onClick={() => onSelectUser(user)} // <--- CLICK HANDLER ADDED
                            className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
                        >
                            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg text-indigo-900 underline decoration-dotted">{user.name}</h3>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full font-bold ${pendingCourses.length > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                                    {pendingCourses.length > 0 ? `${pendingCourses.length} Pending` : 'All Done'}
                                </span>
                            </div>
                            <div className="p-4">
                                {pendingCourses.length === 0 ? (
                                    <div className="text-green-600 text-sm font-bold flex items-center gap-2"><span>✓ All caught up!</span></div>
                                ) : (
                                    <ul className="space-y-2">
                                        {pendingCourses.map(c => (
                                            <li key={c.id} className="text-sm flex items-center gap-2 text-gray-700">
                                                <span className="w-2 h-2 rounded-full bg-orange-400"></span>{c.title}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminDashboard;