const script=document.createElement("script");script.src="https://platform.twitter.com/widgets.js";script.async=true;
script.onerror=()=>{document.querySelector("#state").textContent="X's widget script could not load. Use the original source; playback here remains unverified.";};
script.onload=()=>{document.querySelector("#state").textContent="X's script loaded. Check whether the post renders and its motion plays; script loading alone is not success.";};
document.head.append(script);
