import React, { useState } from 'react';
import { deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { getPublicPath } from '../../utils';

const CourseManager = ({ courses, folders = [], users, responses = [], setView, setCurrentCourseId }) => {
    const [assigningCourse, setAssigningCourse] = useState(null);
    const [viewingStats, setViewingStats] = useState(null); // New: Track which course stats to view
    const [currentFolderId, setCurrentFolderId] = useState(null); 
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    
    // Bulk Assignment State
    const [bulkTeamTargets, setBulkTeamTargets] = useState([]);

    // --- DYNAMIC TEAMS LOGIC ---
    const availableTeams = Array.from(new Set([
        'sales', 
        'service', 
        ...users.map(u => u.team).filter(t => t)
    ])).sort();

    // --- HELPER: CHECK COMPLETION ---
    const isCourseComplete = (userId, course) => {
        if (!course.modules || course.modules.length === 0) return false;
        const lastModId = course.modules[course.modules.length - 1].id;
        return responses.some(r => r.userId === userId && r.courseId === course.id && r.moduleId === lastModId);
    };

    // --- HELPER: CALCULATE STATS ---
    const getCourseStats = (course) => {
        const assignedUsers = users.filter(u => u.assignedCourses?.includes(course.id) && !u.disabled);
        const total = assignedUsers.length;
        if (total === 0) return { total: 0, completed: 0, pct: 0 };
        const completed = assignedUsers.filter(u => isCourseComplete(u.uid, course)).length;
        return { total, completed, pct: Math.round((completed / total) * 100) };
    };

    // --- FOLDER LOGIC ---
    const createFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        try {
            await addDoc(collection(db, getPublicPath('folders')), {
                name: newFolderName,
                createdAt: new Date().toISOString()
            });
            setNewFolderName('');
            setIsCreatingFolder(false);
        } catch (e) { alert("Error creating folder: " + e.message); }
    };

    const deleteFolder = async (folderId) => {
        if (!window.confirm("Delete this folder? Courses inside will move to 'Uncategorized'.")) return;
        const coursesInFolder = courses.filter(c => c.folderId === folderId);
        for (const c of coursesInFolder) {
            await updateDoc(doc(db, getPublicPath('courses'), c.id), { folderId: null });
        }
        await deleteDoc(doc(db, getPublicPath('folders'), folderId));
    };

    const moveCourseToFolder = async (courseId, folderId) => {
        await updateDoc(doc(db, getPublicPath('courses'), courseId), { folderId });
    };

    const displayedCourses = courses.filter(c => {
        if (currentFolderId) return c.folderId === currentFolderId;
        return !c.folderId; 
    });

    const currentFolder = folders.find(f => f.id === currentFolderId);

    // --- COURSE LOGIC ---
    const deleteCourse = async (id) => {
        if(!window.confirm("Delete this course permanently?")) return;
        try { await deleteDoc(doc(db, getPublicPath('courses'), id)); } catch(e) { alert(e.message); }
    };

    const toggleAssignment = async (userId, userAssignedCourses, courseId) => {
        const userRef = doc(db, getPublicPath('users'), userId);
        const isAssigned = userAssignedCourses.includes(courseId);
        try {
            if (isAssigned) await updateDoc(userRef, { assignedCourses: arrayRemove(courseId) });
            else await updateDoc(userRef, { assignedCourses: arrayUnion(courseId) });
        } catch (e) { alert("Error updating assignment: " + e.message); }
    };

    // --- BULK ASSIGNMENT LOGIC ---
    const toggleBulkTeam = (team) => {
        setBulkTeamTargets(prev => 
            prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
        );
    };

    const handleBulkAssign = async () => {
        if (bulkTeamTargets.length === 0) return alert("Please select at least one team.");
        
        const teamNames = bulkTeamTargets.map(t => t.toUpperCase()).join(", ");

        if (!window.confirm(`Assign '${assigningCourse.title}' to all members of: ${teamNames}?`)) return;

        const targetUsers = users.filter(u => {
            const userTeam = u.team || 'sales'; 
            return bulkTeamTargets.includes(userTeam) && !u.disabled;
        });
        
        try {
            const promises = targetUsers.map(u => {
                const userRef = doc(db, getPublicPath('users'), u.uid);
                return updateDoc(userRef, { assignedCourses: arrayUnion(assigningCourse.id) });
            });
            await Promise.all(promises);
            alert(`Successfully assigned to ${targetUsers.length} users.`);
            setBulkTeamTargets([]);
        } catch (e) {
            alert("Error assigning to team: " + e.message);
        }
    };

    return (
        <div className="p-8 bg-slate-50 min-h-full">
            {/* Header & Breadcrumbs */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                        {currentFolderId ? (
                            <>
                                <button onClick={() => setCurrentFolderId(null)} className="text-slate-400 hover:text-rose-600 hover:underline transition-colors">Courses</button>
                                <span className="text-slate-300">/</span>
                                <span className="text-slate-900">{currentFolder?.name}</span>
                            </>
                        ) : 'Manage Courses'}
                    </h1>
                </div>
                
                <div className="flex gap-3">
                    {!currentFolderId && (
                        <button 
                            onClick={() => setIsCreatingFolder(true)} 
                            className="bg-white text-slate-600 border border-slate-300 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 hover:text-slate-800 font-bold transition-all"
                        >
                            + New Folder
                        </button>
                    )}
                    <button 
                        onClick={() => { setCurrentCourseId(null); setView('courseBuilder'); }} 
                        className="bg-rose-600 text-white px-6 py-2 rounded-lg shadow-lg shadow-rose-900/20 hover:bg-rose-700 font-bold transition-all"
                    >
                        + Create Course
                    </button>
                </div>
            </div>

            {/* Folder Creation Input */}
            {isCreatingFolder && (
                <form onSubmit={createFolder} className="mb-8 flex gap-2 bg-white p-4 rounded-xl shadow-sm border border-slate-200 w-full max-w-md animate-fade-in-down">
                    <input 
                        autoFocus
                        className="border border-slate-300 p-2 rounded-lg flex-1 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        placeholder="Folder Name"
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                    />
                    <button type="submit" className="bg-emerald-600 text-white px-4 rounded-lg font-bold hover:bg-emerald-700">Save</button>
                    <button type="button" onClick={() => setIsCreatingFolder(false)} className="text-slate-400 font-bold px-3 hover:text-slate-600">&times;</button>
                </form>
            )}

            {/* FOLDERS GRID */}
            {!currentFolderId && folders.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
                    {folders.map(f => (
                        <div key={f.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-rose-300 hover:shadow-md transition-all group relative">
                            <div 
                                onClick={() => setCurrentFolderId(f.id)}
                                className="cursor-pointer flex flex-col items-center justify-center text-center h-24"
                            >
                                <span className="text-4xl mb-2">📁</span>
                                <h3 className="font-bold text-slate-700 group-hover:text-rose-600 transition-colors">{f.name}</h3>
                                <span className="text-xs text-slate-400 font-medium">{courses.filter(c => c.folderId === f.id).length} items</span>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteFolder(f.id); }}
                                className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold p-1"
                                title="Delete Folder"
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* COURSES LIST */}
            <div className="grid gap-4">
                {displayedCourses.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                        <p className="text-slate-400 italic">No courses in this location.</p>
                    </div>
                )}
                
                {displayedCourses.map(c => {
                    const stats = getCourseStats(c);
                    return (
                        <div 
                            key={c.id} 
                            onClick={() => setViewingStats(c)} // Click to view stats
                            className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center hover:shadow-md transition-shadow cursor-pointer"
                        >
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                    {c.title}
                                    {stats.total > 0 && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${stats.pct === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                            {stats.pct}% Done
                                        </span>
                                    )}
                                </h3>
                                
                                <div className="text-slate-500 text-sm font-medium mt-1 flex gap-4">
                                    <span>{c.modules?.length || 0} Modules</span>
                                    {stats.total > 0 && (
                                        <span className="text-slate-400">
                                            {stats.completed} of {stats.total} assigned agents completed
                                        </span>
                                    )}
                                </div>
                                {/* Mini Progress Bar */}
                                {stats.total > 0 && (
                                    <div className="w-48 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                        <div className="h-full bg-rose-500" style={{width: `${stats.pct}%`}}></div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex gap-4 items-center" onClick={(e) => e.stopPropagation()}>
                                <select 
                                    className="text-xs border border-slate-300 rounded p-1.5 text-slate-600 bg-slate-50 max-w-[120px] focus:outline-none focus:border-rose-500"
                                    value={c.folderId || ''}
                                    onChange={(e) => moveCourseToFolder(c.id, e.target.value || null)}
                                    title="Move to Folder"
                                >
                                    <option value="">(No Folder)</option>
                                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>

                                <div className="h-6 w-px bg-slate-200"></div>

                                <button onClick={() => setAssigningCourse(c)} className="text-emerald-600 hover:text-emerald-700 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded border border-emerald-100 hover:border-emerald-200 transition-colors">Assign 👥</button>
                                <button onClick={() => { setCurrentCourseId(c.id); setView('course'); }} className="text-slate-500 hover:text-rose-600 font-bold text-sm transition-colors">Preview</button>
                                <button onClick={() => { setCurrentCourseId(c.id); setView('courseBuilder'); }} className="text-rose-600 hover:text-rose-800 font-bold text-sm transition-colors">Edit</button>
                                <button onClick={() => deleteCourse(c.id)} className="text-slate-400 hover:text-red-600 font-bold text-sm transition-colors">Delete</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* COURSE STATS MODAL (New) */}
            {viewingStats && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{viewingStats.title}</h2>
                                <p className="text-slate-500 text-sm">Course Progress Report</p>
                            </div>
                            <button onClick={() => setViewingStats(null)} className="text-slate-400 hover:text-slate-800 text-2xl">&times;</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Agent</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Team</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.filter(u => u.assignedCourses?.includes(viewingStats.id)).map(user => {
                                        const isComplete = isCourseComplete(user.uid, viewingStats);
                                        return (
                                            <tr key={user.uid} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-bold text-slate-700">{user.name}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${user.team === 'service' ? 'bg-cyan-100 text-cyan-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                        {user.team || 'Sales'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isComplete ? (
                                                        <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                                                            ✓ Complete
                                                        </span>
                                                    ) : (
                                                        <span className="text-amber-600 font-bold text-xs flex items-center gap-1">
                                                            ○ Pending
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {users.filter(u => u.assignedCourses?.includes(viewingStats.id)).length === 0 && (
                                        <tr><td colSpan="3" className="text-center py-4 text-slate-400 italic">No agents assigned to this course.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
                            <button onClick={() => setViewingStats(null)} className="bg-slate-900 text-white px-6 py-2 rounded-lg shadow hover:bg-slate-800 font-bold transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ASSIGNMENT MODAL (Existing) */}
            {assigningCourse && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Assign Course</h2>
                                <p className="text-slate-500 text-sm">Assigning: <span className="font-bold text-rose-600">{assigningCourse.title}</span></p>
                            </div>
                            <button onClick={() => { setAssigningCourse(null); setBulkTeamTargets([]); }} className="text-slate-400 hover:text-slate-800 text-2xl">&times;</button>
                        </div>

                        {/* BULK ACTIONS BAR */}
                        <div className="bg-slate-50 p-4 border-b border-slate-200">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="text-xs font-black text-slate-400 uppercase mr-2">Bulk Assign to Teams:</span>
                                {availableTeams.map(team => (
                                    <label key={team} className={`cursor-pointer px-3 py-1 rounded-full text-xs font-bold border transition-all select-none ${
                                        bulkTeamTargets.includes(team) 
                                        ? 'bg-rose-100 text-rose-800 border-rose-200 shadow-sm' 
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-rose-300'
                                    }`}>
                                        <input 
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={bulkTeamTargets.includes(team)}
                                            onChange={() => toggleBulkTeam(team)}
                                        />
                                        {team.toUpperCase()}
                                    </label>
                                ))}
                            </div>
                            {bulkTeamTargets.length > 0 && (
                                <div className="text-right">
                                    <button 
                                        onClick={handleBulkAssign}
                                        className="bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow hover:bg-rose-700 transition-colors"
                                    >
                                        Assign to Selected Teams ({bulkTeamTargets.length})
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Employee</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Team</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.filter(u => !u.disabled).map(user => {
                                        const isAssigned = user.assignedCourses?.includes(assigningCourse.id);
                                        return (
                                            <tr key={user.uid} className={isAssigned ? 'bg-emerald-50/50' : ''}>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-slate-900">{user.name}</div>
                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                                        {user.team || 'Sales'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isAssigned ? 
                                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-emerald-100 text-emerald-800">Assigned</span> : 
                                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-slate-100 text-slate-600">Not Assigned</span>
                                                    }
                                                </td>
                                                <td className="px-4 py-3">
                                                    <label className="inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            className="form-checkbox h-5 w-5 text-rose-600 rounded border-slate-300 focus:ring-rose-500" 
                                                            checked={!!isAssigned} 
                                                            onChange={() => toggleAssignment(user.uid, user.assignedCourses || [], assigningCourse.id)} 
                                                        />
                                                        <span className="ml-2 text-sm text-slate-700 font-medium">{isAssigned ? 'Revoke' : 'Assign'}</span>
                                                    </label>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
                            <button 
                                onClick={() => { setAssigningCourse(null); setBulkTeamTargets([]); }} 
                                className="bg-slate-900 text-white px-6 py-2 rounded-lg shadow hover:bg-slate-800 font-bold transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseManager;