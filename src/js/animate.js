"use strict";

// script.js
document.getElementById('animatestart').addEventListener('click', function() {
    const element = document.getElementById('animatedElement');
    element.classList.toggle('animate');
});
