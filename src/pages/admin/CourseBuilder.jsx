import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { getPublicPath } from '../../utils';

// --- Sub-Component: Module Editor ---
const ModuleEditor = ({ module, updateModule, removeModule }) => {
    
    // --- Page Break View ---
    if (module.type === 'break') {
        return (
            <div className="bg-gray-100 p-4 rounded shadow border-2 border-dashed border-gray-400 flex flex-col items-center justify-center relative">
                <span className="font-bold text-gray-500 tracking-widest">--- PAGE BREAK ---</span>
                <p className="text-xs text-gray-400 mt-1">Content below this will appear on the next page.</p>
                
                {/* Type Switcher (in case they want to change it back) */}
                <select 
                    value={module.type} 
                    onChange={(e) => updateModule(module.id, 'type', e.target.value)} 
                    className="absolute left-4 top-4 border p-1 rounded text-xs"
                >
                    <option value="video">Video</option>
                    <option value="text">Text</option>
                    <option value="quiz">Quiz</option>
                    <option value="break">Page Break</option>
                </select>

                <button onClick={() => removeModule(module.id)} className="absolute right-4 top-4 text-red-500 font-bold hover:text-red-700">&times;</button>
            </div>
        );
    }

    // --- Standard Content View ---
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
        <div className="bg-white p-4 rounded shadow border-l-4 border-indigo-500 space-y-3">
            {/* Header Row: Type, Title, Delete Button (Flex layout to prevent overlap) */}
            <div className="flex items-center gap-3">
                <select 
                    value={module.type} 
                    onChange={(e) => updateModule(module.id, 'type', e.target.value)} 
                    className="border p-2 rounded text-sm bg-gray-50 w-32"
                >
                    <option value="video">Video</option>
                    <option value="text">Text</option>
                    <option value="quiz">Quiz</option>
                    <option value="break">Page Break</option>
                </select>

                <input 
                    className="font-bold border-b flex-1 p-2 focus:outline-none focus:border-indigo-500" 
                    value={module.title} 
                    onChange={(e) => updateModule(module.id, 'title', e.target.value)} 
                    placeholder="Module Title" 
                />

                <button 
                    onClick={() => removeModule(module.id)} 
                    className="text-red-500 font-bold hover:bg-red-50 p-2 rounded"
                    title="Remove Module"
                >
                    &times;
                </button>
            </div>
            
            {module.type !== 'quiz' ? (
                <textarea className="w-full border p-2" rows="3" value={module.content || ''} onChange={(e) => updateModule(module.id, 'content', e.target.value)} placeholder="Content (Text) or YouTube URL (Video)" />
            ) : (
                <div className="bg-gray-50 p-4 rounded border">
                    <div className="mb-4 text-sm font-bold text-gray-700">Quiz Builder</div>
                    {(module.questions || []).map((q, qIdx) => {
                        const isGraded = q.correctIdx !== null && q.correctIdx !== undefined && q.correctIdx !== -1;
                        return (
                            <div key={q.id} className="mb-6 p-3 bg-white border rounded">
                                <input className="w-full border-b mb-2 p-1 font-medium" value={q.text} onChange={e => updateQuestion(qIdx, 'text', e.target.value)} placeholder="Question Text" />
                                <div className="mb-3 flex items-center">
                                    <label className="inline-flex items-center text-xs text-gray-600 cursor-pointer">
                                        <input type="checkbox" checked={isGraded} onChange={() => toggleGrading(qIdx)} className="mr-2 h-4 w-4 text-indigo-600 rounded"/>
                                        This question has a correct answer (Graded)
                                    </label>
                                </div>
                                <div className="space-y-2">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center gap-2">
                                            {isGraded && (
                                                <input type="radio" name={`correct_${q.id}`} checked={q.correctIdx === oIdx} onChange={() => updateQuestion(qIdx, 'correctIdx', oIdx)} />
                                            )}
                                            <input className="border p-1 rounded flex-1 text-sm" value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} />
                                            <button onClick={() => {
                                                 const newQs = [...module.questions];
                                                 newQs[qIdx].options = newQs[qIdx].options.filter((_, i) => i !== oIdx);
                                                 if(isGraded && newQs[qIdx].correctIdx >= newQs[qIdx].options.length) newQs[qIdx].correctIdx = 0;
                                                 updateModule(module.id, 'questions', newQs);
                                            }} className="text-red-500 text-xs">x</button>
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                        const newQs = [...module.questions];
                                        newQs[qIdx].options.push('New Option');
                                        updateModule(module.id, 'questions', newQs);
                                    }} className="text-xs text-blue-600">+ Add Option</button>
                                </div>
                                <div className="mt-2 text-right">
                                    <button onClick={() => {
                                        const newQs = module.questions.filter((_, i) => i !== qIdx);
                                        updateModule(module.id, 'questions', newQs);
                                    }} className="text-red-600 text-xs underline">Remove Question</button>
                                </div>
                            </div>
                        );
                    })}
                    <button onClick={addQuestion} className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-500 rounded">+ Add Question</button>
                </div>
            )}
        </div>
    );
};

// --- Main Component ---
const CourseBuilder = ({ userId, setView, existingCourseId }) => {
    // Default Empty State
    const defaultState = { 
        id: `course_${Date.now()}`, 
        title: '', 
        description: '', 
        modules: [], 
        createdAt: new Date().toISOString(), 
        createdBy: userId 
    };

    const [course, setCourse] = useState(defaultState);
    const [loading, setLoading] = useState(!!existingCourseId);

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
    const addModule = () => setCourse(p => ({...p, modules: [...p.modules, {id: `mod_${Date.now()}`, title: 'New Module', type: 'text', content: '', questions: []}]}));
    
    // Helper to add a page break quickly
    const addPageBreak = () => setCourse(p => ({...p, modules: [...p.modules, {id: `mod_${Date.now()}`, title: 'Page Break', type: 'break'}]}));

    const save = async () => { 
        await setDoc(doc(db, getPublicPath('courses'), course.id), course); 
        setView('manageCourses'); 
    };

    if (loading) return <div className="p-8">Loading course data...</div>;

    return (
        <div className="p-8 h-full overflow-y-auto">
            <h1 className="text-3xl font-bold mb-4">{existingCourseId ? 'Edit Course' : 'Create New Course'}</h1>
            <div className="bg-white p-6 rounded shadow space-y-4">
                <input className="w-full border p-2 text-xl font-bold" placeholder="Course Title" value={course.title} onChange={e => setCourse({...course, title: e.target.value})} />
                <textarea className="w-full border p-2" placeholder="Description" value={course.description} onChange={e => setCourse({...course, description: e.target.value})} />
                
                {course.modules.map(m => (
                    <ModuleEditor 
                        key={m.id} 
                        module={m} 
                        updateModule={updateModule} 
                        removeModule={(id) => setCourse(p => ({...p, modules: p.modules.filter(x => x.id !== id)}))} 
                    />
                ))}
                
                <div className="flex gap-4">
                    <button onClick={addModule} className="bg-blue-500 text-white px-4 py-2 rounded flex-1">+ Add Module</button>
                    <button onClick={addPageBreak} className="bg-gray-600 text-white px-4 py-2 rounded flex-1 font-bold border-2 border-dashed border-gray-400">--- Add Page Break ---</button>
                </div>

                <hr className="my-4"/>

                <button onClick={save} className="bg-green-600 text-white px-4 py-2 rounded w-full font-bold text-lg">
                    {existingCourseId ? 'Save Changes' : 'Publish Course'}
                </button>
            </div>
        </div>
    );
};

export default CourseBuilder;