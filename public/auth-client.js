// // lightweight local auth shim: read token from localStorage
// export async function initAuth(){ return true; }
// export async function getAuthToken(){
//   try{ return localStorage.getItem('token'); }catch(e){ return null; }
// }

// // expose helper on window for legacy code
// if(typeof window !== 'undefined'){ window.getAuthToken = async ()=>{ return localStorage.getItem('token'); }; }
