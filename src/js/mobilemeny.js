"use strict"

// elements
let openBtn = document.getElementById("open-menu");
let closeBtn = document.getElementById("close-menu");

//eventlisteners
openBtn.addEventListener("click", toggleMenu);
closeBtn.addEventListener("click", toggleMenu);

function toggleMenu() {
    let navMenuEl = document.getElementById("nav-menu");

    let style = window.getComputedStyle(navMenuEl);
    
    if(style.display === "none"){
        navMenuEl.style.display = "block";
        setTimeout(() =>{
        navMenuEl.style.opacity = 1;}, 5);
    } else {
        navMenuEl.style.display = "none";
        navMenuEl.style.opacity = 0;
    }

}