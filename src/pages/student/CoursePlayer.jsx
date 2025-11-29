import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, writeBatch, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { getPublicPath, getEmbedUrl } from '../../utils';
import QuizPlayer from '../../components/QuizPlayer';

const CoursePlayer = ({ courseId, setView, userId, responses }) => {
    const [course, setCourse] = useState(null);
    const [currentPageIdx, setCurrentPageIdx] = useState(0);
    const [pageQuizzesPassed, setPageQuizzesPassed] = useState(new Set()); // Track passed quiz IDs

    useEffect(() => { 
        if(courseId) {
            onSnapshot(doc(db, getPublicPath('courses'), courseId), s => setCourse(s.data())); 
        }
    }, [courseId]);

    // --- 1. GROUP MODULES INTO PAGES (The Logic Fix) ---
    // This transforms the flat list of modules into pages based on 'break' types
    const pages = useMemo(() => {
        if (!course || !course.modules) return [];
        const groups = [];
        let currentGroup = [];
        
        course.modules.forEach(m => {
            if (m.type === 'break') {
                // When we hit a break, push the current group to pages and start fresh
                if (currentGroup.length > 0) groups.push(currentGroup);
                currentGroup = [];
            } else {
                // Add actual content to the current page
                currentGroup.push(m);
            }
        });
        // Push the final group
        if (currentGroup.length > 0) groups.push(currentGroup);
        return groups;
    }, [course]);

    // --- 2. RESUME LOGIC ---
    // Automatically jump to the first page that isn't fully complete
    useEffect(() => {
        if (pages.length > 0) {
            const firstIncompletePageIdx = pages.findIndex(pageMods => {
                // A page is incomplete if ANY of its modules are missing from responses
                return pageMods.some(m => !responses.some(r => r.moduleId === m.id && r.courseId === courseId));
            });
            
            if (firstIncompletePageIdx !== -1) {
                setCurrentPageIdx(firstIncompletePageIdx);
            }
        }
    }, [pages.length]); // Run only when pages are first calculated

    // Reset local quiz state when changing pages
    useEffect(() => {
        setPageQuizzesPassed(new Set());
    }, [currentPageIdx]);

    if(!course || pages.length === 0) return <div className="p-10">Loading course content...</div>;

    const currentPageModules = pages[currentPageIdx];

    // --- 3. CHECK PAGE COMPLETION STATUS ---
    // Are there quizzes on this page?
    const quizzesOnPage = currentPageModules.filter(m => m.type === 'quiz');
    
    // Check if quizzes are passed (either in DB history OR locally in this session)
    const allQuizzesPassed = quizzesOnPage.every(q => 
        responses.some(r => r.moduleId === q.id && r.courseId === course.id) || pageQuizzesPassed.has(q.id)
    );

    const canProceed = allQuizzesPassed; 

    // --- 4. HANDLE 'NEXT' BUTTON ---
    const handleNext = async () => {
        // Batch write: Mark ALL modules on this page as complete
        const batch = writeBatch(db);
        let updatesCount = 0;

        // 1. Mark visible modules on this page
        currentPageModules.forEach(m => {
            const alreadyDone = responses.some(r => r.moduleId === m.id && r.courseId === course.id);
            if (!alreadyDone) {
                const ref = doc(collection(db, getPublicPath('responses')));
                batch.set(ref, {
                    userId,
                    courseId: course.id,
                    moduleId: m.id,
                    timestamp: new Date().toISOString()
                });
                updatesCount++;
            }
        });

        // 2. Mark hidden "Page Break" modules that follow this page
        // (This fixes the % completion bug and "Last Module" check)
        const lastModuleOnPage = currentPageModules[currentPageModules.length - 1];
        const rawIndex = course.modules.findIndex(m => m.id === lastModuleOnPage.id);
        
        // Look ahead in the raw list for breaks
        for (let i = rawIndex + 1; i < course.modules.length; i++) {
            const nextMod = course.modules[i];
            if (nextMod.type === 'break') {
                const alreadyDone = responses.some(r => r.moduleId === nextMod.id && r.courseId === course.id);
                if (!alreadyDone) {
                    const ref = doc(collection(db, getPublicPath('responses')));
                    batch.set(ref, {
                        userId,
                        courseId: course.id,
                        moduleId: nextMod.id,
                        timestamp: new Date().toISOString()
                    });
                    updatesCount++;
                }
            } else {
                // We hit real content (start of next page), stop looking ahead
                break;
            }
        }

        if (updatesCount > 0) await batch.commit();

        // Navigate
        if (currentPageIdx < pages.length - 1) {
            setCurrentPageIdx(currentPageIdx + 1);
            window.scrollTo(0, 0);
        } else {
            alert("Course Completed! Great work.");
            setView('myCourses');
        }
    };

    return (
        <div className="p-8 h-full overflow-y-auto bg-gray-50">
            <button onClick={() => setView('myCourses')} className="mb-4 text-indigo-600 font-bold hover:underline">&larr; Back to Dashboard</button>
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
                <div className="text-sm font-bold text-gray-500 bg-white px-3 py-1 rounded shadow">
                    Page {currentPageIdx + 1} of {pages.length}
                </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 h-3 rounded-full mb-8 overflow-hidden">
                <div 
                    className="bg-indigo-600 h-full transition-all duration-500 ease-out" 
                    style={{ width: `${((currentPageIdx) / pages.length) * 100}%` }}
                ></div>
            </div>

            {/* --- RENDER MODULES --- */}
            <div className="space-y-8 max-w-4xl mx-auto">
                {currentPageModules.map((module) => {
                    const isModDone = responses.some(r => r.moduleId === module.id && r.courseId === course.id);
                    const showHeader = module.title && module.title.trim().length > 0;

                    return (
                        <div key={module.id} className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
                            {showHeader && (
                                <div className="flex items-center gap-3 mb-4 border-b pb-2">
                                    <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded uppercase">{module.type}</span>
                                    <h3 className="font-bold text-2xl text-gray-800">{module.title}</h3>
                                    {isModDone && <span className="ml-auto text-green-600 font-bold text-sm">✓ Completed</span>}
                                </div>
                            )}
                            
                            <div className="prose max-w-none">
                                {module.type === 'video' && (
                                    <div className="aspect-w-16 aspect-h-9">
                                        <iframe 
                                            src={getEmbedUrl(module.content)} 
                                            className="w-full h-96 rounded bg-black" 
                                            title={module.title} 
                                            allowFullScreen 
                                        />
                                    </div>
                                )}
                                
                                {module.type === 'text' && (
                                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-lg">{module.content}</div>
                                )}
                                
                                {module.type === 'quiz' && (
                                    isModDone ? (
                                        <div className="p-6 bg-green-50 text-green-800 rounded-lg font-bold text-center border border-green-200">
                                            ✅ Quiz Passed!
                                        </div>
                                    ) : (
                                        <QuizPlayer 
                                            module={module} 
                                            onPass={() => setPageQuizzesPassed(prev => new Set(prev).add(module.id))} 
                                        />
                                    )
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- FOOTER NAVIGATION --- */}
            <div className="max-w-4xl mx-auto mt-8 flex justify-between items-center pt-8 border-t border-gray-300">
                <button 
                    disabled={currentPageIdx === 0} 
                    onClick={() => { setCurrentPageIdx(currentPageIdx - 1); window.scrollTo(0,0); }} 
                    className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-600 font-bold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Previous Page
                </button>
                
                <button 
                    onClick={handleNext} 
                    disabled={!canProceed}
                    className={`px-8 py-3 rounded-lg text-white font-bold text-lg shadow-lg transition-transform transform active:scale-95 ${
                        canProceed 
                        ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' 
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                >
                    {!canProceed ? 'Complete Quiz to Continue' : (
                        currentPageIdx === pages.length - 1 ? 'Finish Course 🎉' : 'Mark Page Complete & Next →'
                    )}
                </button>
            </div>
            
            <div className="h-20"></div>
        </div>
    );
};

export default CoursePlayer;