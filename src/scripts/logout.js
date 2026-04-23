document.getElementById('confirmBtn')?.addEventListener('click', () => {
  localStorage.removeItem('token');
  location.href = '/login';
});
