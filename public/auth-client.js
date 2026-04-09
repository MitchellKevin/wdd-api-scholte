import createAuth0Client from '@auth0/auth0-spa-js';

let auth0 = null;
let initPromise = null;

export async function initAuth(config){
  if(initPromise) return initPromise;
  initPromise = (async ()=>{
    if(!config || !config.domain || !config.clientId) return null;
    try{
      auth0 = await createAuth0Client({ domain: config.domain, client_id: config.clientId, authorizationParams: { redirect_uri: window.location.origin } });
      return auth0;
    }catch(e){ console.warn('auth init error', e); return null; }
  })();
  return initPromise;
}

export async function getAuthToken(){
  if(!auth0) await initAuth(window.__AUTH0_CONFIG || {});
  if(!auth0) return null;
  try{ const token = await auth0.getTokenSilently(); return token; }catch(e){ console.warn('getTokenSilently failed', e); return null; }
}
