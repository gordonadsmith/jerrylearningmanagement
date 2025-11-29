    import React, { useState, useEffect } from 'react';
    import { collection, onSnapshot } from 'firebase/firestore';
    import { db } from '../../firebase';
    import { getUserPath, formatTime } from '../../utils';

    const UserProfile = ({ targetUser, courses, allResponses, onBack }) => {
        const [reviews, setReviews] = useState([]);
        const [activeTab, setActiveTab] = useState('courses'); // 'courses' or 'calls'

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

        return (
            <div className="p-8 h-full overflow-y-auto bg-gray-50">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={onBack} className="text-gray-500 hover:text-indigo-600 font-bold text-lg">
                        &larr; Back
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{targetUser.name}</h1>
                        <p className="text-gray-500">{targetUser.email} • {targetUser.role.toUpperCase()}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b mb-6">
                    <button 
                        onClick={() => setActiveTab('courses')}
                        className={`px-6 py-3 font-bold ${activeTab === 'courses' ? 'border-b-4 border-indigo-600 text-indigo-800' : 'text-gray-500 hover:text-indigo-600'}`}
                    >
                        Course Progress
                    </button>
                    <button 
                        onClick={() => setActiveTab('calls')}
                        className={`px-6 py-3 font-bold ${activeTab === 'calls' ? 'border-b-4 border-indigo-600 text-indigo-800' : 'text-gray-500 hover:text-indigo-600'}`}
                    >
                        Call Reviews ({reviews.length})
                    </button>
                </div>

                {/* --- TAB: COURSES --- */}
                {activeTab === 'courses' && (
                    <div className="space-y-8">
                        {/* Pending Section */}
                        <div className="bg-white p-6 rounded shadow border-l-4 border-orange-400">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 bg-orange-400 rounded-full"></span> Pending Courses
                            </h3>
                            {pendingCourses.length === 0 ? <p className="text-gray-400 italic">No pending courses.</p> : (
                                <div className="grid gap-4">
                                    {pendingCourses.map(c => (
                                        <div key={c.id} className="border p-4 rounded bg-orange-50">
                                            <div className="flex justify-between font-bold">
                                                <span>{c.title}</span>
                                                <span>{c.pct}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 h-2 rounded mt-2">
                                                <div className="bg-orange-400 h-2 rounded" style={{width: `${c.pct}%`}}></div>
                                            </div>
                                            <div className="mt-2 text-xs text-gray-600">
                                                Last Activity: {c.completedModules.length > 0 ? new Date(c.completedModules[c.completedModules.length-1].timestamp).toLocaleDateString() : 'Never'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Completed Section */}
                        <div className="bg-white p-6 rounded shadow border-l-4 border-green-500">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 bg-green-500 rounded-full"></span> Completed History
                            </h3>
                            {completedCourses.length === 0 ? <p className="text-gray-400 italic">No completed courses yet.</p> : (
                                <div className="space-y-2">
                                    {completedCourses.map(c => (
                                        <div key={c.id} className="flex justify-between items-center p-3 border-b last:border-0 hover:bg-gray-50">
                                            <span className="font-bold text-gray-700">{c.title}</span>
                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-bold">Completed</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- TAB: CALLS --- */}
                {activeTab === 'calls' && (
                    <div className="bg-white p-6 rounded shadow">
                        <h3 className="text-xl font-bold mb-6">Graded Call Logs</h3>
                        {reviews.length === 0 ? <p className="text-gray-400">No calls graded for this user.</p> : (
                            <div className="space-y-6">
                                {reviews.sort((a,b) => new Date(b.reviewedAt) - new Date(a.reviewedAt)).map(r => (
                                    <div key={r.id} className="border rounded p-4">
                                        <div className="flex justify-between items-center border-b pb-2 mb-4">
                                            <div>
                                                <span className="font-bold text-lg mr-3">{new Date(r.reviewedAt).toLocaleDateString()}</span>
                                                <span className="text-sm text-gray-500">at {new Date(r.reviewedAt).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="text-xl font-bold">
                                                {r.totalScore} <span className="text-gray-400 text-sm">/ {r.maxScore}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="font-bold text-xs text-gray-400 uppercase mb-2">Audio</h4>
                                                {/* ID added for targeting */}
                                                <audio controls src={r.audioUrl} id={`audio-${r.id}`} className="w-full h-8" />
                                                
                                                <h4 className="font-bold text-xs text-gray-400 uppercase mt-4 mb-2">Score Breakdown</h4>
                                                <div className="bg-gray-50 p-2 rounded text-sm space-y-1">
                                                    {r.criteria.map((c, i) => (
                                                        <div key={i} className="flex justify-between">
                                                            <span>{c.label}</span>
                                                            <span className="font-mono font-bold">{c.points}/{c.maxPoints}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-xs text-gray-400 uppercase mb-2">Feedback Comments</h4>
                                                <div className="max-h-40 overflow-y-auto space-y-2">
                                                    {r.comments?.length > 0 ? r.comments.map((c, i) => (
                                                        <div key={i} className="text-sm bg-yellow-50 p-2 rounded border border-yellow-100 flex gap-2">
                                                            <button 
                                                                onClick={() => playAudioAt(`audio-${r.id}`, c.timestamp)}
                                                                className="font-bold text-indigo-600 hover:underline whitespace-nowrap"
                                                                title="Play"
                                                            >
                                                                {formatTime(c.timestamp)}
                                                            </button>
                                                            <span>{c.text}</span>
                                                        </div>
                                                    )) : <p className="text-xs text-gray-400">No written comments.</p>}
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