import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const Login = ({ setView }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        try {
            if (isRegistering) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            alert("Authentication Error: " + err.message);
        }
        setAuthLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <form onSubmit={handleAuth} className="bg-white p-8 rounded shadow-md w-96 space-y-4">
                <h2 className="text-2xl font-bold text-center text-indigo-600">
                    {isRegistering ? 'Create Account' : 'LMS Login'}
                </h2>
                <input 
                    type="email" 
                    placeholder="Email" 
                    className="w-full border p-2 rounded" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                />
                <input 
                    type="password" 
                    placeholder="Password" 
                    className="w-full border p-2 rounded" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                />
                <button 
                    type="submit" 
                    disabled={authLoading} 
                    className="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700"
                >
                    {authLoading ? 'Processing...' : (isRegistering ? 'Sign Up' : 'Sign In')}
                </button>
                <div 
                    className="text-center text-sm text-gray-500 cursor-pointer hover:text-indigo-600" 
                    onClick={() => setIsRegistering(!isRegistering)}
                >
                    {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                </div>
            </form>
        </div>
    );
};

// THIS IS THE LINE THAT WAS MISSING
export default Login;