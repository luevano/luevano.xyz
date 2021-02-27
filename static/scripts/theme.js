var local_storage = window.localStorage;

window.onload = () => {
  let theme = local_storage.getItem('theme');
  let switch_theme = document.getElementById('theme-switch');

  if(theme == null){
    local_storage.setItem('theme', 'dark');
  }

  if(theme == 'dark'){
    switch_theme.checked = true;
  }
  else{
    switch_theme.checked = false;

    let theme = document.getElementById('theme-css');
    let href = theme.getAttribute('href');

    href = href.replace('dark.css', 'light.css');
    theme.setAttribute('href', href);
  }
}

function setTheme(){
  let switch_theme = document.getElementById('theme-switch');

  if(switch_theme.checked == true){
    local_storage.setItem('theme', 'dark');
  }
  else{
    local_storage.setItem('theme', 'light');
  }
}

// toggles between both themes, and then calls set theme to actually set it persistently.
function toggleTheme(){
  let theme = document.getElementById('theme-css');
  let href = theme.getAttribute('href');

  if(href.endsWith('dark.css')){
    href = href.replace('dark.css', 'light.css');
  }
  else if (href.endsWith('light.css')){
    href = href.replace('light.css', 'dark.css');
  }
  else{
    console.log('Wrong replacement.');
  }

  theme.setAttribute('href', href);
  setTheme();
}
