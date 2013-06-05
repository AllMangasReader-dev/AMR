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
function getQueryVariable(variable) {
    "use strict";
    var query = window.location.search.substring(1),
        vars = query.split("&"),
        i;
    for (i = 0; i < vars.length; i += 0) {
        var pair = vars[i].split("=");
        if (pair[0] === variable) {
            return pair[1];
        }
    }
    return false;
}
function load() {
    "use strict";
    var searchInput;
    wssql.init();
    loadMenu("search");
    $(".article:not(#resTr)").show();
    mirrors = chrome.extension.getBackgroundPage().actMirrors;
    loadSearch();
    if (window.location.href.indexOf("?") !== -1) {
        searchInput = getQueryVariable("s");
        document.getElementById("searchBoxInput").value = unescape(searchInput).trim();
        search();
    }
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
