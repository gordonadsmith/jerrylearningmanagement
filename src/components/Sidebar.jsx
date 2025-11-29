import React from 'react';

const Sidebar = ({ currentView, setView, userRole, onSignOut }) => (
    <div className="w-64 bg-indigo-900 text-white flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-20">
        {/* UPDATED TITLE HERE */}
        <div className="p-6 font-bold text-xl border-b border-indigo-800 text-pink-400">
            Jerry Learning Management
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
            <button 
                onClick={() => setView('dashboard')} 
                className={`w-full text-left p-3 rounded transition ${currentView === 'dashboard' ? 'bg-indigo-700' : 'hover:bg-indigo-800'}`}
            >
                📊 Dashboard
            </button>
            <button 
                onClick={() => setView('myCourses')} 
                className={`w-full text-left p-3 rounded transition ${currentView === 'myCourses' ? 'bg-indigo-700' : 'hover:bg-indigo-800'}`}
            >
                🎓 My Courses
            </button>
            <button 
                onClick={() => setView('myReviews')} 
                className={`w-full text-left p-3 rounded transition ${currentView === 'myReviews' ? 'bg-indigo-700' : 'hover:bg-indigo-800'}`}
            >
                📞 My Reviews
            </button>
            
            {userRole === 'admin' && (
                <>
                    <div className="pt-4 pb-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">Admin Tools</div>
                    <button 
                        onClick={() => setView('manageCourses')} 
                        className={`w-full text-left p-3 rounded transition ${currentView === 'manageCourses' ? 'bg-indigo-700' : 'hover:bg-indigo-800'}`}
                    >
                        📚 Manage Courses
                    </button>
                    <button 
                        onClick={() => setView('manageUsers')} 
                        className={`w-full text-left p-3 rounded transition ${currentView === 'manageUsers' ? 'bg-indigo-700' : 'hover:bg-indigo-800'}`}
                    >
                        👥 Manage Users
                    </button>
                    <button 
                        onClick={() => setView('gradeCall')} 
                        className={`w-full text-left p-3 rounded transition ${currentView === 'gradeCall' ? 'bg-indigo-700' : 'hover:bg-indigo-800'}`}
                    >
                        🎤 Grade Calls
                    </button>
                </>
            )}
        </nav>
        <div className="p-4 border-t border-indigo-800">
            <button 
                onClick={onSignOut} 
                className="w-full py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-bold"
            >
                Sign Out
            </button>
        </div>
    </div>
);

export default Sidebar;