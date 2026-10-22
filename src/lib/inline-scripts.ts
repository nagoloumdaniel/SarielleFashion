/* Scripts inline autorisés par empreinte (sha256) dans la CSP à nonce du dashboard. */

/* Applique le thème avant le premier rendu pour éviter tout flash clair.
   Priorité : choix enregistré, sinon préférence système. */
export const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=(s==='dark'||s==='light')?s:(d?'dark':'light');var r=document.documentElement;r.setAttribute('data-theme',t);r.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='dark'?'#151011':'#fff8f7');}catch(e){}})();
/* Extensions antivirus (Bitdefender) ajoutent bis_skin_checked sur les div avant l'hydratation : on les retire pour éviter un faux mismatch. */
(function(){try{var a='bis_skin_checked';var c=function(){document.querySelectorAll('['+a+']').forEach(function(n){n.removeAttribute(a)})};c();var o=new MutationObserver(function(ms){ms.forEach(function(m){if(m.target&&m.target.removeAttribute)m.target.removeAttribute(a)})});o.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:[a]});setTimeout(function(){o.disconnect()},10000);}catch(e){}})();`;

/* Script du dashboard : thème clair unique, appliqué avant le premier rendu. */
export const DASHBOARD_THEME_SCRIPT =
  "document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';";
