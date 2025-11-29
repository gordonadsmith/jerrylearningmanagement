import React, { useState, useRef } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { getUserPath, formatTime } from '../../utils';

const CallGrader = ({ allUserProfiles, setView }) => {
    const [selectedUser, setSelectedUser] = useState('');
    const [audioFile, setAudioFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [criteria, setCriteria] = useState([{ id: 1, label: 'Greeting', maxPoints: 10, points: 0 }]);
    const [comments, setComments] = useState([]); 
    const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
    const [commentText, setCommentText] = useState('');
    const audioRef = useRef(null);

    const handleFileUpload = async () => {
        if (!audioFile || !selectedUser) return alert("Select user and file first");
        setUploading(true);
        try {
            const storageRef = ref(storage, `calls/${Date.now()}_${audioFile.name}`);
            await uploadBytes(storageRef, audioFile);
            setCurrentAudioUrl(await getDownloadURL(storageRef));
        } catch (e) { alert("Upload failed: " + e.message); }
        setUploading(false);
    };

    const addComment = () => { 
        if (!commentText) return; 
        const timestamp = audioRef.current ? Math.floor(audioRef.current.currentTime) : 0;
        setComments([...comments, { id: Date.now(), timestamp, text: commentText }].sort((a, b) => a.timestamp - b.timestamp)); 
        setCommentText(''); 
    };

    const jumpToTime = (time) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            audioRef.current.play();
        }
    };

    const saveReview = async () => {
        if (!currentAudioUrl) return;
        const totalScore = criteria.reduce((sum, c) => sum + parseInt(c.points || 0), 0);
        const maxScore = criteria.reduce((sum, c) => sum + parseInt(c.maxPoints || 0), 0);
        await addDoc(collection(db, getUserPath(selectedUser, 'call_reviews')), { userId: selectedUser, audioUrl: currentAudioUrl, criteria, comments, totalScore, maxScore, reviewedAt: new Date().toISOString(), status: 'graded' });
        alert("Review Saved!"); setView('dashboard');
    };

    return (
        <div className="p-8 h-full overflow-y-auto">
            <h1 className="text-3xl font-bold mb-6">Grade New Call</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow space-y-6">
                    <select className="w-full p-2 border rounded" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}><option value="">-- Choose Employee --</option>{allUserProfiles.filter(u => !u.disabled).map(u => <option key={u.uid} value={u.uid}>{u.name}</option>)}</select>
                    {!currentAudioUrl ? (<div className="border-2 border-dashed p-6 text-center rounded-lg"><input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files[0])} /><button onClick={handleFileUpload} disabled={uploading || !audioFile} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded">{uploading ? 'Uploading...' : 'Upload Call'}</button></div>) : (
                        <div className="space-y-4">
                            <audio ref={audioRef} src={currentAudioUrl} controls className="w-full" />
                            <div className="flex gap-2">
                                <input type="text" className="flex-1 p-2 border rounded" placeholder="Comment..." value={commentText} onChange={e => setCommentText(e.target.value)} />
                                <button onClick={addComment} className="px-4 py-2 bg-indigo-600 text-white rounded">Add</button>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-2">
                                {comments.map(c => (
                                    <div key={c.id} className="text-sm bg-gray-100 p-2 rounded flex items-start gap-2">
                                        <button 
                                            onClick={() => jumpToTime(c.timestamp)}
                                            className="text-indigo-600 font-bold hover:underline whitespace-nowrap"
                                            title="Jump to timestamp"
                                        >
                                            {formatTime(c.timestamp)}
                                        </button>
                                        <span>{c.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                {currentAudioUrl && (<div className="bg-white p-6 rounded-xl shadow"><h3 className="font-bold text-xl mb-4">Scorecard</h3>{criteria.map((c, idx) => (<div key={c.id} className="flex gap-2 mb-2"><input value={c.label} onChange={e => {const n=[...criteria]; n[idx].label=e.target.value; setCriteria(n)}} className="border p-1 rounded flex-1"/><input type="number" value={c.points} onChange={e => {const n=[...criteria]; n[idx].points=e.target.value; setCriteria(n)}} className="border p-1 rounded w-16" /><span>/</span><input type="number" value={c.maxPoints} onChange={e => {const n=[...criteria]; n[idx].maxPoints=e.target.value; setCriteria(n)}} className="border p-1 rounded w-16" /></div>))}<button onClick={() => setCriteria([...criteria, {id: Date.now(), label: 'Criteria', points:0, maxPoints:10}])} className="text-sm text-indigo-600 mb-4">+ Add Criteria</button><button onClick={saveReview} className="w-full py-3 bg-green-600 text-white font-bold rounded">Submit</button></div>)}
            </div>
        </div>
    );
};
export default CallGrader;