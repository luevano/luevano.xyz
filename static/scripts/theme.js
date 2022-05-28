// refactored code for a better solution found in:
//  https://medium.com/@haxzie/dark-and-light-theme-switcher-using-css-variables-and-pure-javascript-zocada-dd0059d72fa2
var local_storage = window.localStorage;

// changed window.onload to document.addEventListener, as suggested here:
//  https://stackoverflow.com/a/800010
document.addEventListener("DOMContentLoaded", function(event) {
  let theme = local_storage.getItem('theme');

  if(theme == null){
    local_storage.setItem('theme', 'theme-dark');
  }
  else{
    if(theme == 'theme-dark'){
      setTheme('theme-dark');
    }
    else{
      setTheme('theme-light');
    }
  }
})

function setTheme(themeName){
  local_storage.setItem('theme', themeName)
  document.documentElement.className = themeName;
}

function toggleTheme(){
  if (local_storage.getItem('theme') == 'theme-dark') {
    setTheme('theme-light');
  }
  else{
    setTheme('theme-dark');
  }
}
