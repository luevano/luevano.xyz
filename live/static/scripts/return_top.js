// Taken from https://www.w3schools.com/howto/howto_js_scroll_to_top.asp
// and tweaked as needed
document.addEventListener("DOMContentLoaded", function(event) {
    let returnTopButton = document.getElementById("returnTopButton");
    let scrollTopAppearPX = window.screen.availHeight;

    window.onscroll = function() {scrolling(returnTopButton, scrollTopAppearPX)};
})

function scrolling(returnButton, onScrollAppear) {
  if (document.body.scrollTop > onScrollAppear || document.documentElement.scrollTop > onScrollAppear) {
    returnButton.style.display = "inline-block";
  } else {
    returnButton.style.display = "none";
  }
}

function returnTop() {
  document.body.scrollTop = 0; // For Safari
  document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}
