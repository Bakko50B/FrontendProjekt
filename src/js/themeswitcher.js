"use strict";
/* JS-fil för hanteringa av temabyte */
const themeToggle = document.getElementById("theme-toggle");
const currentTheme = localStorage.getItem("theme");

  // Sätt temat vid sidladdning
if (currentTheme) {
  //sätter attributet "data-theme" på html (dokumentet) i Dom
  document.documentElement.setAttribute("data-theme", currentTheme);
}

// Växla tema vid klick med händelshanterare på knappen
themeToggle.addEventListener("click", () => {
  //Kontrollerar och sätter värde på attributet "data-theme"
  //Om det aktuella temat är "dark", kommer myThemeEl att sättas till "light".
  //Om det aktuella temat inte är "dark", kommer myThemeEl att sättas till "dark".
  //Ternär operation
  const myThemeEl = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", myThemeEl);
  localStorage.setItem("theme", myThemeEl);
});

// Om inte Locastoreage innehåller currentTheme så tar sidan systeminställningen första gången (innan sparandet)
if (!currentTheme) {
  // använder matchMedia för att kontrollera om användarens systeminställningar föredrar ett mörkt tema.
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  //Sätter attributet data-theme till dark eller light beroende på systeminställingarna (om inte LocalStorage har satt variabeln)
  document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
}

/**
 * Lyssnar på temabyte från användaren om den ändrar via systemet eller webbläsaren
 * och sätter det nya temat (ljust/mörk)
 * samt sparar valet till LocalStorage
 * 
 * Vidareutvecklinga v kod som Malin Larsson tipsade om.
 */
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
  const newTheme = e.matches ? 'dark' : 'light';
  // Uppdaterar data-theme attributet för att ändra temat
  document.documentElement.setAttribute("data-theme", newTheme);
  // Spara det nya temat i localStorage
  localStorage.setItem("theme", currentTheme);
});
