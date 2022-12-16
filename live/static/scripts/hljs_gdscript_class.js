// this is a dirty solution as I wasn't able to add actual gdscript functionality as described
//  in the hljs documentation... I'm too dumb I guess
// no longer required, i'm directly using what i found here: https://joshanthony.info/2021/07/01/how-to-add-gdscript-syntax-highlighting-to-your-blog/
document.addEventListener("DOMContentLoaded", function(event) {
  let a = document.getElementsByClassName("language-gdscript");
  [...a].forEach(x => x.className = "hljs gdscript");
})