document.getElementById('confirmBtn')?.addEventListener('click', () => {
  sessionStorage.removeItem('token');
  location.href = '/login';
});
