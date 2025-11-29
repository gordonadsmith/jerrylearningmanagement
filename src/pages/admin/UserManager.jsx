import React, { useState } from 'react';
import { setDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { getPublicPath } from '../../utils';

const UserManager = ({ users, courses, responses = [], onSelectUser }) => {
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const placeholderId = `invite_${Date.now()}`;
            await setDoc(doc(db, getPublicPath('users'), placeholderId), {
                uid: placeholderId,
                email: newUserEmail.toLowerCase(),
                name: newUserName,
                role: 'employee',
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

    const removeCourse = async (userId, courseId, currentList = []) => {
        if(!window.confirm("Remove this course assignment?")) return;
        const newList = currentList.filter(id => id !== courseId);
        await updateDoc(doc(db, getPublicPath('users'), userId), { assignedCourses: newList });
    };

    // Helper to check if a user has finished a specific course
    const isCourseComplete = (userId, course) => {
        if (!course.modules || course.modules.length === 0) return false;
        const lastModId = course.modules[course.modules.length - 1].id;
        return responses.some(r => r.userId === userId && r.courseId === course.id && r.moduleId === lastModId);
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manage Users</h1>
                <button 
                    onClick={() => setIsAdding(!isAdding)} 
                    className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
                >
                    {isAdding ? 'Cancel' : '+ Pre-Register User'}
                </button>
            </div>
            {isAdding && (
                <form onSubmit={handleAddUser} className="bg-gray-100 p-4 rounded-lg mb-6 border border-gray-300 flex gap-4">
                    <input className="border p-2 rounded flex-1" placeholder="Email" type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required />
                    <input className="border p-2 rounded flex-1" placeholder="Full Name" value={newUserName} onChange={e => setNewUserName(e.target.value)} required />
                    <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded">Save</button>
                </form>
            )}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Pending Courses</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {users.map(user => (
                            <tr key={user.uid} className={user.disabled ? 'bg-gray-100 opacity-60' : ''}>
                                <td className="px-6 py-4">
                                    <div 
                                        onClick={() => onSelectUser(user)} 
                                        className="font-bold text-indigo-700 cursor-pointer hover:underline"
                                    >
                                        {user.name}
                                    </div>
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                    {user.isInvite && <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">Pending Signup</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <button 
                                        onClick={() => toggleAdminRole(user)}
                                        className={`px-2 py-1 text-xs rounded border font-bold transition-colors ${
                                            user.role === 'admin' 
                                            ? 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200' 
                                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                        }`}
                                        title={user.role === 'admin' ? 'Click to demote to Employee' : 'Click to promote to Admin'}
                                    >
                                        {user.role === 'admin' ? 'Admin 🛡️' : 'Employee'}
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs rounded-full ${user.disabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                        {user.disabled ? 'Disabled' : 'Active'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-2">
                                        {courses.map(c => {
                                            const isAssigned = user.assignedCourses?.includes(c.id);
                                            const isComplete = isCourseComplete(user.uid, c);

                                            if (!isAssigned || isComplete) return null;

                                            return (
                                                <span 
                                                    key={c.id} 
                                                    className="inline-flex items-center text-xs bg-orange-50 text-orange-800 border border-orange-200 px-2 py-1 rounded"
                                                >
                                                    {c.title}
                                                    <button 
                                                        onClick={() => removeCourse(user.uid, c.id, user.assignedCourses)}
                                                        className="ml-2 text-red-500 hover:text-red-700 font-bold"
                                                        title="Revoke Assignment"
                                                    >
                                                        &times;
                                                    </button>
                                                </span>
                                            );
                                        })}
                                        {courses.every(c => !user.assignedCourses?.includes(c.id) || isCourseComplete(user.uid, c)) && (
                                            <span className="text-xs text-gray-400 italic">No active pending courses</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <button onClick={() => toggleUserStatus(user)} className={`text-sm font-medium ${user.disabled ? 'text-green-600' : 'text-red-600'} hover:underline`}>
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