import React, { useState } from 'react';
import { setDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import { getPublicPath } from '../../utils';

const UserManager = ({ users, courses, responses = [], onSelectUser }) => {
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserTeam, setNewUserTeam] = useState('sales'); 
    const [isAdding, setIsAdding] = useState(false);
    
    // Bulk Assignment State
    const [showBulkAssign, setShowBulkAssign] = useState(false);
    const [bulkCourseId, setBulkCourseId] = useState('');
    const [bulkTeamTargets, setBulkTeamTargets] = useState([]); // Changed to Array for multiple selections

    // --- DYNAMIC TEAMS LOGIC ---
    // 1. Start with default teams
    // 2. Add any unique team names found in the existing user list
    const availableTeams = Array.from(new Set([
        'sales', 
        'service', 
        ...users.map(u => u.team).filter(t => t) // Get existing teams from users
    ])).sort();

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const placeholderId = `invite_${Date.now()}`;
            await setDoc(doc(db, getPublicPath('users'), placeholderId), {
                uid: placeholderId,
                email: newUserEmail.toLowerCase(),
                name: newUserName,
                role: 'employee',
                team: newUserTeam, 
                assignedCourses: [],
                createdAt: new Date().toISOString(),
                isInvite: true
            });
            setNewUserEmail(''); 
            setNewUserName(''); 
            setIsAdding(false);
            alert("Invite Created!");
        } catch (e) { alert("Error: " + e.message); }
    };

    const toggleUserStatus = async (user) => {
        if (!window.confirm(`Confirm: ${user.disabled ? 'Enable' : 'Disable'} ${user.name}?`)) return;
        try { 
            await updateDoc(doc(db, getPublicPath('users'), user.uid), { disabled: !user.disabled }); 
        } catch (e) { alert(e.message); }
    };

    const toggleAdminRole = async (user) => {
        const newRole = user.role === 'admin' ? 'employee' : 'admin';
        const action = newRole === 'admin' ? 'Promote to Admin' : 'Remove Admin access';
        
        if (!window.confirm(`Are you sure you want to ${action} for ${user.name}?`)) return;

        try {
            await updateDoc(doc(db, getPublicPath('users'), user.uid), { role: newRole });
        } catch (e) {
            alert("Error updating role: " + e.message);
        }
    };

    const handleTeamChange = async (userId, value) => {
        let teamToSet = value;
        
        if (value === 'CREATE_NEW') {
            const customName = prompt("Enter the name of the new team:");
            if (customName && customName.trim().length > 0) {
                teamToSet = customName.trim().toLowerCase();
            } else {
                return; // Cancelled
            }
        }

        try {
            await updateDoc(doc(db, getPublicPath('users'), userId), { team: teamToSet });
        } catch (e) {
            alert("Error updating team: " + e.message);
        }
    };

    const handleNewUserTeamChange = (value) => {
        if (value === 'CREATE_NEW') {
            const customName = prompt("Enter the name of the new team:");
            if (customName && customName.trim().length > 0) {
                setNewUserTeam(customName.trim().toLowerCase());
            }
        } else {
            setNewUserTeam(value);
        }
    };

    const removeCourse = async (userId, courseId, currentList = []) => {
        if(!window.confirm("Remove this course assignment?")) return;
        const newList = currentList.filter(id => id !== courseId);
        await updateDoc(doc(db, getPublicPath('users'), userId), { assignedCourses: newList });
    };

    const isCourseComplete = (userId, course) => {
        if (!course.modules || course.modules.length === 0) return false;
        const lastModId = course.modules[course.modules.length - 1].id;
        return responses.some(r => r.userId === userId && r.courseId === course.id && r.moduleId === lastModId);
    };

    // --- BULK ASSIGNMENT LOGIC ---
    const toggleBulkTeam = (team) => {
        setBulkTeamTargets(prev => 
            prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
        );
    };

    const handleBulkAssign = async () => {
        if (!bulkCourseId) return alert("Please select a course.");
        if (bulkTeamTargets.length === 0) return alert("Please select at least one team.");
        
        const targetCourse = courses.find(c => c.id === bulkCourseId);
        const teamNames = bulkTeamTargets.map(t => t.toUpperCase()).join(", ");

        if (!window.confirm(`Assign '${targetCourse.title}' to all members of: ${teamNames}?`)) return;

        // Filter users who are in ANY of the target teams and NOT disabled
        const targetUsers = users.filter(u => {
            const userTeam = u.team || 'sales'; // Default to sales if undefined
            return bulkTeamTargets.includes(userTeam) && !u.disabled;
        });
        
        try {
            const promises = targetUsers.map(u => {
                const userRef = doc(db, getPublicPath('users'), u.uid);
                return updateDoc(userRef, { assignedCourses: arrayUnion(bulkCourseId) });
            });
            await Promise.all(promises);
            alert(`Successfully assigned to ${targetUsers.length} users.`);
            setShowBulkAssign(false);
            setBulkCourseId('');
            setBulkTeamTargets([]);
        } catch (e) {
            alert("Error assigning to team: " + e.message);
        }
    };

    return (
        <div className="p-8 bg-slate-50 min-h-full">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-extrabold text-slate-900">Manage Users</h1>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowBulkAssign(true)} 
                        className="bg-white text-rose-600 border border-rose-200 px-4 py-2 rounded-lg shadow-sm hover:bg-rose-50 font-bold transition-all"
                    >
                        Bulk Assign Course
                    </button>
                    <button 
                        onClick={() => setIsAdding(!isAdding)} 
                        className="bg-emerald-600 text-white px-6 py-2 rounded-lg shadow-lg hover:bg-emerald-700 font-bold transition-colors"
                    >
                        {isAdding ? 'Cancel' : '+ Pre-Register User'}
                    </button>
                </div>
            </div>
            
            {/* BULK ASSIGN MODAL */}
            {showBulkAssign && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Bulk Assign Course</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Course</label>
                                <select 
                                    className="w-full border border-slate-300 p-3 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                    value={bulkCourseId}
                                    onChange={e => setBulkCourseId(e.target.value)}
                                >
                                    <option value="">-- Choose a Course --</option>
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Teams</label>
                                <div className="border border-slate-300 rounded-lg bg-slate-50 p-3 max-h-48 overflow-y-auto space-y-2">
                                    {availableTeams.map(team => (
                                        <label key={team} className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 p-2 rounded transition-colors">
                                            <input 
                                                type="checkbox"
                                                className="form-checkbox h-5 w-5 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                                                checked={bulkTeamTargets.includes(team)}
                                                onChange={() => toggleBulkTeam(team)}
                                            />
                                            <span className="text-sm text-slate-700 font-bold">{team.charAt(0).toUpperCase() + team.slice(1)} Team</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400 mt-1 italic">Select one or more teams to assign this course to.</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowBulkAssign(false)} className="px-4 py-2 text-slate-500 font-bold hover:text-slate-800">Cancel</button>
                            <button onClick={handleBulkAssign} className="bg-rose-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-rose-700 shadow-lg transition-colors">Assign to Selected</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD USER FORM */}
            {isAdding && (
                <form onSubmit={handleAddUser} className="bg-white p-6 rounded-xl mb-6 border border-slate-200 shadow-sm flex gap-4 items-center">
                    <input className="border border-slate-300 p-3 rounded-lg flex-1 focus:ring-2 focus:ring-rose-500 focus:outline-none" placeholder="Email" type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required />
                    <input className="border border-slate-300 p-3 rounded-lg flex-1 focus:ring-2 focus:ring-rose-500 focus:outline-none" placeholder="Full Name" value={newUserName} onChange={e => setNewUserName(e.target.value)} required />
                    
                    {/* DYNAMIC TEAM SELECTOR */}
                    <select 
                        className="border border-slate-300 p-3 rounded-lg w-40 focus:ring-2 focus:ring-rose-500 focus:outline-none bg-slate-50"
                        value={newUserTeam}
                        onChange={e => handleNewUserTeamChange(e.target.value)}
                    >
                        {availableTeams.map(team => (
                            <option key={team} value={team}>{team.charAt(0).toUpperCase() + team.slice(1)}</option>
                        ))}
                        <option value="CREATE_NEW" className="font-bold text-rose-600">+ Add New Team</option>
                    </select>

                    <button type="submit" className="bg-rose-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-rose-700">Save</button>
                </form>
            )}

            {/* USER LIST TABLE */}
            <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Team</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Active Pending Courses</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map(user => (
                            <tr key={user.uid} className={`hover:bg-slate-50 transition-colors ${user.disabled ? 'opacity-60 bg-slate-50' : ''}`}>
                                {/* NAME & EMAIL */}
                                <td className="px-6 py-4">
                                    <div 
                                        onClick={() => onSelectUser(user)} 
                                        className="font-bold text-rose-600 cursor-pointer hover:text-rose-800 hover:underline"
                                    >
                                        {user.name}
                                    </div>
                                    <div className="text-sm text-slate-500">{user.email}</div>
                                    {user.isInvite && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full mt-1 inline-block">Pending Signup</span>}
                                </td>
                                
                                {/* DYNAMIC TEAM DROPDOWN */}
                                <td className="px-6 py-4">
                                    <select 
                                        className={`text-xs font-bold uppercase border-none rounded px-2 py-1 cursor-pointer focus:ring-0 ${
                                            user.team === 'service' ? 'bg-cyan-100 text-cyan-800' : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                        value={user.team || 'sales'}
                                        onChange={(e) => handleTeamChange(user.uid, e.target.value)}
                                        disabled={user.disabled}
                                    >
                                        {availableTeams.map(team => (
                                            <option key={team} value={team}>{team.toUpperCase()}</option>
                                        ))}
                                        <option value="CREATE_NEW">+ ADD NEW...</option>
                                    </select>
                                </td>

                                {/* ROLE TOGGLE */}
                                <td className="px-6 py-4">
                                    <button 
                                        onClick={() => toggleAdminRole(user)}
                                        className={`px-3 py-1 text-xs rounded-full border font-bold transition-all ${
                                            user.role === 'admin' 
                                            ? 'bg-slate-800 text-white border-slate-900 hover:bg-slate-700 shadow-sm' 
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-rose-300 hover:text-rose-600'
                                        }`}
                                        title={user.role === 'admin' ? 'Click to demote' : 'Click to promote'}
                                    >
                                        {user.role === 'admin' ? 'Admin 🛡️' : 'Employee'}
                                    </button>
                                </td>

                                {/* STATUS */}
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs rounded-full font-bold ${user.disabled ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                        {user.disabled ? 'Disabled' : 'Active'}
                                    </span>
                                </td>

                                {/* ASSIGNED COURSES */}
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-2">
                                        {courses.map(c => {
                                            const isAssigned = user.assignedCourses?.includes(c.id);
                                            const isComplete = isCourseComplete(user.uid, c);

                                            if (!isAssigned || isComplete) return null;

                                            return (
                                                <span 
                                                    key={c.id} 
                                                    className="inline-flex items-center text-xs bg-rose-50 text-rose-700 border border-rose-100 px-2 py-1 rounded-md"
                                                >
                                                    {c.title}
                                                    <button 
                                                        onClick={() => removeCourse(user.uid, c.id, user.assignedCourses)}
                                                        className="ml-2 text-rose-400 hover:text-rose-700 font-bold"
                                                        title="Revoke Assignment"
                                                    >
                                                        &times;
                                                    </button>
                                                </span>
                                            );
                                        })}
                                        {courses.every(c => !user.assignedCourses?.includes(c.id) || isCourseComplete(user.uid, c)) && (
                                            <span className="text-xs text-slate-400 italic">No active pending courses</span>
                                        )}
                                    </div>
                                </td>

                                {/* ACTIONS (Disable User) */}
                                <td className="px-6 py-4">
                                    <button onClick={() => toggleUserStatus(user)} className={`text-sm font-bold ${user.disabled ? 'text-emerald-600 hover:text-emerald-800' : 'text-slate-400 hover:text-red-600'}`}>
                                        {user.disabled ? 'Activate' : 'Disable'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManager;