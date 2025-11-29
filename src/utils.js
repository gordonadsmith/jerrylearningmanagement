export const appId = 'jerry-lms-production-v1';
export const ADMIN_EMAILS = ['gordonadsmith@gmail.com', 'admin@company.com'];

export const getPublicPath = (col) => `artifacts/${appId}/public/data/${col}`;
export const getUserPath = (uid, col) => `artifacts/${appId}/users/${uid}/${col}`;

export const getEmbedUrl = (url) => {
    if (!url) return '';
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url;
};

// This was the missing function causing your error:
export const formatTime = (s) => {
    if (!s && s !== 0) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};