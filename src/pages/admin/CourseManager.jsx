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
                // Remove course
                await updateDoc(userRef, {
                    assignedCourses: arrayRemove(courseId)
                });
            } else {
                // Add course
                await updateDoc(userRef, {
                    assignedCourses: arrayUnion(courseId)
                });
            }
        } catch (e) {
            alert("Error updating assignment: " + e.message);
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manage Courses</h1>
                <button 
                    onClick={() => { 
                        setCurrentCourseId(null); 
                        setView('courseBuilder'); 
                    }} 
                    className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700"
                >
                    + Create Course
                </button>
            </div>

            <div className="grid gap-4">
                {courses.map(c => (
                    <div key={c.id} className="bg-white p-4 rounded shadow border flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">{c.title}</h3>
                            <p className="text-gray-500 text-sm">{c.modules?.length || 0} Modules</p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setAssigningCourse(c)}
                                className="text-green-600 hover:underline font-bold"
                            >
                                Assign 👥
                            </button>
                            <span className="text-gray-300">|</span>
                            <button 
                                onClick={() => { setCurrentCourseId(c.id); setView('course'); }} 
                                className="text-indigo-600 hover:underline"
                            >
                                Preview
                            </button>
                            <button 
                                onClick={() => { setCurrentCourseId(c.id); setView('courseBuilder'); }} 
                                className="text-blue-600 hover:underline"
                            >
                                Edit
                            </button>
                            <button 
                                onClick={() => deleteCourse(c.id)} 
                                className="text-red-600 hover:underline"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ASSIGNMENT MODAL OVERLAY */}
            {assigningCourse && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Assign Course</h2>
                                <p className="text-gray-600 text-sm">Assigning: <span className="font-bold text-indigo-600">{assigningCourse.title}</span></p>
                            </div>
                            <button onClick={() => setAssigningCourse(null)} className="text-gray-500 hover:text-black text-2xl">&times;</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {users.filter(u => !u.disabled).map(user => {
                                        const isAssigned = user.assignedCourses?.includes(assigningCourse.id);
                                        return (
                                            <tr key={user.uid} className={isAssigned ? 'bg-green-50' : ''}>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-gray-900">{user.name}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isAssigned ? (
                                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                            Assigned
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                            Not Assigned
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <label className="inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            className="form-checkbox h-5 w-5 text-indigo-600 rounded"
                                                            checked={!!isAssigned}
                                                            onChange={() => toggleAssignment(user.uid, user.assignedCourses || [], assigningCourse.id)}
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">
                                                            {isAssigned ? 'Revoke' : 'Assign'}
                                                        </span>
                                                    </label>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {users.length === 0 && <p className="text-center text-gray-500 mt-4">No active users found.</p>}
                        </div>

                        <div className="p-4 border-t bg-gray-50 text-right">
                            <button 
                                onClick={() => setAssigningCourse(null)}
                                className="bg-indigo-600 text-white px-6 py-2 rounded shadow hover:bg-indigo-700 font-bold"
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