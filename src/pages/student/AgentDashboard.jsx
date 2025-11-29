import React from 'react';

// Renamed Component to AgentDashboard
const AgentDashboard = ({ user, courses, responses, reviews, setView, setCurrentCourseId }) => {
    
    // 1. Calculate Stats
    const totalAssigned = courses.filter(c => user.assignedCourses?.includes(c.id)).length;
    
    let completedCount = 0;
    let inProgressCount = 0;
    let lastActiveCourse = null;
    let lastActiveTime = 0;

    courses.forEach(c => {
        if (!user.assignedCourses?.includes(c.id)) return;

        const cResponses = responses.filter(r => r.courseId === c.id);
        const totalMods = c.modules ? c.modules.length : 0;
        
        if (totalMods === 0) return;

        const isComplete = cResponses.length >= totalMods;
        const hasStarted = cResponses.length > 0;

        if (isComplete) completedCount++;
        if (hasStarted && !isComplete) inProgressCount++;

        // Find most recent activity
        if (hasStarted && !isComplete) {
            // Sort responses to find latest
            const latestResponse = cResponses.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
            const time = new Date(latestResponse.timestamp).getTime();
            if (time > lastActiveTime) {
                lastActiveTime = time;
                lastActiveCourse = { ...c, progress: Math.round((cResponses.length / totalMods) * 100) };
            }
        }
    });

    // Calculate Average Call Score
    const avgScore = reviews.length > 0 
        ? Math.round(reviews.reduce((acc, r) => acc + (r.totalScore/r.maxScore)*100, 0) / reviews.length) 
        : 0;

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-2 text-gray-800">Welcome back, {user.name.split(' ')[0]}! 👋</h1>
            <p className="text-gray-500 mb-8">Here is your agent performance overview.</p>

            {/* --- STATS ROW --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm font-bold uppercase tracking-wider">Courses Completed</div>
                    <div className="text-3xl font-bold text-green-600 mt-2">{completedCount} <span className="text-gray-400 text-lg">/ {totalAssigned}</span></div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm font-bold uppercase tracking-wider">In Progress</div>
                    <div className="text-3xl font-bold text-orange-500 mt-2">{inProgressCount}</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm font-bold uppercase tracking-wider">Avg Call Score</div>
                    <div className="text-3xl font-bold text-indigo-600 mt-2">{reviews.length > 0 ? `${avgScore}%` : 'N/A'}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* --- JUMP BACK IN --- */}
                <div className="bg-indigo-900 rounded-xl p-8 text-white shadow-lg flex flex-col justify-between relative overflow-hidden">
                    {/* Decorative Circle */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-pink-400 rounded-full opacity-20"></div>
                    
                    <div>
                        <h2 className="text-xl font-bold mb-2">Continue Training</h2>
                        {lastActiveCourse ? (
                            <>
                                <p className="text-indigo-200 mb-6">You were making good progress on <span className="text-white font-bold">{lastActiveCourse.title}</span>.</p>
                                <div className="w-full bg-indigo-800 h-2 rounded mb-6">
                                    <div className="bg-pink-400 h-2 rounded transition-all" style={{width: `${lastActiveCourse.progress}%`}}></div>
                                </div>
                                <button 
                                    onClick={() => { setCurrentCourseId(lastActiveCourse.id); setView('course'); }}
                                    className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-6 rounded shadow transition-colors"
                                >
                                    Resume Course &rarr;
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="text-indigo-200 mb-6">You are all caught up on your active courses!</p>
                                <button 
                                    onClick={() => setView('myCourses')}
                                    className="bg-white text-indigo-900 font-bold py-3 px-6 rounded shadow hover:bg-gray-100"
                                >
                                    Browse Library
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* --- LATEST FEEDBACK --- */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800">Latest Call Review</h3>
                        <button onClick={() => setView('myReviews')} className="text-sm text-indigo-600 hover:underline">View All</button>
                    </div>
                    
                    {reviews.length > 0 ? (
                        (() => {
                            const latest = reviews.sort((a,b) => new Date(b.reviewedAt) - new Date(a.reviewedAt))[0];
                            const pct = Math.round((latest.totalScore/latest.maxScore)*100);
                            return (
                                <div className="border rounded-lg p-4 bg-gray-50">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-gray-500 font-bold uppercase">{new Date(latest.reviewedAt).toLocaleDateString()}</span>
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${pct >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {pct}% Score
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <span className="font-bold">Manager Feedback: </span>
                                        {latest.comments && latest.comments.length > 0 
                                            ? `"${latest.comments[0].text}..."` 
                                            : "No written comments."}
                                    </div>
                                    <div className="mt-3">
                                        <audio controls src={latest.audioUrl} className="w-full h-8" />
                                    </div>
                                </div>
                            );
                        })()
                    ) : (
                        <div className="h-40 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed rounded bg-gray-50">
                            <p>No graded calls yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AgentDashboard;