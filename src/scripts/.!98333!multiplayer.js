const token = localStorage.getItem('token');
if (!token) { location.href = '/login'; }

const params = new URLSearchParams(location.search);
const roomId = params.get('room');
if (!roomId || !/^\d+$/.test(roomId)) { location.href = '/'; }

