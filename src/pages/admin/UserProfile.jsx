import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { getUserPath, getPublicPath, formatTime } from '../../utils';

const UserProfile = ({ targetUser, courses, allResponses, onBack }) => {
    const [reviews, setReviews] = useState([]);
    const [activeTab, setActiveTab] = useState('courses'); // 'courses' or 'calls'
    const [expandedCourseId, setExpandedCourseId] = useState(null); // Track expanded course

    // Fetch this specific user's Call Reviews
    useEffect(() => {
        if (!targetUser) return;
        const unsub = onSnapshot(collection(db, getUserPath(targetUser.uid, 'call_reviews')), (snap) => {
            setReviews(snap.docs.map(d => ({id: d.id, ...d.data()})));
        });
        return () => unsub();
    }, [targetUser]);

    if (!targetUser) return <div>Loading...</div>;

    // --- LOGIC: Calculate Course Progress ---
    const assignedCourseIds = targetUser.assignedCourses || [];
    const userResponses = allResponses.filter(r => r.userId === targetUser.uid);

    const courseData = courses.filter(c => assignedCourseIds.includes(c.id)).map(c => {
        const totalModules = c.modules ? c.modules.length : 0;
        // Get responses for this course
        const completedMods = userResponses.filter(r => r.courseId === c.id);
        
        // Check if the LAST module is done to determine full completion
        const lastModId = c.modules?.[c.modules.length - 1]?.id;
        const finished = userResponses.some(r => r.courseId === c.id && r.moduleId === lastModId);

        return {
            ...c,
            pct: totalModules === 0 ? 0 : Math.round((completedMods.length / totalModules) * 100),
            isComplete: finished,
            completedModules: completedMods,
            totalModules
        };
    });

    const pendingCourses = courseData.filter(c => !c.isComplete);
    const completedCourses = courseData.filter(c => c.isComplete);

    const playAudioAt = (audioId, time) => {
        const el = document.getElementById(audioId);
        if(el) {
            el.currentTime = time;
            el.play();
        }
    };

    const toggleCourse = (id) => {
        if (expandedCourseId === id) setExpandedCourseId(null);
        else setExpandedCourseId(id);
    };

    // --- NEW FUNCTION: RESET PROGRESS ---
    const resetCourse = async (courseId) => {
        if(!window.confirm("This will permanently delete the user's answers and signatures for this course, requiring them to retake it. Continue?")) return;
        
        // Find all response documents for this user and course
        const responsesToDelete = userResponses.filter(r => r.courseId === courseId);
        
        try {
            // Delete them all
            const promises = responsesToDelete.map(r => deleteDoc(doc(db, getPublicPath('responses'), r.id)));
            await Promise.all(promises);
            alert("Course progress cleared. The user has been reassigned to retake the course.");
        } catch (e) {
            alert("Error resetting course: " + e.message);
        }
    };

    return (
        <div className="p-8 h-full overflow-y-auto bg-slate-50">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="text-slate-500 hover:text-rose-600 font-bold text-lg">
                    &larr; Back
                </button>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900">{targetUser.name}</h1>
                    <p className="text-slate-500">{targetUser.email} • {targetUser.role.toUpperCase()}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-6 border-slate-200">
                <button 
                    onClick={() => setActiveTab('courses')}
                    className={`px-6 py-3 font-bold transition-colors ${activeTab === 'courses' ? 'border-b-4 border-rose-600 text-rose-800' : 'text-slate-500 hover:text-rose-600'}`}
                >
                    Course Progress
                </button>
                <button 
                    onClick={() => setActiveTab('calls')}
                    className={`px-6 py-3 font-bold transition-colors ${activeTab === 'calls' ? 'border-b-4 border-rose-600 text-rose-800' : 'text-slate-500 hover:text-rose-600'}`}
                >
                    Call Reviews ({reviews.length})
                </button>
            </div>

            {/* --- TAB: COURSES --- */}
            {activeTab === 'courses' && (
                <div className="space-y-8">
                    {/* Pending Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                            <span className="w-3 h-3 bg-amber-400 rounded-full"></span> Pending Courses
                        </h3>
                        {pendingCourses.length === 0 ? <p className="text-slate-400 italic">No pending courses.</p> : (
                            <div className="grid gap-4">
                                {pendingCourses.map(c => (
                                    <div key={c.id} className="border border-slate-100 p-4 rounded-xl bg-amber-50">
                                        <div className="flex justify-between font-bold text-slate-700">
                                            <span>{c.title}</span>
                                            <span className="text-amber-700">{c.pct}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 h-2 rounded-full mt-2">
                                            <div className="bg-amber-400 h-2 rounded-full" style={{width: `${c.pct}%`}}></div>
                                        </div>
                                        <div className="mt-2 text-xs text-slate-500">
                                            Last Activity: {c.completedModules.length > 0 ? new Date(c.completedModules[c.completedModules.length-1].timestamp).toLocaleDateString() : 'Never'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Completed Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                            <span className="w-3 h-3 bg-emerald-500 rounded-full"></span> Completed History
                        </h3>
                        {completedCourses.length === 0 ? <p className="text-slate-400 italic">No completed courses yet.</p> : (
                            <div className="space-y-2">
                                {completedCourses.map(c => (
                                    <div key={c.id} className="border border-slate-100 rounded-xl overflow-hidden">
                                        <div 
                                            className="flex justify-between items-center p-4 hover:bg-slate-50 cursor-pointer bg-white"
                                            onClick={() => toggleCourse(c.id)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400 text-xs transform transition-transform duration-200" style={{ transform: expandedCourseId === c.id ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                                                <span className="font-bold text-slate-700">{c.title}</span>
                                            </div>
                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full font-bold">Completed</span>
                                        </div>

                                        {/* EXPANDED DETAILS */}
                                        {expandedCourseId === c.id && (
                                            <div className="bg-slate-50 p-4 border-t border-slate-100 space-y-4">
                                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Responses & Signatures</h4>
                                                
                                                {c.modules.filter(m => m.type === 'written' || m.type === 'signature').length === 0 ? (
                                                    <p className="text-sm text-slate-400 italic">No written responses or signatures in this course.</p>
                                                ) : (
                                                    c.modules.map(m => {
                                                        const response = userResponses.find(r => r.moduleId === m.id && r.courseId === c.id);
                                                        if (!response) return null;

                                                        if (m.type === 'written') {
                                                            return (
                                                                <div key={m.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                                                    <p className="text-sm font-bold text-slate-800 mb-2">{m.content}</p>
                                                                    <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded border border-slate-100 italic">
                                                                        "{response.answer || 'No text provided'}"
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        if (m.type === 'signature') {
                                                            return (
                                                                <div key={m.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                                                    <p className="text-xs font-black text-slate-400 uppercase mb-3">Signatures Recorded</p>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded text-sm">
                                                                            <span className="block text-xs text-emerald-600 font-bold mb-1">Workflow Acknowledgment</span>
                                                                            <span className="font-mono text-emerald-900 font-bold">{response.answer?.sig1}</span>
                                                                        </div>
                                                                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded text-sm">
                                                                            <span className="block text-xs text-emerald-600 font-bold mb-1">Compliance Acknowledgment</span>
                                                                            <span className="font-mono text-emerald-900 font-bold">{response.answer?.sig2}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })
                                                )}

                                                <div className="border-t border-slate-200 pt-4 flex justify-end">
                                                    <button 
                                                        onClick={() => resetCourse(c.id)}
                                                        className="bg-white text-red-500 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 hover:text-red-700 transition-colors shadow-sm"
                                                    >
                                                        Reject & Reset Progress ↺
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Completed Section */}
                    {/* (This block was redundant in previous logic, kept clean here) */}
                </div>
            )}

            {/* --- TAB: CALLS --- */}
            {activeTab === 'calls' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-xl font-bold mb-6 text-slate-800">Graded Call Logs</h3>
                    {reviews.length === 0 ? <p className="text-slate-400">No calls graded for this user.</p> : (
                        <div className="space-y-6">
                            {reviews.sort((a,b) => new Date(b.reviewedAt) - new Date(a.reviewedAt)).map(r => (
                                <div key={r.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50">
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                                        <div>
                                            <span className="font-bold text-lg mr-3 text-slate-800">{new Date(r.reviewedAt).toLocaleDateString()}</span>
                                            <span className="text-sm text-slate-500">at {new Date(r.reviewedAt).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="text-xl font-extrabold text-slate-900">
                                            {r.totalScore} <span className="text-slate-400 text-sm font-normal">/ {r.maxScore}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="font-bold text-xs text-slate-400 uppercase mb-2">Audio</h4>
                                            <audio controls src={r.audioUrl} id={`audio-${r.id}`} className="w-full h-8" />
                                            
                                            <h4 className="font-bold text-xs text-slate-400 uppercase mt-4 mb-2">Score Breakdown</h4>
                                            <div className="bg-white border border-slate-200 p-3 rounded-lg text-sm space-y-2">
                                                {r.criteria.map((c, i) => (
                                                    <div key={i} className="flex justify-between">
                                                        <span className="text-slate-600">{c.label}</span>
                                                        <span className="font-mono font-bold text-slate-900">{c.points}/{c.maxPoints}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-xs text-slate-400 uppercase mb-2">Feedback Comments</h4>
                                            <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                                {r.comments?.length > 0 ? r.comments.map((c, i) => (
                                                    <div key={i} className="text-sm bg-amber-50 p-3 rounded-lg border border-amber-100 flex flex-col">
                                                        <button 
                                                            onClick={() => playAudioAt(`audio-${r.id}`, c.timestamp)}
                                                            className="self-start text-xs font-bold text-rose-600 hover:underline mb-1"
                                                            title="Play"
                                                        >
                                                            ▶ {formatTime(c.timestamp)}
                                                        </button>
                                                        <span className="text-slate-700">{c.text}</span>
                                                    </div>
                                                )) : <p className="text-xs text-slate-400">No written comments.</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserProfile;