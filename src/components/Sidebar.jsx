import React from 'react';

const Sidebar = ({ currentView, setView, userRole, onSignOut }) => (
    <div className="w-64 bg-gradient-to-b from-rose-50 to-white border-r border-rose-100 text-slate-800 flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-20">
        {/* BRANDING: Rose Accent */}
        <div className="p-6 font-extrabold text-2xl border-b border-rose-100 text-rose-600 flex items-center gap-2 tracking-tight">
            <span className="text-3xl">⚡</span> Jerry LMS
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
            <button 
                onClick={() => setView('dashboard')} 
                className={`w-full text-left p-3 rounded-xl transition-all font-bold flex items-center gap-3 ${currentView === 'dashboard' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'text-slate-600 hover:bg-white hover:text-rose-600 hover:shadow-sm'}`}
            >
                📊 Dashboard
            </button>
            <button 
                onClick={() => setView('myCourses')} 
                className={`w-full text-left p-3 rounded-xl transition-all font-bold flex items-center gap-3 ${currentView === 'myCourses' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'text-slate-600 hover:bg-white hover:text-rose-600 hover:shadow-sm'}`}
            >
                🎓 My Courses
            </button>
            <button 
                onClick={() => setView('myReviews')} 
                className={`w-full text-left p-3 rounded-xl transition-all font-bold flex items-center gap-3 ${currentView === 'myReviews' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'text-slate-600 hover:bg-white hover:text-rose-600 hover:shadow-sm'}`}
            >
                📞 My Reviews
            </button>
            
            {userRole === 'admin' && (
                <>
                    <div className="pt-8 pb-3 text-xs font-black text-rose-400 uppercase tracking-widest px-3">Admin Tools</div>
                    <button 
                        onClick={() => setView('manageCourses')} 
                        className={`w-full text-left p-3 rounded-xl transition-all font-bold flex items-center gap-3 ${currentView === 'manageCourses' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'text-slate-600 hover:bg-white hover:text-rose-600 hover:shadow-sm'}`}
                    >
                        📚 Manage Courses
                    </button>
                    <button 
                        onClick={() => setView('manageUsers')} 
                        className={`w-full text-left p-3 rounded-xl transition-all font-bold flex items-center gap-3 ${currentView === 'manageUsers' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'text-slate-600 hover:bg-white hover:text-rose-600 hover:shadow-sm'}`}
                    >
                        👥 Manage Users
                    </button>
                    <button 
                        onClick={() => setView('gradeCall')} 
                        className={`w-full text-left p-3 rounded-xl transition-all font-bold flex items-center gap-3 ${currentView === 'gradeCall' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'text-slate-600 hover:bg-white hover:text-rose-600 hover:shadow-sm'}`}
                    >
                        🎤 Grade Calls
                    </button>
                </>
            )}
        </nav>
        <div className="p-4 border-t border-rose-100 bg-white/50 backdrop-blur-sm">
            <button 
                onClick={onSignOut} 
                className="w-full py-3 bg-white border-2 border-slate-100 hover:border-rose-200 text-slate-500 hover:text-rose-600 rounded-xl text-sm font-extrabold transition-all hover:shadow-md"
            >
                Sign Out
            </button>
        </div>
    </div>
);

export default Sidebar;