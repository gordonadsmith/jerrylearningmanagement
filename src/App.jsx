import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getPublicPath, getUserPath, ADMIN_EMAILS } from './utils';

// Components
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import CoursePlayer from './pages/student/CoursePlayer';
import UserCallReviews from './pages/student/UserCallReviews';
import AgentDashboard from './pages/student/AgentDashboard'; // Renamed from StudentDashboard

// Admin Components
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManager from './pages/admin/UserManager';
import CourseManager from './pages/admin/CourseManager';
import CourseBuilder from './pages/admin/CourseBuilder';
import CallGrader from './pages/admin/CallGrader';
import UserProfile from './pages/admin/UserProfile';

const App = () => {
    // --- STATE MANAGEMENT ---
    const [view, setView] = useState('login');
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    
    // Data Lists
    const [courses, setCourses] = useState([]);
    const [users, setUsers] = useState([]);
    const [allResponses, setAllResponses] = useState([]);
    const [myResponses, setMyResponses] = useState([]);
    const [myReviews, setMyReviews] = useState([]);
    
    // Navigation State
    const [currentCourseId, setCurrentCourseId] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);

    // --- NAVIGATION HANDLERS ---
    const handleOpenProfile = (targetUser) => {
        setSelectedUser(targetUser);
        setView('userProfile');
    };

    // --- AUTHENTICATION & INITIAL LOAD ---
    useEffect(() => {
        return onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUser(u);
                const ref = doc(db, getPublicPath('users'), u.uid);
                
                try {
                    // 1. Check if account is disabled
                    const snap = await getDocs(query(collection(db, getPublicPath('users')), where('email', '==', u.email)));
                    if(!snap.empty && snap.docs[0].data().disabled) { 
                        alert("Account disabled."); 
                        signOut(auth); 
                        return; 
                    }

                    // 2. Handle Invites (Convert invite to real user)
                    const q = query(collection(db, getPublicPath('users')), where('email', '==', u.email));
                    const inviteSnap = await getDocs(q);
                    
                    if (!inviteSnap.empty && inviteSnap.docs[0].data().isInvite) {
                        const inviteData = inviteSnap.docs[0].data();
                        const baseData = { ...inviteData, uid: u.uid, isInvite: false };
                        await setDoc(ref, baseData, { merge: true });
                        await deleteDoc(inviteSnap.docs[0].ref);
                    }
                } catch(e) { 
                    console.error("Auth check processed", e); 
                }

                // 3. Listen to User Profile
                onSnapshot(ref, async (s) => {
                    if (s.exists()) {
                        const pData = s.data();
                        setProfile(pData);
                        // Redirect on first login
                        if (view === 'login') setView(pData.role === 'admin' ? 'dashboard' : 'myCourses');
                        
                        // Listen to Call Reviews (Specific to this user)
                        onSnapshot(collection(db, getUserPath(u.uid, 'call_reviews')), (revSnap) => {
                            setMyReviews(revSnap.docs.map(d => ({id: d.id, ...d.data()})));
                        });

                    } else {
                        // Create Basic Profile if missing
                        let baseData = { 
                            email: u.email, 
                            name: u.displayName || u.email.split('@')[0], 
                            role: 'employee', 
                            uid: u.uid, 
                            assignedCourses: [], 
                            createdAt: new Date().toISOString() 
                        };
                        if (ADMIN_EMAILS.includes(u.email)) baseData.role = 'admin';
                        await setDoc(ref, baseData, { merge: true });
                    }
                });
            } else {
                setUser(null); setProfile(null); setView('login');
            }
        });
    }, []); 

    // --- DATA FETCHING (Courses, Users, Progress) ---
    useEffect(() => {
        if (!profile) return;
        
        // 1. Fetch Courses
        const unsubC = onSnapshot(collection(db, getPublicPath('courses')), s => setCourses(s.docs.map(d => ({id: d.id, ...d.data()}))));
        
        // 2. Fetch Progress (Responses)
        let unsubResp;
        if (profile.role === 'admin') {
            // Admin sees ALL responses
            unsubResp = onSnapshot(collection(db, getPublicPath('responses')), s => {
                const data = s.docs.map(d => d.data());
                setAllResponses(data);
                setMyResponses(data.filter(r => r.userId === profile.uid)); // reuse logic
            });
        } else {
            // Employee sees ONLY their responses
            const q = query(collection(db, getPublicPath('responses')), where('userId', '==', profile.uid));
            unsubResp = onSnapshot(q, s => setMyResponses(s.docs.map(d => d.data())));
        }

        // 3. Fetch Users (Admin Only)
        let unsubU = () => {};
        if (profile.role === 'admin') {
            unsubU = onSnapshot(collection(db, getPublicPath('users')), s => setUsers(s.docs.map(d => ({uid: d.id, ...d.data()}))));
        }

        return () => { unsubC(); unsubU(); unsubResp && unsubResp(); };
    }, [profile]);

    // --- VIEW ROUTING ---

    if (view === 'login') return <Login setView={setView} />;

    if (!profile) return <div className="flex h-screen items-center justify-center font-bold text-indigo-600">Loading Profile...</div>;

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar currentView={view} setView={setView} userRole={profile.role} onSignOut={() => signOut(auth)} />
            
            <main className="flex-1 ml-64 overflow-auto">
                
                {/* --- ADMIN VIEWS --- */}
                
                {view === 'dashboard' && profile.role === 'admin' && (
                    <AdminDashboard 
                        users={users} 
                        courses={courses} 
                        responses={allResponses} 
                        onSelectUser={handleOpenProfile} 
                    />
                )}
                
                {view === 'manageUsers' && (
                    <UserManager 
                        users={users} 
                        courses={courses} 
                        responses={allResponses}
                        onSelectUser={handleOpenProfile} 
                    />
                )}
                
                {view === 'userProfile' && selectedUser && (
                    <UserProfile 
                        targetUser={selectedUser}
                        courses={courses}
                        allResponses={allResponses}
                        onBack={() => setView('manageUsers')} 
                    />
                )}

                {view === 'manageCourses' && (
                    <CourseManager 
                        courses={courses} 
                        users={users} 
                        setView={setView} 
                        setCurrentCourseId={setCurrentCourseId} 
                    />
                )}
                
                {(view === 'createCourse' || view === 'courseBuilder') && (
                    <CourseBuilder 
                        userId={user.uid} 
                        setView={setView} 
                        existingCourseId={currentCourseId} 
                    />
                )}
                
                {view === 'gradeCall' && (
                    <CallGrader allUserProfiles={users} setView={setView} />
                )}
                
                
                {/* --- AGENT/STUDENT VIEWS --- */}

                {/* Agent Dashboard (Home) */}
                {view === 'dashboard' && profile.role !== 'admin' && (
                    <AgentDashboard 
                        user={profile}
                        courses={courses}
                        responses={myResponses}
                        reviews={myReviews}
                        setView={setView}
                        setCurrentCourseId={setCurrentCourseId}
                    />
                )}

                {view === 'myReviews' && (
                    <UserCallReviews reviews={myReviews} />
                )}
                
                {/* My Courses List */}
                {view === 'myCourses' && (
                    <div className="p-8">
                        <h1 className="text-3xl font-bold mb-6">My Courses</h1>
                        <div className="grid gap-4 md:grid-cols-3">
                            {courses.filter(c => profile.assignedCourses?.includes(c.id)).map(c => {
                                // Calculate Progress
                                const completedCount = myResponses.filter(r => r.courseId === c.id).length;
                                const totalCount = c.modules ? c.modules.length : 0;
                                const pct = totalCount === 0 ? 0 : Math.round((completedCount/totalCount)*100);

                                return (
                                    <div 
                                        key={c.id} 
                                        className="bg-white p-6 rounded shadow border-l-4 border-indigo-500 cursor-pointer hover:shadow-lg" 
                                        onClick={() => { setCurrentCourseId(c.id); setView('course'); }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-xl">{c.title}</h3>
                                            <span className={`text-xs px-2 py-1 rounded font-bold ${pct === 100 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {pct}% Done
                                            </span>
                                        </div>
                                        <p className="text-gray-500 mt-2 text-sm">{c.description}</p>
                                        <div className="w-full bg-gray-200 h-1 mt-4 rounded">
                                            <div className="bg-indigo-500 h-1 rounded" style={{width: `${pct}%`}}></div>
                                        </div>
                                    </div>
                                );
                            })}
                            {courses.filter(c => profile.assignedCourses?.includes(c.id)).length === 0 && <p>No courses assigned.</p>}
                        </div>
                    </div>
                )}
                
                {view === 'course' && (
                    <CoursePlayer 
                        courseId={currentCourseId} 
                        setView={setView} 
                        userId={user.uid} 
                        responses={myResponses} 
                    />
                )}
            </main>
        </div>
    );
};

export default App;