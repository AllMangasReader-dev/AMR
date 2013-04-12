/**

  This file is part of All Mangas Reader.
  
  All Mangas Reader is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.
  
  All Mangas Reader is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.
  
  You should have received a copy of the GNU General Public License
  along with All Mangas Reader.  If not, see <http://www.gnu.org/licenses/>. 

*/

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