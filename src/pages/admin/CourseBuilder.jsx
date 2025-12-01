import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { getPublicPath } from '../../utils';

// --- Sub-Component: Module Editor ---
const ModuleEditor = ({ module, updateModule, removeModule }) => {
    
    // --- Page Break View ---
    if (module.type === 'break') {
        return (
            <div className="bg-slate-100 p-4 rounded-xl shadow-inner border-2 border-dashed border-slate-300 flex flex-col items-center justify-center relative my-6">
                <span className="font-black text-slate-400 tracking-[0.2em] text-sm">--- PAGE BREAK ---</span>
                <p className="text-xs text-slate-400 mt-1 font-medium">Content below this will appear on the next page.</p>
                
                {/* Type Switcher */}
                <select 
                    value={module.type} 
                    onChange={(e) => updateModule(module.id, 'type', e.target.value)} 
                    className="absolute left-4 top-4 border border-slate-300 p-1 rounded text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                    <option value="video">Video</option>
                    <option value="text">Text</option>
                    <option value="quiz">Quiz</option>
                    <option value="written">Written Response</option>
                    <option value="signature">Signatures</option>
                    <option value="break">Page Break</option>
                </select>

                <button onClick={() => removeModule(module.id)} className="absolute right-4 top-4 text-slate-400 hover:text-red-500 font-bold transition-colors">&times;</button>
            </div>
        );
    }

    // --- Standard Content Logic ---
    const addQuestion = () => {
        const currentQuestions = module.questions || [];
        updateModule(module.id, 'questions', [...currentQuestions, { 
            id: Date.now(), text: 'New Question', options: ['Option A', 'Option B'], correctIdx: 0 
        }]);
    };

    const updateQuestion = (qIdx, field, val) => {
        const newQs = [...(module.questions || [])];
        newQs[qIdx][field] = val;
        updateModule(module.id, 'questions', newQs);
    };

    const updateOption = (qIdx, oIdx, val) => {
        const newQs = [...(module.questions || [])];
        newQs[qIdx].options[oIdx] = val;
        updateModule(module.id, 'questions', newQs);
    };

    const toggleGrading = (qIdx) => {
        const newQs = [...(module.questions || [])];
        const currentVal = newQs[qIdx].correctIdx;
        newQs[qIdx].correctIdx = currentVal === null ? 0 : null;
        updateModule(module.id, 'questions', newQs);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-rose-500 space-y-4 relative transition-all hover:shadow-md">
            {/* Header Row */}
            <div className="flex items-center gap-3">
                <select 
                    value={module.type} 
                    onChange={(e) => updateModule(module.id, 'type', e.target.value)} 
                    className="border border-slate-300 p-2 rounded-lg text-sm bg-slate-50 w-40 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                    <option value="video">Video</option>
                    <option value="text">Text</option>
                    <option value="quiz">Quiz</option>
                    <option value="written">Written Response</option>
                    <option value="signature">Signatures</option>
                    <option value="break">Page Break</option>
                </select>

                <input 
                    className="font-bold border-b border-slate-200 flex-1 p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 transition-colors" 
                    value={module.title} 
                    onChange={(e) => updateModule(module.id, 'title', e.target.value)} 
                    placeholder="Module Title" 
                />

                <button 
                    onClick={() => removeModule(module.id)} 
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded transition-all"
                    title="Remove Module"
                >
                    &times;
                </button>
            </div>
            
            {/* Content Inputs based on Type */}
            {module.type === 'video' && (
                <input 
                    className="w-full border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500" 
                    value={module.content || ''} 
                    onChange={(e) => updateModule(module.id, 'content', e.target.value)} 
                    placeholder="Paste YouTube URL here..." 
                />
            )}
            
            {module.type === 'text' && (
                <textarea 
                    className="w-full border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 min-h-[120px]" 
                    rows="4" 
                    value={module.content || ''} 
                    onChange={(e) => updateModule(module.id, 'content', e.target.value)} 
                    placeholder="Enter text content here..." 
                />
            )}

            {module.type === 'written' && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-wide">Question Prompt for Student</label>
                    <textarea 
                        className="w-full border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 min-h-[80px]" 
                        rows="3" 
                        value={module.content || ''} 
                        onChange={(e) => updateModule(module.id, 'content', e.target.value)} 
                        placeholder="e.g., 'Describe how you would handle this objection...'" 
                    />
                </div>
            )}

            {module.type === 'signature' && (
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
                    <div className="text-xs font-black text-slate-500 uppercase tracking-wide mb-2">Signature Requirements (Read-Only Preview)</div>
                    
                    <div className="p-4 bg-white border border-slate-200 rounded-lg">
                        <p className="text-slate-700 text-sm font-medium mb-3 italic">"I confirm that I've completed this training and understand the associated expectations, workflows, and policies."</p>
                        <div className="border border-slate-200 bg-slate-50 p-2 rounded text-sm text-slate-400">Student will type name here...</div>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-lg">
                        <p className="text-slate-700 text-sm font-medium mb-3 italic">"I understand that failure to comply may result in coaching, retraining, or further potential disciplinary action."</p>
                        <div className="border border-slate-200 bg-slate-50 p-2 rounded text-sm text-slate-400">Student will type name here...</div>
                    </div>
                </div>
            )}

            {module.type === 'quiz' && (
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                    <div className="mb-4 text-xs font-black text-slate-500 uppercase tracking-wide">Quiz Questions</div>
                    {(module.questions || []).map((q, qIdx) => {
                        const isGraded = q.correctIdx !== null && q.correctIdx !== undefined && q.correctIdx !== -1;
                        return (
                            <div key={q.id} className="mb-6 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <input 
                                    className="w-full border-b border-slate-200 mb-3 p-2 font-bold text-slate-800 focus:outline-none focus:border-rose-500" 
                                    value={q.text} 
                                    onChange={e => updateQuestion(qIdx, 'text', e.target.value)} 
                                    placeholder="Enter Question Text" 
                                />
                                
                                <div className="mb-4 flex items-center">
                                    <label className="inline-flex items-center text-xs text-slate-500 font-bold cursor-pointer hover:text-rose-600 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={isGraded} 
                                            onChange={() => toggleGrading(qIdx)} 
                                            className="mr-2 h-4 w-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                                        />
                                        Graded Question (Requires correct answer)
                                    </label>
                                </div>

                                <div className="space-y-3">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center gap-3">
                                            {isGraded && (
                                                <input 
                                                    type="radio" 
                                                    name={`correct_${q.id}`} 
                                                    checked={q.correctIdx === oIdx} 
                                                    onChange={() => updateQuestion(qIdx, 'correctIdx', oIdx)} 
                                                    className="text-rose-600 focus:ring-rose-500"
                                                />
                                            )}
                                            <input 
                                                className="border border-slate-300 p-2 rounded-md flex-1 text-sm focus:outline-none focus:border-rose-500" 
                                                value={opt} 
                                                onChange={e => updateOption(qIdx, oIdx, e.target.value)} 
                                            />
                                            <button 
                                                onClick={() => {
                                                     const newQs = [...module.questions];
                                                     newQs[qIdx].options = newQs[qIdx].options.filter((_, i) => i !== oIdx);
                                                     if(isGraded && newQs[qIdx].correctIdx >= newQs[qIdx].options.length) newQs[qIdx].correctIdx = 0;
                                                     updateModule(module.id, 'questions', newQs);
                                                }} 
                                                className="text-slate-400 hover:text-red-500 text-lg font-bold"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => { const newQs = [...module.questions]; newQs[qIdx].options.push('New Option'); updateModule(module.id, 'questions', newQs); }} 
                                        className="text-xs text-rose-600 font-bold hover:text-rose-800 hover:underline mt-2"
                                    >
                                        + Add Option
                                    </button>
                                </div>
                                <div className="mt-4 text-right">
                                    <button 
                                        onClick={() => { const newQs = module.questions.filter((_, i) => i !== qIdx); updateModule(module.id, 'questions', newQs); }} 
                                        className="text-xs text-red-500 hover:text-red-700 font-bold uppercase tracking-wide"
                                    >
                                        Delete Question
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    <button 
                        onClick={addQuestion} 
                        className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 hover:border-rose-400 hover:text-rose-600 rounded-lg font-bold transition-all"
                    >
                        + Add Question
                    </button>
                </div>
            )}
        </div>
    );
};

// --- Main Component ---
const CourseBuilder = ({ userId, setView, existingCourseId, folders = [] }) => {
    // Default Empty State
    const defaultState = { 
        id: `course_${Date.now()}`, 
        title: '', 
        description: '', 
        folderId: '', 
        modules: [], 
        createdAt: new Date().toISOString(), 
        createdBy: userId 
    };

    const [course, setCourse] = useState(defaultState);
    const [loading, setLoading] = useState(!!existingCourseId);
    
    // NEW: State for creating a folder inline
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Fetch existing data if editing
    useEffect(() => {
        if (existingCourseId) {
            const fetchCourse = async () => {
                const docSnap = await getDoc(doc(db, getPublicPath('courses'), existingCourseId));
                if (docSnap.exists()) {
                    setCourse({ id: docSnap.id, ...docSnap.data() });
                } else {
                    alert("Course not found!");
                    setView('manageCourses');
                }
                setLoading(false);
            };
            fetchCourse();
        } else {
            setCourse(defaultState);
            setLoading(false);
        }
    }, [existingCourseId]);

    const updateModule = (mid, k, v) => setCourse(p => ({...p, modules: p.modules.map(m => m.id === mid ? {...m, [k]: v} : m)}));
    
    // UPDATED: title defaults to empty string '' so placeholder shows
    const addModule = () => setCourse(p => ({...p, modules: [...p.modules, {id: `mod_${Date.now()}`, title: '', type: 'text', content: '', questions: []}]}));
    
    // Helper to add a page break quickly
    const addPageBreak = () => setCourse(p => ({...p, modules: [...p.modules, {id: `mod_${Date.now()}`, title: 'Page Break', type: 'break'}]}));

    // NEW: Handle inline folder creation
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            const ref = await addDoc(collection(db, getPublicPath('folders')), {
                name: newFolderName,
                createdAt: new Date().toISOString()
            });
            // Update local course state to use the new folder immediately
            setCourse(prev => ({ ...prev, folderId: ref.id }));
            setIsCreatingFolder(false);
            setNewFolderName('');
        } catch (e) {
            alert("Error creating folder: " + e.message);
        }
    };

    const save = async () => { 
        await setDoc(doc(db, getPublicPath('courses'), course.id), course); 
        setView('manageCourses'); 
    };

    if (loading) return <div className="p-8 text-slate-500 font-bold">Loading course data...</div>;

    return (
        <div className="p-8 bg-slate-50 min-h-full h-full overflow-y-auto">
            <h1 className="text-3xl font-extrabold mb-6 text-slate-900">{existingCourseId ? 'Edit Course' : 'Create New Course'}</h1>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                {/* Course Metadata */}
                <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1">Course Title</label>
                    <input 
                        className="w-full border border-slate-300 p-3 rounded-lg text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500" 
                        placeholder="e.g. Sales Fundamentals 101" 
                        value={course.title} 
                        onChange={e => setCourse({...course, title: e.target.value})} 
                    />
                </div>
                
                <div className="flex gap-6">
                    <div className="flex-1">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-1">Description</label>
                        <textarea 
                            className="w-full border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 min-h-[100px]" 
                            placeholder="Briefly describe what this course covers..." 
                            value={course.description} 
                            onChange={e => setCourse({...course, description: e.target.value})} 
                        />
                    </div>
                    
                    <div className="w-64">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-1">Folder</label>
                        {isCreatingFolder ? (
                            <div className="flex gap-2">
                                <input
                                    className="border border-slate-300 p-2 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500 w-full text-sm"
                                    placeholder="New Folder Name"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    autoFocus
                                />
                                <button onClick={handleCreateFolder} className="text-emerald-600 font-bold hover:bg-emerald-50 px-2 rounded">✓</button>
                                <button onClick={() => setIsCreatingFolder(false)} className="text-red-500 font-bold hover:bg-red-50 px-2 rounded">&times;</button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <select 
                                    className="w-full border border-slate-300 p-3 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                    value={course.folderId || ''}
                                    onChange={e => setCourse({...course, folderId: e.target.value})}
                                >
                                    <option value="">(Uncategorized)</option>
                                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                                <button 
                                    onClick={() => setIsCreatingFolder(true)}
                                    className="bg-slate-100 border border-slate-300 text-slate-600 px-3 rounded-lg font-bold hover:bg-slate-200 hover:text-slate-800 transition-colors"
                                    title="Create New Folder"
                                >
                                    +
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                <hr className="border-slate-100 my-6"/>

                {/* Modules List */}
                <div className="space-y-6">
                    {course.modules.map(m => (
                        <ModuleEditor 
                            key={m.id} 
                            module={m} 
                            updateModule={updateModule} 
                            removeModule={(id) => setCourse(p => ({...p, modules: p.modules.filter(x => x.id !== id)}))} 
                        />
                    ))}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                    <button 
                        onClick={addModule} 
                        className="bg-slate-800 text-white px-6 py-3 rounded-lg flex-1 font-bold hover:bg-slate-700 transition-all shadow-lg shadow-slate-900/10"
                    >
                        + Add Content Module
                    </button>
                    <button 
                        onClick={addPageBreak} 
                        className="bg-white text-slate-500 border-2 border-dashed border-slate-300 px-6 py-3 rounded-lg flex-1 font-bold hover:border-slate-400 hover:text-slate-700 transition-all"
                    >
                        --- Add Page Break ---
                    </button>
                </div>

                <hr className="border-slate-200 my-8"/>

                <button 
                    onClick={save} 
                    className="bg-emerald-600 text-white px-8 py-4 rounded-xl w-full font-extrabold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
                >
                    {existingCourseId ? 'Save Changes' : 'Publish Course'}
                </button>
            </div>
            
            <div className="h-20"></div>
        </div>
    );
};

export default CourseBuilder;