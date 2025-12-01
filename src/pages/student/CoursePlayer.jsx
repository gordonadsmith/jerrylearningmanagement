import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, writeBatch, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { getPublicPath, getEmbedUrl } from '../../utils';
import QuizPlayer from '../../components/QuizPlayer';

const CoursePlayer = ({ courseId, setView, userId, responses }) => {
    const [course, setCourse] = useState(null);
    const [currentPageIdx, setCurrentPageIdx] = useState(0);
    const [pageQuizzesPassed, setPageQuizzesPassed] = useState(new Set()); 
    const [writtenAnswers, setWrittenAnswers] = useState({});
    const [signatureAnswers, setSignatureAnswers] = useState({}); 

    useEffect(() => { 
        if(courseId) {
            onSnapshot(doc(db, getPublicPath('courses'), courseId), s => setCourse(s.data())); 
        }
    }, [courseId]);

    // --- 1. GROUP MODULES INTO PAGES ---
    const pages = useMemo(() => {
        if (!course || !course.modules) return [];
        const groups = [];
        let currentGroup = [];
        
        course.modules.forEach(m => {
            if (m.type === 'break') {
                if (currentGroup.length > 0) groups.push(currentGroup);
                currentGroup = [];
            } else {
                currentGroup.push(m);
            }
        });
        if (currentGroup.length > 0) groups.push(currentGroup);
        return groups;
    }, [course]);

    // --- 2. RESUME LOGIC ---
    useEffect(() => {
        if (pages.length > 0) {
            const firstIncompletePageIdx = pages.findIndex(pageMods => {
                return pageMods.some(m => !responses.some(r => r.moduleId === m.id && r.courseId === courseId));
            });
            
            if (firstIncompletePageIdx !== -1) {
                setCurrentPageIdx(firstIncompletePageIdx);
            }
        }
    }, [pages.length]);

    // Reset local quiz state when changing pages
    useEffect(() => {
        setPageQuizzesPassed(new Set());
    }, [currentPageIdx]);

    if(!course || pages.length === 0) return <div className="p-10 text-slate-500 font-bold">Loading course content...</div>;

    const currentPageModules = pages[currentPageIdx];

    // --- 3. CHECK PAGE COMPLETION STATUS ---
    // Quizzes
    const quizzesOnPage = currentPageModules.filter(m => m.type === 'quiz');
    const allQuizzesPassed = quizzesOnPage.every(q => 
        responses.some(r => r.moduleId === q.id && r.courseId === course.id) || pageQuizzesPassed.has(q.id)
    );

    // Written Responses
    const writtenModulesOnPage = currentPageModules.filter(m => m.type === 'written');
    const allWrittenFilled = writtenModulesOnPage.every(m => {
        const isDone = responses.some(r => r.moduleId === m.id && r.courseId === course.id);
        if (isDone) return true;
        // Check if state exists and has content
        return writtenAnswers[m.id] && writtenAnswers[m.id].trim().length > 0;
    });

    // Signature Modules
    const signatureModulesOnPage = currentPageModules.filter(m => m.type === 'signature');
    const allSignaturesFilled = signatureModulesOnPage.every(m => {
        const isDone = responses.some(r => r.moduleId === m.id && r.courseId === course.id);
        if (isDone) return true;
        const sigs = signatureAnswers[m.id];
        return sigs && sigs.sig1?.trim().length > 0 && sigs.sig2?.trim().length > 0;
    });

    const canProceed = allQuizzesPassed && allWrittenFilled && allSignaturesFilled; 

    // --- 4. HANDLE 'NEXT' BUTTON ---
    const handleNext = async () => {
        const batch = writeBatch(db);
        let updatesCount = 0;

        // 1. Mark visible modules on this page
        currentPageModules.forEach(m => {
            const alreadyDone = responses.some(r => r.moduleId === m.id && r.courseId === course.id);
            if (!alreadyDone) {
                const ref = doc(collection(db, getPublicPath('responses')));
                const payload = {
                    userId,
                    courseId: course.id,
                    moduleId: m.id,
                    timestamp: new Date().toISOString()
                };
                
                // Save Written Response
                if (m.type === 'written' && writtenAnswers[m.id]) {
                    payload.answer = writtenAnswers[m.id];
                }

                // Save Signature Response
                if (m.type === 'signature' && signatureAnswers[m.id]) {
                    payload.answer = signatureAnswers[m.id];
                }

                batch.set(ref, payload);
                updatesCount++;
            }
        });

        // 2. Mark hidden "Page Break" modules that follow this page
        const lastModuleOnPage = currentPageModules[currentPageModules.length - 1];
        const rawIndex = course.modules.findIndex(m => m.id === lastModuleOnPage.id);
        
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
                break;
            }
        }

        if (updatesCount > 0) await batch.commit();

        if (currentPageIdx < pages.length - 1) {
            setCurrentPageIdx(currentPageIdx + 1);
            window.scrollTo(0, 0);
        } else {
            alert("Course Completed! Great work.");
            setView('myCourses');
        }
    };

    return (
        <div className="p-8 h-full overflow-y-auto bg-slate-50">
            <button onClick={() => setView('myCourses')} className="mb-4 text-rose-600 font-bold hover:underline flex items-center gap-1">
                <span>&larr;</span> Back to Dashboard
            </button>
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-extrabold text-slate-900">{course.title}</h1>
                <div className="text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-100">
                    Page {currentPageIdx + 1} of {pages.length}
                </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-200 h-3 rounded-full mb-8 overflow-hidden">
                <div 
                    className="bg-rose-500 h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(244,63,94,0.5)]" 
                    style={{ width: `${((currentPageIdx) / pages.length) * 100}%` }}
                ></div>
            </div>

            {/* --- RENDER MODULES --- */}
            <div className="space-y-8 max-w-4xl mx-auto">
                {currentPageModules.map((module) => {
                    const isModDone = responses.some(r => r.moduleId === module.id && r.courseId === course.id);
                    const showHeader = module.title && module.title.trim().length > 0;

                    return (
                        <div key={module.id} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                            {showHeader && (
                                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                                    <span className="bg-slate-100 text-slate-600 text-xs font-black px-3 py-1 rounded uppercase tracking-wider">
                                        {module.type === 'written' || module.type === 'signature' ? 'Requirement' : module.type}
                                    </span>
                                    <h3 className="font-bold text-2xl text-slate-800">{module.title}</h3>
                                    {isModDone && <span className="ml-auto text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full">✓ Completed</span>}
                                </div>
                            )}
                            
                            <div className="prose max-w-none text-slate-700">
                                {module.type === 'video' && (
                                    <div className="aspect-w-16 aspect-h-9 shadow-lg rounded-xl overflow-hidden">
                                        <iframe 
                                            src={getEmbedUrl(module.content)} 
                                            className="w-full h-96 bg-black" 
                                            title={module.title} 
                                            allowFullScreen 
                                        />
                                    </div>
                                )}
                                
                                {module.type === 'text' && (
                                    <div className="whitespace-pre-wrap leading-relaxed text-lg">{module.content}</div>
                                )}
                                
                                {module.type === 'quiz' && (
                                    isModDone ? (
                                        <div className="p-6 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-center border border-emerald-100">
                                            ✅ Quiz Passed!
                                        </div>
                                    ) : (
                                        <QuizPlayer 
                                            module={module} 
                                            onPass={() => setPageQuizzesPassed(prev => new Set(prev).add(module.id))} 
                                        />
                                    )
                                )}

                                {module.type === 'written' && (
                                    <div className="space-y-4">
                                        <div className="p-5 bg-slate-50 border-l-4 border-slate-400 text-slate-800 font-medium italic rounded-r-lg">
                                            {module.content}
                                        </div>
                                        {isModDone ? (
                                            <div className="bg-white p-4 rounded-xl text-slate-600 border border-slate-200 shadow-sm">
                                                <div className="text-xs font-black uppercase mb-2 text-rose-500">Your Answer:</div>
                                                <p className="italic">"{responses.find(r => r.moduleId === module.id && r.courseId === course.id)?.answer || "Response submitted."}"</p>
                                            </div>
                                        ) : (
                                            <textarea 
                                                className="w-full border border-slate-300 rounded-xl p-4 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all text-slate-800"
                                                rows="5"
                                                placeholder="Type your answer here..."
                                                value={writtenAnswers[module.id] || ''}
                                                // FIXED: Using functional update to prevent state issues while typing
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setWrittenAnswers(prev => ({...prev, [module.id]: val}));
                                                }}
                                            />
                                        )}
                                    </div>
                                )}

                                {module.type === 'signature' && (
                                    <div className="space-y-6">
                                        {/* Signature 1 */}
                                        <div className="p-6 rounded-xl border border-slate-200 bg-slate-50">
                                            <p className="text-slate-800 font-bold mb-4 leading-relaxed">
                                                "I confirm that I've completed this training and understand the associated expectations, workflows, and policies."
                                            </p>
                                            {isModDone ? (
                                                <div className="bg-emerald-100 text-emerald-900 px-4 py-2 rounded-lg border border-emerald-200 font-mono text-sm inline-block">
                                                    Signed: <span className="font-bold">{responses.find(r => r.moduleId === module.id && r.courseId === course.id)?.answer?.sig1 || "Completed"}</span>
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className="block text-xs font-black text-slate-400 uppercase mb-1">Type Full Name to Sign</label>
                                                    <input 
                                                        className="w-full border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                                                        placeholder="e.g. Jane Doe"
                                                        value={signatureAnswers[module.id]?.sig1 || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setSignatureAnswers(prev => ({
                                                                ...prev, 
                                                                [module.id]: { ...prev[module.id], sig1: val, sig2: prev[module.id]?.sig2 }
                                                            }));
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Signature 2 */}
                                        <div className="p-6 rounded-xl border border-slate-200 bg-slate-50">
                                            <p className="text-slate-800 font-bold mb-4 leading-relaxed">
                                                "I understand that failure to comply may result in coaching, retraining, or further potential disciplinary action."
                                            </p>
                                            {isModDone ? (
                                                <div className="bg-emerald-100 text-emerald-900 px-4 py-2 rounded-lg border border-emerald-200 font-mono text-sm inline-block">
                                                    Signed: <span className="font-bold">{responses.find(r => r.moduleId === module.id && r.courseId === course.id)?.answer?.sig2 || "Completed"}</span>
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className="block text-xs font-black text-slate-400 uppercase mb-1">Type Full Name to Sign</label>
                                                    <input 
                                                        className="w-full border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                                                        placeholder="e.g. Jane Doe"
                                                        value={signatureAnswers[module.id]?.sig2 || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setSignatureAnswers(prev => ({
                                                                ...prev, 
                                                                [module.id]: { ...prev[module.id], sig2: val, sig1: prev[module.id]?.sig1 }
                                                            }));
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- FOOTER NAVIGATION --- */}
            <div className="max-w-4xl mx-auto mt-12 flex justify-between items-center pt-8 border-t border-slate-200">
                <button 
                    disabled={currentPageIdx === 0} 
                    onClick={() => { setCurrentPageIdx(currentPageIdx - 1); window.scrollTo(0,0); }} 
                    className="px-6 py-3 border-2 border-slate-200 rounded-xl text-slate-500 font-bold hover:border-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    Previous Page
                </button>
                
                <button 
                    onClick={handleNext} 
                    disabled={!canProceed}
                    className={`px-8 py-3 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform active:scale-95 ${
                        canProceed 
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20' 
                        : 'bg-slate-300 cursor-not-allowed text-slate-500'
                    }`}
                >
                    {!canProceed ? 'Complete Tasks to Continue' : (
                        currentPageIdx === pages.length - 1 ? 'Finish Course 🎉' : 'Mark Page Complete & Next →'
                    )}
                </button>
            </div>
            
            <div className="h-24"></div>
        </div>
    );
};

export default CoursePlayer;