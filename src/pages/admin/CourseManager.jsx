import React, { useState } from 'react';
import { deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { getPublicPath } from '../../utils';

const CourseManager = ({ courses, folders = [], users, setView, setCurrentCourseId }) => {
    const [assigningCourse, setAssigningCourse] = useState(null);
    const [currentFolderId, setCurrentFolderId] = useState(null); // null = root view
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

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
        
        // 1. Move courses inside this folder back to root (null)
        const coursesInFolder = courses.filter(c => c.folderId === folderId);
        for (const c of coursesInFolder) {
            await updateDoc(doc(db, getPublicPath('courses'), c.id), { folderId: null });
        }
        
        // 2. Delete the folder document
        await deleteDoc(doc(db, getPublicPath('folders'), folderId));
    };

    const moveCourseToFolder = async (courseId, folderId) => {
        await updateDoc(doc(db, getPublicPath('courses'), courseId), { folderId });
    };

    // Filter courses: Show only those in the current folder (or no folder if at root)
    const displayedCourses = courses.filter(c => {
        if (currentFolderId) return c.folderId === currentFolderId;
        return !c.folderId; // Root view shows uncategorized courses
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

    const updateUserTeam = async (userId, newTeam) => {
        try {
            await updateDoc(doc(db, getPublicPath('users'), userId), { team: newTeam });
        } catch (e) {
            alert("Error updating team: " + e.message);
        }
    };

    // --- BULK ASSIGNMENT LOGIC ---
    const assignToTeam = async (team) => {
        if (!window.confirm(`Assign '${assigningCourse.title}' to all ${team.toUpperCase()} team members?`)) return;
        
        // Filter users by team (defaulting 'sales' if team is undefined)
        const targetUsers = users.filter(u => (u.team === team || (!u.team && team === 'sales')) && !u.disabled);
        
        try {
            const promises = targetUsers.map(u => {
                const userRef = doc(db, getPublicPath('users'), u.uid);
                return updateDoc(userRef, { assignedCourses: arrayUnion(assigningCourse.id) });
            });
            await Promise.all(promises);
            alert(`Successfully assigned to ${targetUsers.length} ${team} members.`);
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
                    {/* Only show "New Folder" if we are at the root level */}
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

            {/* Folder Creation Input (Conditional) */}
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

            {/* FOLDERS GRID (Only visible at Root) */}
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
                
                {displayedCourses.map(c => (
                    <div key={c.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center hover:shadow-md transition-shadow">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">{c.title}</h3>
                            <p className="text-slate-500 text-sm font-medium">{c.modules?.length || 0} Modules</p>
                        </div>
                        
                        <div className="flex gap-4 items-center">
                            {/* Move to Folder Dropdown */}
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

                            <button 
                                onClick={() => setAssigningCourse(c)} 
                                className="text-emerald-600 hover:text-emerald-700 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded border border-emerald-100 hover:border-emerald-200 transition-colors"
                            >
                                Assign 👥
                            </button>
                            
                            <button 
                                onClick={() => { setCurrentCourseId(c.id); setView('course'); }} 
                                className="text-slate-500 hover:text-rose-600 font-bold text-sm transition-colors"
                            >
                                Preview
                            </button>
                            
                            <button 
                                onClick={() => { setCurrentCourseId(c.id); setView('courseBuilder'); }} 
                                className="text-rose-600 hover:text-rose-800 font-bold text-sm transition-colors"
                            >
                                Edit
                            </button>
                            
                            <button 
                                onClick={() => deleteCourse(c.id)} 
                                className="text-slate-400 hover:text-red-600 font-bold text-sm transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ASSIGNMENT MODAL */}
            {assigningCourse && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Assign Course</h2>
                                <p className="text-slate-500 text-sm">Assigning: <span className="font-bold text-rose-600">{assigningCourse.title}</span></p>
                            </div>
                            <button onClick={() => setAssigningCourse(null)} className="text-slate-400 hover:text-slate-800 text-2xl">&times;</button>
                        </div>

                        {/* BULK ACTIONS BAR */}
                        <div className="bg-slate-100 p-3 flex justify-end gap-3 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-500 uppercase self-center mr-2">Quick Assign:</span>
                            <button 
                                onClick={() => assignToTeam('sales')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow transition-colors"
                            >
                                All Sales Team
                            </button>
                            <button 
                                onClick={() => assignToTeam('service')}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow transition-colors"
                            >
                                All Service Team
                            </button>
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
                                                    {/* UPDATED: Team is now editable */}
                                                    <select
                                                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border-none cursor-pointer focus:ring-0 ${user.team === 'service' ? 'bg-cyan-100 text-cyan-800' : 'bg-emerald-100 text-emerald-800'}`}
                                                        value={user.team || 'sales'}
                                                        onChange={(e) => updateUserTeam(user.uid, e.target.value)}
                                                    >
                                                        <option value="sales">SALES</option>
                                                        <option value="service">SERVICE</option>
                                                    </select>
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
                                onClick={() => setAssigningCourse(null)} 
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