import React, { useState } from 'react';

const QuizPlayer = ({ module, onPass }) => {
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(null);

    const handleSubmit = () => {
        let correctCount = 0;
        let scorableQuestionsCount = 0;

        module.questions.forEach((q, idx) => {
            // Check if this question is graded (correctIdx is not null/undefined/-1)
            const isGraded = q.correctIdx !== null && q.correctIdx !== undefined && q.correctIdx !== -1;

            if (isGraded) {
                scorableQuestionsCount++;
                if (answers[idx] === q.correctIdx) {
                    correctCount++;
                }
            }
        });

        // If there are no scorable questions (pure survey), give 100%
        const pct = scorableQuestionsCount === 0 ? 100 : (correctCount / scorableQuestionsCount) * 100;
        
        setScore(pct);
        setSubmitted(true);
        if (pct >= 75) onPass();
    };

    return (
        <div className="space-y-6">
            <div className="bg-indigo-50 p-4 rounded text-sm text-indigo-800">
                Answer all questions. Pass mark: 75%
            </div>
            {module.questions.map((q, qIdx) => {
                 const isGraded = q.correctIdx !== null && q.correctIdx !== undefined && q.correctIdx !== -1;
                 
                 return (
                    <div key={q.id} className="p-4 border rounded bg-white">
                        <div className="flex justify-between items-center mb-3">
                            <p className="font-bold text-lg">{qIdx+1}. {q.text}</p>
                            {!isGraded && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Survey / No Right Answer</span>}
                        </div>
                        
                        <div className="space-y-2">
                            {q.options.map((opt, oIdx) => {
                                let itemClass = "p-3 border rounded cursor-pointer flex items-center hover:bg-gray-50";
                                
                                if (submitted) {
                                    if (isGraded) {
                                        // Color logic for Graded questions
                                        if (oIdx === q.correctIdx) {
                                            // This is the correct answer -> Green
                                            itemClass = "p-3 border border-green-500 bg-green-50 rounded flex items-center";
                                        } else if (answers[qIdx] === oIdx && oIdx !== q.correctIdx) {
                                            // User picked this, but it's wrong -> Red
                                            itemClass = "p-3 border border-red-500 bg-red-50 rounded flex items-center";
                                        }
                                    } else {
                                        // Logic for Ungraded questions (Neutral)
                                        if (answers[qIdx] === oIdx) {
                                            itemClass = "p-3 border border-indigo-500 bg-indigo-50 rounded flex items-center";
                                        }
                                    }
                                } else if (answers[qIdx] === oIdx) {
                                    // Selection state before submission
                                    itemClass = "p-3 border border-indigo-500 bg-indigo-50 rounded flex items-center";
                                }
                                
                                return (
                                    <div key={oIdx} onClick={() => !submitted && setAnswers({...answers, [qIdx]: oIdx})} className={itemClass}>
                                        <div className={`w-4 h-4 border rounded-full mr-3 flex items-center justify-center ${answers[qIdx] === oIdx ? 'border-indigo-600' : 'border-gray-400'}`}>
                                            {answers[qIdx] === oIdx && <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>}
                                        </div>
                                        {opt}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            
            {!submitted ? (
                <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold">Submit Quiz</button>
            ) : (
                <div className="mt-4 p-4 bg-gray-100 rounded text-center">
                    <h3 className="text-xl font-bold mb-2">You Scored: {Math.round(score)}%</h3>
                    {score >= 75 ? (
                        <p className="text-green-600 font-bold">Passed! You can now continue.</p>
                    ) : (
                        <button onClick={() => { setSubmitted(false); setAnswers({}); setScore(null); }} className="px-4 py-2 bg-gray-600 text-white rounded">Retry Quiz</button>
                    )}
                </div>
            )}
        </div>
    );
};
export default QuizPlayer;