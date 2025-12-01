import React, { useState } from 'react';
import { deleteDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase';
import { getPublicPath } from '../../utils';

const CourseManager = ({ courses, users, setView, setCurrentCourseId }) => {
    const [assigningCourse, setAssigningCourse] = useState(null);

    // Delete a course
    const deleteCourse = async (id) => {
        if(!window.confirm("Delete this course permanently?")) return;
        try { 
            await deleteDoc(doc(db, getPublicPath('courses'), id)); 
        } catch(e) { alert(e.message); }
    };

    // Toggle assignment for a specific user
    const toggleAssignment = async (userId, userAssignedCourses, courseId) => {
        const userRef = doc(db, getPublicPath('users'), userId);
        const isAssigned = userAssignedCourses.includes(courseId);

        try {
            if (isAssigned) {
                await updateDoc(userRef, { assignedCourses: arrayRemove(courseId) });
            } else {
                await updateDoc(userRef, { assignedCourses: arrayUnion(courseId) });
            }
        } catch (e) {
            alert("Error updating assignment: " + e.message);
        }
    };

    return (
        <div className="p-8 bg-slate-50 min-h-full">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-extrabold text-slate-900">Manage Courses</h1>
                <button 
                    onClick={() => { 
                        setCurrentCourseId(null); 
                        setView('courseBuilder'); 
                    }} 
                    className="bg-rose-600 text-white px-6 py-2 rounded-lg shadow-lg shadow-rose-900/20 hover:bg-rose-700 font-bold transition-all"
                >
                    + Create Course
                </button>
            </div>

            <div className="grid gap-4">
                {courses.map(c => (
                    <div key={c.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center hover:shadow-md transition-shadow">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">{c.title}</h3>
                            <p className="text-slate-500 text-sm">{c.modules?.length || 0} Modules</p>
                        </div>
                        <div className="flex gap-4 items-center">
                            <button 
                                onClick={() => setAssigningCourse(c)}
                                className="text-emerald-600 hover:text-emerald-700 font-bold text-sm bg-emerald-50 px-3 py-1 rounded border border-emerald-100 hover:border-emerald-200 transition-colors"
                            >
                                Assign 👥
                            </button>
                            <span className="text-slate-300">|</span>
                            <button 
                                onClick={() => { setCurrentCourseId(c.id); setView('course'); }} 
                                className="text-slate-600 hover:text-rose-600 font-medium text-sm transition-colors"
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
                                className="text-slate-400 hover:text-red-600 text-sm transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ASSIGNMENT MODAL OVERLAY */}
            {assigningCourse && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Assign Course</h2>
                                <p className="text-slate-500 text-sm">Assigning: <span className="font-bold text-rose-600">{assigningCourse.title}</span></p>
                            </div>
                            <button onClick={() => setAssigningCourse(null)} className="text-slate-400 hover:text-slate-800 text-2xl">&times;</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Employee</th>
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
                                                    {isAssigned ? (
                                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-emerald-100 text-emerald-800">
                                                            Assigned
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-slate-100 text-slate-600">
                                                            Not Assigned
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <label className="inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            className="form-checkbox h-5 w-5 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                                                            checked={!!isAssigned}
                                                            onChange={() => toggleAssignment(user.uid, user.assignedCourses || [], assigningCourse.id)}
                                                        />
                                                        <span className="ml-2 text-sm text-slate-700 font-medium">
                                                            {isAssigned ? 'Revoke' : 'Assign'}
                                                        </span>
                                                    </label>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {users.length === 0 && <p className="text-center text-slate-400 mt-4">No active users found.</p>}
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