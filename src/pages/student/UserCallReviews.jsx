import React, { useState, useRef } from 'react';
import { formatTime } from '../../utils';

const UserCallReviews = ({ reviews }) => {
    const [selectedReview, setSelectedReview] = useState(null);
    const audioRef = useRef(null);
    
    // Sort by newest first
    const sortedReviews = [...reviews].sort((a,b) => new Date(b.reviewedAt) - new Date(a.reviewedAt));

    const jumpToTime = (time) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            audioRef.current.play();
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">My Call Reviews</h1>
            {reviews.length === 0 ? (
                <p className="text-gray-500">No calls have been graded yet.</p>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* List */}
                    <div className="space-y-4">
                        {sortedReviews.map(r => (
                            <div 
                                key={r.id} 
                                onClick={() => setSelectedReview(r)}
                                className={`p-4 rounded shadow cursor-pointer border-l-4 ${selectedReview?.id === r.id ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-gray-700">{new Date(r.reviewedAt).toLocaleDateString()}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${r.totalScore/r.maxScore > 0.7 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {Math.round((r.totalScore / r.maxScore) * 100)}%
                                    </span>
                                </div>
                                <div className="text-sm text-gray-500">Score: {r.totalScore}/{r.maxScore}</div>
                            </div>
                        ))}
                    </div>

                    {/* Detail View */}
                    <div className="lg:col-span-2">
                        {selectedReview ? (
                            <div className="bg-white p-6 rounded shadow border">
                                <h3 className="text-xl font-bold mb-4">Review Details</h3>
                                <audio ref={audioRef} controls src={selectedReview.audioUrl} className="w-full mb-6" />
                                
                                <div className="mb-6">
                                    <h4 className="font-bold text-gray-700 border-b mb-2">Scorecard</h4>
                                    <div className="grid gap-2">
                                        {selectedReview.criteria.map((c, i) => (
                                            <div key={i} className="flex justify-between text-sm">
                                                <span>{c.label}</span>
                                                <span className="font-mono font-bold">{c.points} / {c.maxPoints}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-2 pt-2 border-t flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span>{selectedReview.totalScore} / {selectedReview.maxScore}</span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-bold text-gray-700 border-b mb-2">Manager Comments</h4>
                                    {selectedReview.comments && selectedReview.comments.length > 0 ? (
                                        <div className="space-y-2">
                                            {selectedReview.comments.map((c, i) => (
                                                <div key={i} className="bg-gray-100 p-3 rounded text-sm flex gap-2">
                                                    <button 
                                                        onClick={() => jumpToTime(c.timestamp)}
                                                        className="font-bold text-indigo-600 hover:underline whitespace-nowrap"
                                                        title="Play from this timestamp"
                                                    >
                                                        {formatTime(c.timestamp)}
                                                    </button>
                                                    <span>{c.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-gray-500 italic">No comments added.</p>}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 border-2 border-dashed rounded-lg">Select a review to see details</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserCallReviews;