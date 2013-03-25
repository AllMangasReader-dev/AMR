var mirrors;
function load() {
  "use strict";
  wssql.init();
  loadMenu("search");
  $(".article:not(#resTr)").show();
  mirrors = chrome.extension.getBackgroundPage().actMirrors;
  loadSearch();
}
$(function () {
  "use strict";
  document.getElementById("searchBoxInput").onkeypress = function (e) {
    var key = e.keyCode || e.which;
    if (key === 13) {
      search();
    }
  };
  document.getElementById("butFind").addEventListener("click", search);
  window.addEventListener("load", load);
});